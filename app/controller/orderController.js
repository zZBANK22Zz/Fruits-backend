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
                // Accept both 'quantity' (for pieces) and 'weight' (for kg) fields
                const quantity = item.quantity !== undefined ? item.quantity : null;
                const weight = item.weight !== undefined ? item.weight : null;
                
                if (!item.fruit_id || (quantity === null && weight === null)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Each item must have fruit_id and either quantity (for pieces) or weight (for kg)'
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

                // Determine the amount based on fruit's unit
                let amount;
                
                if (fruit.unit === 'piece') {
                    // Fruit is sold by piece
                    amount = quantity !== null ? parseInt(quantity) : parseInt(weight || 0);
                    
                    if (amount <= 0 || !Number.isInteger(amount)) {
                        return res.status(400).json({
                            success: false,
                            message: 'Quantity must be a positive integer for fruits sold by piece'
                        });
                    }
                    
                    if (fruit.stock < amount) {
                        return res.status(400).json({
                            success: false,
                            message: `Insufficient stock for ${fruit.name}. Available: ${fruit.stock} pieces, Requested: ${amount} pieces`
                        });
                    }
                } else {
                    // Fruit is sold by weight (kg)
                    amount = weight !== null ? parseFloat(weight) : parseFloat(quantity || 0);
                    
                    if (amount <= 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'Weight must be greater than 0'
                        });
                    }
                    
                    if (fruit.stock < amount) {
                        return res.status(400).json({
                            success: false,
                            message: `Insufficient stock for ${fruit.name}. Available: ${fruit.stock} kg, Requested: ${amount} kg`
                        });
                    }
                }

                const subtotal = fruit.price * amount;
                totalAmount += subtotal;

                orderItems.push({
                    fruit_id: item.fruit_id,
                    quantity: amount,
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
            await OrderModel.createOrderItems(order.id, orderItems);
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

    // Get user's most frequently bought products
    static async getMostBoughtProducts(req, res) {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 4;
            const products = await OrderModel.getMostBoughtProducts(userId, limit);

            res.status(200).json({
                success: true,
                message: 'Most bought products fetched successfully',
                data: { products }
            });
        } catch (error) {
            console.error('Get most bought products error:', error);
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

            const validStatuses = ['pending', 'confirmed', 'processing', 'paid', 'cancelled'];
            if (!status || !validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                });
            }

            const currentOrder = await OrderModel.getOrderById(id, client);
            if (!currentOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            const oldStatus = currentOrder.status;

            // If changing to confirmed, reduce stock
            if (status === 'confirmed' && oldStatus !== 'confirmed') {
                const orderItems = await OrderModel.getOrderItems(id, client);
                
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
                const orderItems = await OrderModel.getOrderItems(id, client);
                
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

            const updatedOrder = await OrderModel.updateOrderStatus(id, status, client);
            const completeOrder = await OrderModel.getOrderById(id, client);

            // Auto-generate invoice when status changes to "paid"
            if (status === 'paid' && oldStatus !== 'paid') {
                try {
                    // ✅ FIXED: Added 'client' parameter to prevent deadlock
                    await InvoiceController.generateInvoice(id, {
                        user_id: completeOrder.user_id,
                        total_amount: completeOrder.total_amount,
                        payment_method: completeOrder.payment_method,
                        notes: completeOrder.notes
                    }, client);
                } catch (invoiceError) {
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

    // Confirm payment (user can confirm their own order payment)
    static async confirmPayment(req, res) {
        const client = await pool.connect();
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const currentOrder = await OrderModel.getOrderById(id, client);
            if (!currentOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            if (currentOrder.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to confirm this order'
                });
            }

            if (currentOrder.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: `Cannot confirm payment. Order status is already: ${currentOrder.status}`
                });
            }

            const oldStatus = currentOrder.status;

            const updatedOrder = await OrderModel.updateOrderStatus(id, 'paid', client);
            const completeOrder = await OrderModel.getOrderById(id, client);

            if (oldStatus !== 'paid') {
                try {
                    // ✅ This was already correct in your code
                    await InvoiceController.generateInvoice(id, {
                        user_id: completeOrder.user_id,
                        total_amount: completeOrder.total_amount,
                        payment_method: completeOrder.payment_method,
                        notes: completeOrder.notes
                    }, client);
                } catch (invoiceError) {
                    console.error('Failed to generate invoice:', invoiceError.message);
                }
            }

            res.status(200).json({
                success: true,
                message: 'Payment confirmed successfully. Invoice generated.',
                data: { order: completeOrder }
            });
        } catch (error) {
            console.error('Confirm payment error:', error);
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

            // ✅ FIXED: Removed 'client' because it's undefined here
            const order = await OrderModel.getOrderById(id);
            
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            if (userRole !== 'admin' && order.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only get QR code for your own orders'
                });
            }

            if (order.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: `QR code can only be generated for pending orders. Current status: ${order.status}`
                });
            }

            const qrCodeData = await QRPromptPayService.generateQRCodeForOrder(order);

            res.status(200).json({
                success: true,
                message: 'QR code generated successfully',
                data: {
                    order_id: order.id,
                    order_number: order.order_number,
                    amount: order.total_amount,
                    qr_code: qrCodeData.qrCodeDataURL, 
                    payload: qrCodeData.payload, 
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

            // ✅ FIXED: Removed 'client' because it's undefined here
            const order = await OrderModel.getOrderById(id);
            
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            if (userRole !== 'admin' && order.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only get QR code for your own orders'
                });
            }

            if (order.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: `QR code can only be generated for pending orders. Current status: ${order.status}`
                });
            }

            const qrCodeData = await QRPromptPayService.generateQRCodeForOrder(order);

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