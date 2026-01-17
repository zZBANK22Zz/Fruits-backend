const InvoiceModel = require('../model/invoiceModel');
const OrderModel = require('../model/orderModel');
const PDFService = require('../services/pdfService');
const PaymentSlipModel = require('../model/paymentSlipModel');

class InvoiceController {
    // Generate invoice for order (called automatically when order status = paid)
    // ✅ UPDATED: Accepts optional 'client' to prevent DB deadlock
    static async generateInvoice(orderId, orderData, client = null) {
        try {
            // Check if invoice already exists
            // ✅ UPDATED: Pass 'client' to model
            const existingInvoice = await InvoiceModel.invoiceExistsForOrder(orderId, client);
            if (existingInvoice) {
                throw new Error('Invoice already exists for this order');
            }

            const invoiceData = {
                order_id: orderId,
                user_id: orderData.user_id,
                subtotal: orderData.total_amount,
                total_amount: orderData.total_amount,
                payment_method: orderData.payment_method || 'Thai QR PromptPay',
                payment_date: new Date(),
                notes: orderData.notes || null
            };

            // ✅ UPDATED: Pass 'client' to model
            const invoice = await InvoiceModel.createInvoice(invoiceData, client);
            return invoice;
        } catch (error) {
            console.error('Generate invoice error:', error);
            throw error;
        }
    }

    // Get user's invoices
    static async getMyInvoices(req, res) {
        try {
            const userId = req.user.id;
            const invoices = await InvoiceModel.getInvoicesByUserId(userId);

            res.status(200).json({
                success: true,
                message: 'Invoices fetched successfully',
                data: { invoices }
            });
        } catch (error) {
            console.error('Get my invoices error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Get invoice by ID
    static async getInvoiceById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;

            const invoice = await InvoiceModel.getInvoiceById(id);

            if (!invoice) {
                return res.status(404).json({
                    success: false,
                    message: 'Invoice not found'
                });
            }

            // Authorization: Users can only view their own invoices, admins can view all
            if (userRole !== 'admin' && invoice.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only view your own invoices'
                });
            }

            // Get order items and payment slip
            const order = await OrderModel.getOrderById(invoice.order_id);
            invoice.items = order ? order.items : [];
            
            const slip = await PaymentSlipModel.getPaymentSlipByOrderId(invoice.order_id);
            invoice.payment_slip = slip || null;

            res.status(200).json({
                success: true,
                message: 'Invoice fetched successfully',
                data: { invoice }
            });
        } catch (error) {
            console.error('Get invoice by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Get invoice by order ID
    static async getInvoiceByOrderId(req, res) {
        try {
            const { orderId } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;

            // ✅ UPDATED: Ensure NO client is passed here (read-only)
            const invoice = await InvoiceModel.getInvoiceByOrderId(orderId);

            if (!invoice) {
                return res.status(404).json({
                    success: false,
                    message: 'Invoice not found for this order'
                });
            }

            // Authorization: Users can only view their own invoices, admins can view all
            if (userRole !== 'admin' && invoice.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only view your own invoices'
                });
            }

            // Get order items
            const order = await OrderModel.getOrderById(orderId);
            invoice.items = order ? order.items : [];

            res.status(200).json({
                success: true,
                message: 'Invoice fetched successfully',
                data: { invoice }
            });
        } catch (error) {
            console.error('Get invoice by order ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Get all invoices (admin only)
    static async getAllInvoices(req, res) {
        try {
            const invoices = await InvoiceModel.getAllInvoices();

            res.status(200).json({
                success: true,
                message: 'All invoices fetched successfully',
                data: { invoices }
            });
        } catch (error) {
            console.error('Get all invoices error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Download invoice PDF
    static async downloadInvoicePDF(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;

            const invoice = await InvoiceModel.getInvoiceById(id);

            if (!invoice) {
                return res.status(404).json({
                    success: false,
                    message: 'Invoice not found'
                });
            }

            // Authorization: Users can only download their own invoices, admins can download all
            if (userRole !== 'admin' && invoice.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only download your own invoices'
                });
            }

            // Get order items
            const order = await OrderModel.getOrderById(invoice.order_id);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Generate PDF
            const pdfBuffer = await PDFService.generateInvoicePDF(invoice, order.items);

            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_number}.pdf`);
            res.setHeader('Content-Length', pdfBuffer.length);

            res.send(pdfBuffer);
        } catch (error) {
            console.error('Download invoice PDF error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
}

module.exports = InvoiceController;