const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFService {
    // Generate PDF invoice
    static async generateInvoicePDF(invoice, orderItems) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50 });
                const buffers = [];
                
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfData = Buffer.concat(buffers);
                    resolve(pdfData);
                });
                doc.on('error', reject);

                // Header
                doc.fontSize(24).text('INVOICE', { align: 'center' });
                doc.moveDown();

                // Invoice details
                doc.fontSize(12);
                doc.text(`Invoice Number: ${invoice.invoice_number}`, { align: 'left' });
                doc.text(`Invoice Date: ${new Date(invoice.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'left' });
                doc.text(`Order Number: ${invoice.order_number}`, { align: 'left' });
                doc.moveDown();

                // Customer Information
                doc.fontSize(14).text('Bill To:', { underline: true });
                doc.fontSize(12);
                doc.text(invoice.username || 'Customer');
                doc.text(invoice.email || '');
                doc.moveDown();

                // Shipping Address
                if (invoice.shipping_address) {
                    doc.fontSize(14).text('Shipping Address:', { underline: true });
                    doc.fontSize(12);
                    doc.text(invoice.shipping_address);
                    if (invoice.shipping_city) {
                        doc.text(`${invoice.shipping_city}, ${invoice.shipping_postal_code || ''}`);
                    }
                    if (invoice.shipping_country) {
                        doc.text(invoice.shipping_country);
                    }
                    doc.moveDown();
                }

                // Items Table Header
                doc.moveDown();
                const tableTop = doc.y;
                doc.fontSize(12);
                
                // Table headers
                doc.text('Item', 50, tableTop);
                doc.text('Quantity', 250, tableTop);
                doc.text('Price', 320, tableTop);
                doc.text('Subtotal', 400, tableTop, { align: 'right' });
                
                // Draw line under headers
                doc.moveTo(50, doc.y + 5)
                   .lineTo(550, doc.y + 5)
                   .stroke();
                
                doc.moveDown(0.5);

                // Items
                let yPosition = doc.y;
                orderItems.forEach((item, index) => {
                    if (yPosition > 700) { // New page if needed
                        doc.addPage();
                        yPosition = 50;
                    }
                    
                    doc.text(item.fruit_name || `Item ${index + 1}`, 50, yPosition);
                    doc.text(String(item.quantity), 250, yPosition);
                    doc.text(`฿${item.price.toFixed(2)}`, 320, yPosition);
                    doc.text(`฿${item.subtotal.toFixed(2)}`, 400, yPosition, { align: 'right' });
                    yPosition += 20;
                });

                doc.y = yPosition + 10;
                
                // Draw line before totals
                doc.moveTo(50, doc.y)
                   .lineTo(550, doc.y)
                   .stroke();
                
                doc.moveDown();

                // Totals
                doc.fontSize(12);
                doc.text(`Subtotal: ฿${invoice.subtotal.toFixed(2)}`, { align: 'right' });
                doc.moveDown(0.5);
                doc.fontSize(14).font('Helvetica-Bold');
                doc.text(`Total: ฿${invoice.total_amount.toFixed(2)}`, { align: 'right' });
                doc.font('Helvetica').fontSize(12);
                doc.moveDown();

                // Payment Information
                doc.moveDown();
                doc.fontSize(14).text('Payment Information:', { underline: true });
                doc.fontSize(12);
                doc.text(`Payment Method: ${invoice.payment_method || 'Thai QR PromptPay'}`);
                doc.text(`Payment Status: ${invoice.payment_status || 'paid'}`);
                if (invoice.payment_date) {
                    doc.text(`Payment Date: ${new Date(invoice.payment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
                }

                // Notes
                if (invoice.notes) {
                    doc.moveDown();
                    doc.fontSize(14).text('Notes:', { underline: true });
                    doc.fontSize(12);
                    doc.text(invoice.notes);
                }

                // Footer
                doc.fontSize(10)
                   .fillColor('gray')
                   .text('Thank you for your business!', 50, doc.page.height - 50, { align: 'center' });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = PDFService;

