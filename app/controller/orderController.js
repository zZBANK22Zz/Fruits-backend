const OrderModel = require('../model/orderModel');
const FruitModel = require('../model/fruitModel');
const InvoiceController = require('./invoiceController');
const QRPromptPayService = require('../services/qrPromptPayService');
const pool = require('../config/database');

class OrderController {
    // Create new order (authenticated users)
    static async createOrder(req, res) {
        try {
            const userId = req.user.id;
            const { items, shipping_address, shipping_city, shipping_postal_code, shipping_country, payment_method, notes } = req.body;

            // Validation
            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Order items are required'
                });
            }

            if (!shipping_address) {
                return res.status(400).json({
                    success: false,
                    message: 'Shipping address is required'
                });
            }

            // Validate and calculate totals
            let totalAmount = 0;
            const orderItems = [];

            for (const item of items) {
                if (!item.fruit_id || !item.quantity) {
                    return res.status(400).json({
                        success: false,
                        message: 'Each item must have fruit_id and quantity'
                    });
                }

                // Get fruit details
                const fruit = await FruitModel.getFruitById(item.fruit_id);
                if (!fruit) {
                    return res.status(404).json({
                        success: false,
                        message: `Fruit with id ${item.fruit_id} not found`
                    });
                }

                // Check stock availability
                if (fruit.stock < item.quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for ${fruit.name}. Available: ${fruit.stock}, Requested: ${item.quantity}`
                    });
                }

                const subtotal = fruit.price * item.quantity;
                totalAmount += subtotal;

                orderItems.push({
                    fruit_id: item.fruit_id,
                    quantity: item.quantity,
                    price: fruit.price,
                    subtotal: subtotal
                });
            }

            // Create order
            const orderData = {
                user_id: userId,
                total_amount: totalAmount,
                shipping_address,
                shipping_city: shipping_city || null,
                shipping_postal_code: shipping_postal_code || null,
                shipping_country: shipping_country || 'Thailand',
                payment_method: payment_method || 'Thai QR PromptPay',
                notes: notes || null
            };

            const order = await OrderModel.createOrder(orderData);

            // Create order items
            const createdItems = await OrderModel.createOrderItems(order.id, orderItems);

            // Get complete order with items
            const completeOrder = await OrderModel.getOrderById(order.id);

            res.status(201).json({
                success: true,
                message: 'Order created successfully',
                data: { order: completeOrder }
            });
        } catch (error) {
            console.error('Create order error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Get user's orders
    static async getMyOrders(req, res) {
        try {
            const userId = req.user.id;
            const orders = await OrderModel.getOrdersByUserId(userId);

            res.status(200).json({
                success: true,
                message: 'Orders fetched successfully',
                data: { orders }
            });
        } catch (error) {
            console.error('Get my orders error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Get order by ID
    static async getOrderById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;

            const order = await OrderModel.getOrderById(id);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Authorization: Users can only view their own orders, admins can view all
            if (userRole !== 'admin' && order.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only view your own orders'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Order fetched successfully',
                data: { order }
            });
        } catch (error) {
            console.error('Get order by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Get all orders (admin only)
    static async getAllOrders(req, res) {
        try {
            const orders = await OrderModel.getAllOrders();

            res.status(200).json({
                success: true,
                message: 'All orders fetched successfully',
                data: { orders }
            });
        } catch (error) {
            console.error('Get all orders error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Update order status (admin only)
    static async updateOrderStatus(req, res) {
        const client = await pool.connect();
        try {
            const { id } = req.params;
            const { status } = req.body;

            // Validation
            const validStatuses = ['pending', 'confirmed', 'processing', 'paid', 'cancelled'];
            if (!status || !validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                });
            }

            // Get current order
            const currentOrder = await OrderModel.getOrderById(id);
            if (!currentOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            const oldStatus = currentOrder.status;

            // If changing to confirmed, reduce stock
            if (status === 'confirmed' && oldStatus !== 'confirmed') {
                const orderItems = await OrderModel.getOrderItems(id);
                
                await client.query('BEGIN');
                try {
                    for (const item of orderItems) {
                        const fruit = await FruitModel.reduceStock(item.fruit_id, item.quantity);
                        if (!fruit) {
                            await client.query('ROLLBACK');
                            return res.status(400).json({
                                success: false,
                                message: `Insufficient stock for fruit ID ${item.fruit_id}`
                            });
                        }
                    }
                    await client.query('COMMIT');
                } catch (error) {
                    await client.query('ROLLBACK');
                    throw error;
                }
            }

            // If changing from confirmed to cancelled, restore stock
            if (oldStatus === 'confirmed' && status === 'cancelled') {
                const orderItems = await OrderModel.getOrderItems(id);
                
                await client.query('BEGIN');
                try {
                    for (const item of orderItems) {
                        await FruitModel.restoreStock(item.fruit_id, item.quantity);
                    }
                    await client.query('COMMIT');
                } catch (error) {
                    await client.query('ROLLBACK');
                    throw error;
                }
            }

            // Update order status
            const updatedOrder = await OrderModel.updateOrderStatus(id, status);
            const completeOrder = await OrderModel.getOrderById(id);

            // Auto-generate invoice when status changes to "paid"
            if (status === 'paid' && oldStatus !== 'paid') {
                try {
                    await InvoiceController.generateInvoice(id, {
                        user_id: completeOrder.user_id,
                        total_amount: completeOrder.total_amount,
                        payment_method: completeOrder.payment_method,
                        notes: completeOrder.notes
                    });
                } catch (invoiceError) {
                    // Log error but don't fail the order status update
                    console.error('Failed to generate invoice:', invoiceError.message);
                }
            }

            res.status(200).json({
                success: true,
                message: 'Order status updated successfully',
                data: { order: completeOrder }
            });
        } catch (error) {
            console.error('Update order status error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        } finally {
            client.release();
        }
    }

    // Get QR Code for order payment (PromptPay)
    static async getOrderQRCode(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;

            // Get order
            const order = await OrderModel.getOrderById(id);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Authorization: Users can only get QR code for their own orders, admins can get for any order
            if (userRole !== 'admin' && order.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only get QR code for your own orders'
                });
            }

            // Only generate QR code for pending orders
            if (order.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: `QR code can only be generated for pending orders. Current status: ${order.status}`
                });
            }

            // Generate QR code
            const qrCodeData = await QRPromptPayService.generateQRCodeForOrder(order);

            res.status(200).json({
                success: true,
                message: 'QR code generated successfully',
                data: {
                    order_id: order.id,
                    order_number: order.order_number,
                    amount: order.total_amount,
                    qr_code: qrCodeData.qrCodeDataURL, // Base64 data URL for frontend display
                    payload: qrCodeData.payload, // PromptPay payload string
                    phone_number: qrCodeData.phoneNumber
                }
            });
        } catch (error) {
            console.error('Get order QR code error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Get QR Code as image (for direct image display/download)
    static async getOrderQRCodeImage(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;

            // Get order
            const order = await OrderModel.getOrderById(id);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Authorization: Users can only get QR code for their own orders, admins can get for any order
            if (userRole !== 'admin' && order.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only get QR code for your own orders'
                });
            }

            // Only generate QR code for pending orders
            if (order.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: `QR code can only be generated for pending orders. Current status: ${order.status}`
                });
            }

            // Generate QR code
            const qrCodeData = await QRPromptPayService.generateQRCodeForOrder(order);

            // Set response headers for image
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Content-Disposition', `inline; filename=qr-promptpay-${order.order_number}.png`);

            res.send(qrCodeData.qrCodeBuffer);
        } catch (error) {
            console.error('Get order QR code image error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
}

module.exports = OrderController;

