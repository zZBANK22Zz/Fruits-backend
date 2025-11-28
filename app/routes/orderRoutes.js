const express = require('express');
const router = express.Router();
const OrderController = require('../controller/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

// Create new order (authenticated users)
router.post('/', authMiddleware, OrderController.createOrder);

// Get user's orders (authenticated users) - must be before /:id
router.get('/my-orders', authMiddleware, OrderController.getMyOrders);

// Get all orders (admin only) - must be before /:id
router.get('/all', requireAdmin, OrderController.getAllOrders);

// Get QR code for order payment (PromptPay) - must be before /:id
router.get('/:id/qr-code', authMiddleware, OrderController.getOrderQRCode);

// Get QR code as image - must be before /:id
router.get('/:id/qr-code/image', authMiddleware, OrderController.getOrderQRCodeImage);

// Get order by ID (owner or admin)
router.get('/:id', authMiddleware, OrderController.getOrderById);

// Update order status (admin only)
router.put('/:id/status', requireAdmin, OrderController.updateOrderStatus);

module.exports = router;

