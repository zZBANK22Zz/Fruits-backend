const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFService {
    // Register Thai-supporting font if available, otherwise use default
    static registerThaiFont(doc) {
        // PDFKit only supports .ttf files, not .ttc (TrueType Collection)
        // Try to register a Thai font from common system locations
        const fontsDir = path.join(__dirname, '../../fonts');
        const fontPaths = [
            // Check in fonts root directory
            path.join(fontsDir, 'NotoSansThai-Regular.ttf'),
            // Check in Noto_Sans_Thai subdirectory (Google Fonts download structure)
            path.join(fontsDir, 'Noto_Sans_Thai', 'static', 'NotoSansThai-Regular.ttf'),
            path.join(fontsDir, 'Noto_Sans_Thai', 'NotoSansThai-Regular.ttf'),
            // Check in any subdirectory (recursive search fallback)
            path.join(fontsDir, '**', 'NotoSansThai-Regular.ttf'),
            // System font locations
            '/usr/share/fonts/truetype/thai/NotoSansThai-Regular.ttf', // Linux
            '/usr/share/fonts/truetype/noto/NotoSansThai-Regular.ttf', // Linux alternative
            'C:/Windows/Fonts/THSarabunNew.ttf', // Windows
            'C:/Windows/Fonts/THSarabun.ttf', // Windows alternative
        ];

        // First, try the specific paths
        for (const fontPath of fontPaths) {
            // Skip wildcard paths in first pass
            if (fontPath.includes('**')) continue;
            
            if (fs.existsSync(fontPath)) {
                try {
                    // Only try .ttf files, PDFKit doesn't support .ttc
                    if (fontPath.endsWith('.ttf')) {
                        // Verify it's actually a font file (not HTML or text)
                        const stats = fs.statSync(fontPath);
                        // Font files should be at least 10KB
                        if (stats.size < 10000) {
                            console.warn(`[PDF Service] Font file too small (${stats.size} bytes), skipping: ${fontPath}`);
                            continue;
                        }
                        
                        doc.registerFont('ThaiFont', fontPath);
                        console.log(`[PDF Service] Successfully registered Thai font: ${fontPath}`);
                        return 'ThaiFont';
                    }
                } catch (e) {
                    console.warn(`[PDF Service] Failed to register font at ${fontPath}:`, e.message);
                    // Continue to next font path
                }
            }
        }
        
        // If no font found, try searching recursively in fonts directory
        try {
            const findFontRecursive = (dir) => {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        const found = findFontRecursive(fullPath);
                        if (found) return found;
                    } else if (entry.isFile() && entry.name === 'NotoSansThai-Regular.ttf') {
                        const stats = fs.statSync(fullPath);
                        if (stats.size >= 10000) {
                            return fullPath;
                        }
                    }
                }
                return null;
            };
            
            if (fs.existsSync(fontsDir)) {
                const foundFont = findFontRecursive(fontsDir);
                if (foundFont) {
                    try {
                        doc.registerFont('ThaiFont', foundFont);
                        console.log(`[PDF Service] Successfully registered Thai font (found recursively): ${foundFont}`);
                        return 'ThaiFont';
                    } catch (e) {
                        console.warn(`[PDF Service] Failed to register recursively found font: ${e.message}`);
                    }
                }
            }
        } catch (e) {
            // Ignore recursive search errors
        }
        
        // Fallback to Helvetica (will show garbled text for Thai, but works for English)
        console.warn('[PDF Service] No valid Thai font found, using Helvetica (Thai characters may not display correctly)');
        console.warn('[PDF Service] To fix: Download NotoSansThai-Regular.ttf from https://fonts.google.com/noto/specimen/Noto+Sans+Thai and place it in backend/fonts/');
        return 'Helvetica';
    }

    // Generate PDF invoice
    static async generateInvoicePDF(invoice, orderItems) {
        return new Promise((resolve, reject) => {
            try {
                // Create PDF with UTF-8 support
                const doc = new PDFDocument({ 
                    margin: 50,
                    autoFirstPage: true
                });
                const buffers = [];
                
                // Register Thai font
                const thaiFont = this.registerThaiFont(doc);
                const regularFont = thaiFont;
                const boldFont = thaiFont === 'ThaiFont' ? 'ThaiFont' : 'Helvetica-Bold';
                
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfData = Buffer.concat(buffers);
                    resolve(pdfData);
                });
                doc.on('error', reject);

                // Header
                doc.font(regularFont).fontSize(24).text('INVOICE', { align: 'center' });
                doc.moveDown();

                // Invoice details
                doc.font(regularFont).fontSize(12);
                doc.text(`Invoice Number: ${invoice.invoice_number || 'N/A'}`, { align: 'left' });
                
                // Format invoice date properly
                let invoiceDateStr = 'N/A';
                if (invoice.issue_date) {
                    try {
                        const invoiceDate = invoice.issue_date instanceof Date 
                            ? invoice.issue_date 
                            : new Date(invoice.issue_date);
                        invoiceDateStr = invoiceDate.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        });
                    } catch (e) {
                        invoiceDateStr = invoice.issue_date;
                    }
                }
                doc.text(`Invoice Date: ${invoiceDateStr}`, { align: 'left' });
                doc.text(`Order Number: ${invoice.order_number || 'N/A'}`, { align: 'left' });
                doc.moveDown();

                // Customer Information
                doc.font(regularFont).fontSize(14).text('Bill To:', { underline: true });
                doc.fontSize(12);
                const username = String(invoice.username || 'Customer');
                const email = String(invoice.email || '');
                doc.text(username);
                doc.text(email);
                doc.moveDown();

                // Shipping Address
                if (invoice.shipping_address) {
                    doc.font(regularFont).fontSize(14).text('Shipping Address:', { underline: true });
                    doc.fontSize(12);
                    const address = String(invoice.shipping_address || '');
                    doc.text(address);
                    if (invoice.shipping_city) {
                        const city = String(invoice.shipping_city || '');
                        const postalCode = String(invoice.shipping_postal_code || '');
                        const cityLine = `${city}, ${postalCode}`.trim();
                        if (cityLine !== ',') {
                            doc.text(cityLine);
                        }
                    }
                    if (invoice.shipping_country) {
                        const country = String(invoice.shipping_country || '');
                        doc.text(country);
                    }
                    doc.moveDown();
                }

                // Items Table Header
                doc.moveDown();
                const tableTop = doc.y;
                doc.font(regularFont).fontSize(12);
                
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
                    
                    // Convert price and subtotal to numbers (they come as strings from DB)
                    const price = parseFloat(item.price) || 0;
                    const subtotal = parseFloat(item.subtotal) || 0;
                    const quantity = parseInt(item.quantity, 10) || 0;
                    const fruitName = String(item.fruit_name || `Item ${index + 1}`);
                    
                    doc.font(regularFont);
                    doc.text(fruitName, 50, yPosition);
                    doc.text(String(quantity), 250, yPosition);
                    const priceText = `฿${price.toFixed(2)}`;
                    const subtotalText = `฿${subtotal.toFixed(2)}`;
                    doc.text(priceText, 320, yPosition);
                    doc.text(subtotalText, 400, yPosition, { align: 'right' });
                    yPosition += 20;
                });

                doc.y = yPosition + 10;
                
                // Draw line before totals
                doc.moveTo(50, doc.y)
                   .lineTo(550, doc.y)
                   .stroke();
                
                doc.moveDown();

                // Totals (convert to numbers as they come as strings from DB)
                const invoiceSubtotal = parseFloat(invoice.subtotal) || 0;
                const invoiceTotal = parseFloat(invoice.total_amount) || 0;
                
                doc.font(regularFont).fontSize(12);
                const subtotalLabel = `Subtotal: ฿${invoiceSubtotal.toFixed(2)}`;
                doc.text(subtotalLabel, { align: 'right' });
                doc.moveDown(0.5);
                doc.font(boldFont).fontSize(14);
                const totalLabel = `Total: ฿${invoiceTotal.toFixed(2)}`;
                doc.text(totalLabel, { align: 'right' });
                doc.font(regularFont).fontSize(12);
                doc.moveDown();

                // Payment Information
                doc.moveDown();
                doc.font(regularFont).fontSize(14).text('Payment Information:', { underline: true });
                doc.fontSize(12);
                doc.text(`Payment Method: ${String(invoice.payment_method || 'Thai QR PromptPay')}`);
                doc.text(`Payment Status: ${String(invoice.payment_status || 'paid')}`);
                if (invoice.payment_date) {
                    try {
                        const paymentDate = invoice.payment_date instanceof Date 
                            ? invoice.payment_date 
                            : new Date(invoice.payment_date);
                        const paymentDateStr = paymentDate.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        });
                        doc.text(`Payment Date: ${paymentDateStr}`);
                    } catch (e) {
                        doc.text(`Payment Date: ${invoice.payment_date}`);
                    }
                }

                // Notes
                if (invoice.notes) {
                    doc.moveDown();
                    doc.font(regularFont).fontSize(14).text('Notes:', { underline: true });
                    doc.fontSize(12);
                    doc.text(String(invoice.notes));
                }

                // Footer
                doc.font(regularFont).fontSize(10)
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

