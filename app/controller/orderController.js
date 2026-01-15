const OrderModel = require('../model/orderModel');
const FruitModel = require('../model/fruitModel');
const InvoiceController = require('./invoiceController');
const QRPromptPayService = require('../services/qrPromptPayService');
const pool = require('../config/database');
const PaymentSlipModel = require('../model/paymentSlipModel');
const LineMessagingService = require('../services/lineMessagingService');
const NotificationModel = require('../model/notificationModel');
const UserModel = require('../model/userModel');

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
                // Determine which one to use based on fruit's unit
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
                let unitLabel;
                
                if (fruit.unit === 'piece') {
                    // Fruit is sold by piece
                    amount = quantity !== null ? parseInt(quantity) : parseInt(weight || 0);
                    unitLabel = 'pieces';
                    
                    // Validate quantity is positive integer
                    if (amount <= 0 || !Number.isInteger(amount)) {
                        return res.status(400).json({
                            success: false,
                            message: 'Quantity must be a positive integer for fruits sold by piece'
                        });
                    }
                    
                    // Check stock availability (stock is in pieces)
                    if (fruit.stock < amount) {
                        return res.status(400).json({
                            success: false,
                            message: `Insufficient stock for ${fruit.name}. Available: ${fruit.stock} pieces, Requested: ${amount} pieces`
                        });
                    }
                } else {
                    // Fruit is sold by weight (kg) - default
                    amount = weight !== null ? parseFloat(weight) : parseFloat(quantity || 0);
                    unitLabel = 'kg';
                    
                    // Validate weight is positive
                    if (amount <= 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'Weight must be greater than 0'
                        });
                    }
                    
                    // Check stock availability (stock is in kilograms)
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
                    quantity: amount, // Store amount (weight or quantity) in quantity column
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
            const validStatuses = ['pending', 'confirmed', 'processing', 'paid', 'cancelled', 'received', 'preparing', 'completed', 'shipped'];
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

            // If changing to confirmed, reduce stock (by weight in kilograms)
            if (status === 'confirmed' && oldStatus !== 'confirmed') {
                const orderItems = await OrderModel.getOrderItems(id);
                
                await client.query('BEGIN');
                try {
                    for (const item of orderItems) {
                        // item.quantity contains weight in kilograms (decimal)
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

            // If changing from confirmed to cancelled, restore stock (by weight in kilograms)
            if (oldStatus === 'confirmed' && status === 'cancelled') {
                const orderItems = await OrderModel.getOrderItems(id);
                
                await client.query('BEGIN');
                try {
                    for (const item of orderItems) {
                        // item.quantity contains weight in kilograms (decimal)
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

                    // Trigger internal notification for all admins
                    const admins = await UserModel.getAllUsers();
                    const adminUsers = admins.filter(u => u.role === 'admin');
                    
                    for (const admin of adminUsers) {
                        await NotificationModel.createNotification({
                            user_id: admin.id,
                            title: 'New Payment Received',
                            message: `Order ${completeOrder.order_number} has been paid. Amount: ฿${completeOrder.total_amount}. Please prepare the order.`,
                            type: 'order_paid',
                            related_id: completeOrder.id
                        });
                    }
                } catch (notificationError) {
                    // Log error but don't fail the order status update
                    console.error('Failed to generate invoice or notification:', notificationError.message);
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

            // Get current order
            const currentOrder = await OrderModel.getOrderById(id);
            if (!currentOrder) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Verify order belongs to user
            if (currentOrder.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to confirm this order'
                });
            }

            // Only allow confirming if order is in pending or processing status
            const allowedStatuses = ['pending', 'processing'];
            if (!allowedStatuses.includes(currentOrder.status)) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot confirm payment. Order status is already: ${currentOrder.status}`
                });
            }

            const oldStatus = currentOrder.status;

            // Update order status to 'paid'
            const updatedOrder = await OrderModel.updateOrderStatus(id, 'paid');
            const completeOrder = await OrderModel.getOrderById(id);

            // Auto-generate invoice when status changes to "paid"
            if (oldStatus !== 'paid') {
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
                message: 'Payment confirmed successfully. Invoice generated.',
                data: { order: completeOrder }
            });

            // Send LINE notification in background
            if (completeOrder.line_user_id) {
                LineMessagingService.sendPaymentConfirmation(completeOrder.line_user_id, completeOrder);
            }
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

    // Upload payment slip
    static async uploadPaymentSlip(req, res) {
        try {
            const { id: orderId } = req.params;
            const userId = req.user.id;
            const { image, amount, payment_date, notes } = req.body;

            if (!image) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment slip image is required'
                });
            }

            // Get order to verify ownership
            const order = await OrderModel.getOrderById(orderId);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Authorization: Only the owner can upload a slip
            if (order.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only upload slips for your own orders'
                });
            }

            // Save the slip
            const slip = await PaymentSlipModel.createPaymentSlip({
                order_id: orderId,
                image_data: image,
                amount: amount || order.total_amount,
                payment_date: payment_date ? new Date(payment_date) : new Date(),
                notes: notes || null
            });

            // Update order status to 'paid' immediately upon slip upload
            const updatedOrder = await OrderModel.updateOrderStatus(orderId, 'paid');
            const completeOrder = await OrderModel.getOrderById(orderId);

            // Auto-generate invoice when status changes to "paid"
            try {
                await InvoiceController.generateInvoice(orderId, {
                    user_id: completeOrder.user_id,
                    total_amount: completeOrder.total_amount,
                    payment_method: completeOrder.payment_method || 'Thai QR PromptPay',
                    notes: completeOrder.notes
                });

                // Trigger internal notification for all admins
                const admins = await UserModel.getAllUsers();
                const adminUsers = admins.filter(u => u.role === 'admin');
                
                for (const admin of adminUsers) {
                    await NotificationModel.createNotification({
                        user_id: admin.id,
                        title: 'New Payment Receipt Uploaded',
                        message: `A payment slip has been uploaded for Order ${completeOrder.order_number}. Amount: ฿${completeOrder.total_amount}.`,
                        type: 'slip_uploaded',
                        related_id: completeOrder.id
                    });
                }
            } catch (notificationError) {
                // Log error but don't fail the upload response
                console.error('Failed to generate invoice or notification during upload:', notificationError.message);
            }

            res.status(201).json({
                success: true,
                message: 'Payment slip uploaded and order confirmed successfully.',
                data: { 
                    slip,
                    order: completeOrder
                }
            });

            // Send LINE notification in background
            if (completeOrder.line_user_id) {
                console.log(`[DEBUG] Found LINE User ID: ${completeOrder.line_user_id}. Sending notification...`);
                LineMessagingService.sendPaymentConfirmation(completeOrder.line_user_id, completeOrder);
            } else {
                console.log(`[DEBUG] No LINE User ID found for Order ID: ${completeOrder.id}. Skipping notification.`);
            }
        } catch (error) {
            console.error('Upload payment slip error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
}

module.exports = OrderController;

