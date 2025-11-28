const express = require('express');
const router = express.Router();
const InvoiceController = require('../controller/invoiceController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

// Get user's invoices (authenticated users)
router.get('/my-invoices', authMiddleware, InvoiceController.getMyInvoices);

// Get all invoices (admin only)
router.get('/all', requireAdmin, InvoiceController.getAllInvoices);

// Get invoice by order ID (owner or admin)
router.get('/order/:orderId', authMiddleware, InvoiceController.getInvoiceByOrderId);

// Download invoice PDF (owner or admin)
router.get('/:id/download', authMiddleware, InvoiceController.downloadInvoicePDF);

// Get invoice by ID (owner or admin)
router.get('/:id', authMiddleware, InvoiceController.getInvoiceById);

module.exports = router;

