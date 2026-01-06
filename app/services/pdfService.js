const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFService {
    /**
     * Robustly finds the Thai font file in both Dev and Production environments
     */
    static registerThaiFont(doc) {
        // Define all possible places the fonts folder might be hidden
        const possibleRoots = [
            // 1. Production / Docker Root (Best for deployment)
            path.join(process.cwd(), 'fonts'),
            path.join(process.cwd(), 'app', 'fonts'),
            
            // 2. Relative to this file (Best for local dev)
            // If this file is in /app/services, ../fonts goes to /app/fonts
            path.join(__dirname, '../fonts'),
            // Fallback if structure is deeper
            path.join(__dirname, '../../fonts'),
        ];

        let foundPath = null;

        // Loop through all possible root locations
        for (const rootDir of possibleRoots) {
            // We check two common naming patterns
            const candidates = [
                // Pattern A: Nested Google Fonts structure (Dev/Download)
                path.join(rootDir, 'Noto_Sans_Thai', 'static', 'NotoSansThai-Regular.ttf'),
                // Pattern B: Flat structure (Docker/Production copy)
                path.join(rootDir, 'NotoSansThai-Regular.ttf')
            ];

            for (const filePath of candidates) {
                if (fs.existsSync(filePath)) {
                    // Check if file is valid (not empty)
                    const stats = fs.statSync(filePath);
                    if (stats.size > 10000) {
                        foundPath = filePath;
                        break;
                    }
                }
            }
            if (foundPath) break;
        }

        if (foundPath) {
            try {
                doc.registerFont('ThaiFont', foundPath);
                // console.log(`[PDF Service] Loaded Thai font from: ${foundPath}`);
                return 'ThaiFont';
            } catch (e) {
                console.warn(`[PDF Service] Found font but failed to load: ${e.message}`);
            }
        }

        // --- FALLBACK ---
        console.warn('[PDF Service] WARNING: Could not find "NotoSansThai-Regular.ttf" in any common location.');
        console.warn('[PDF Service] Checked locations:', possibleRoots.map(r => r).join(', '));
        console.warn('[PDF Service] Using Helvetica (Thai text will not display correctly).');
        return 'Helvetica';
    }

    // Generate PDF invoice
    static async generateInvoicePDF(invoice, orderItems) {
        return new Promise((resolve, reject) => {
            try {
                // Create PDF with UTF-8 support
                const doc = new PDFDocument({ 
                    margin: 50,
                    autoFirstPage: true,
                    size: 'A4' 
                });
                const buffers = [];
                
                // 1. Register Thai font using the new robust method
                const thaiFont = this.registerThaiFont(doc);
                
                // 2. Set fonts based on availability
                const regularFont = thaiFont;
                // If we don't have a specific Bold Thai font, we reuse the Regular one 
                // (switching to Helvetica-Bold would break Thai characters)
                const boldFont = thaiFont === 'ThaiFont' ? 'ThaiFont' : 'Helvetica-Bold';
                
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const pdfData = Buffer.concat(buffers);
                    resolve(pdfData);
                });
                doc.on('error', reject);

                const pageWidth = doc.page.width;
                const pageHeight = doc.page.height;
                const margin = 50;
                const contentWidth = pageWidth - (margin * 2);
                
                // --- LOGO PATH FIX ---
                // We apply similar robust logic for the logo to prevent it breaking in Prod too
                const logoCandidates = [
                    path.join(process.cwd(), 'public', 'images', 'Logo.png'),
                    path.join(__dirname, '../../public/images/Logo.png'),
                    path.join(__dirname, '../public/images/Logo.png')
                ];
                let logoPath = null;
                for (const p of logoCandidates) {
                    if (fs.existsSync(p)) { logoPath = p; break; }
                }

                let logoHeight = 0;
                const logoWidth = 100;
                const headerTop = 50;
                
                // Header Section with Logo
                if (logoPath) {
                    try {
                        doc.image(logoPath, margin, headerTop, { 
                            width: logoWidth,
                            height: logoWidth,
                            fit: [logoWidth, logoWidth]
                        });
                        logoHeight = logoWidth;
                    } catch (e) {
                        console.warn('[PDF Service] Could not load logo image:', e.message);
                    }
                }
                
                // Shop Name
                doc.font(boldFont).fontSize(20).fillColor('black');
                const shopNameX = margin + logoWidth + 25;
                const shopNameY = headerTop + (logoHeight / 2) - 10 - 23;
                doc.text('ร้านผลไม้ดี', shopNameX, shopNameY);
                
                // Invoice/Order ID
                doc.font(regularFont).fontSize(11).fillColor('#666666');
                const invoiceId = invoice.invoice_number || invoice.order_number || 'N/A';
                doc.text(`เลขที่: ${invoiceId}`, pageWidth - margin, headerTop, { align: 'right', width: 200 });
                
                // Date
                let invoiceDateStr = '';
                if (invoice.issue_date) {
                    try {
                        const invoiceDate = invoice.issue_date instanceof Date ? invoice.issue_date : new Date(invoice.issue_date);
                        invoiceDateStr = invoiceDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
                    } catch (e) { invoiceDateStr = invoice.issue_date; }
                }
                if (invoiceDateStr) {
                    doc.font(regularFont).fontSize(10).fillColor('#666666');
                    doc.text(`วันที่: ${invoiceDateStr}`, pageWidth - margin, headerTop + 15, { align: 'right', width: 200 });
                }
                
                // Move down
                doc.y = headerTop + logoHeight + 30;
                
                // Payment Method
                const paymentSectionY = doc.y;
                doc.roundedRect(margin, paymentSectionY, contentWidth, 35, 5).fillColor('#f8f9fa').fill().fillColor('black');
                
                doc.font(boldFont).fontSize(12).fillColor('#333333');
                doc.text('วิธีการชำระเงิน', margin + 15, paymentSectionY + 8);
                doc.font(regularFont).fontSize(14).fillColor('black');
                doc.text(String(invoice.payment_method || 'QR PromptPay'), margin + 15, paymentSectionY + 22);
                
                doc.y = paymentSectionY + 45;
                
                // Items Header
                doc.moveDown(1);
                doc.font(boldFont).fontSize(18).fillColor('black');
                doc.text('รายการสินค้า', { align: 'center' });
                doc.moveDown(0.8);
                
                const headerLineY = doc.y - 5;
                doc.moveTo(margin, headerLineY).lineTo(pageWidth - margin, headerLineY).lineWidth(1).strokeColor('#333333').stroke();
                doc.moveDown(1);
                
                // Items Table Header
                const itemsStartY = doc.y;
                const itemRowHeight = 25;
                const col1X = margin + 10;
                const col2X = pageWidth - margin - 150;
                const col3X = pageWidth - margin - 50;
                
                doc.font(boldFont).fontSize(12).fillColor('#666666');
                doc.text('สินค้า', col1X, itemsStartY);
                doc.text('จำนวน', col2X, itemsStartY, { width: 60, align: 'center' });
                doc.text('ราคา', col3X, itemsStartY, { align: 'right' });
                
                doc.moveTo(margin, itemsStartY + 18).lineTo(pageWidth - margin, itemsStartY + 18).lineWidth(0.5).strokeColor('#cccccc').stroke();
                doc.y = itemsStartY + itemRowHeight;
                
                // Items List
                doc.font(regularFont).fontSize(13).fillColor('black');
                
                orderItems.forEach((item, index) => {
                    if (doc.y > pageHeight - 200) { doc.addPage(); doc.y = 50; }
                    
                    const price = parseFloat(item.price) || 0;
                    const weight = parseFloat(item.quantity) || 0;
                    const fruitName = String(item.fruit_name || `Item ${index + 1}`);
                    
                    doc.text(fruitName, col1X, doc.y);
                    doc.text(weight.toFixed(2) + ' kg', col2X, doc.y, { width: 60, align: 'center' });
                    doc.text(`${price.toFixed(2)} บาท`, col3X, doc.y, { align: 'right' });
                    
                    doc.y += itemRowHeight;
                });
                
                // Total Section
                const totalLineY = doc.y + 10;
                doc.moveTo(margin, totalLineY).lineTo(pageWidth - margin, totalLineY).lineWidth(1.5).strokeColor('#333333').stroke();
                doc.y = totalLineY + 20;
                
                const invoiceTotal = parseFloat(invoice.total_amount) || 0;
                const totalBoxY = doc.y;
                const totalBoxHeight = 50;
                
                doc.roundedRect(margin, totalBoxY, contentWidth, totalBoxHeight, 5).fillColor('#fff3cd').fill().fillColor('black');
                
                doc.font(boldFont).fontSize(20).fillColor('#333333');
                doc.text(`ยอดชำระสุทธิ: ${invoiceTotal.toFixed(2)} บาท`, margin + 15, totalBoxY + 15, { align: 'left' });
                
                // Footer
                doc.y = totalBoxY + totalBoxHeight + 25;
                const footerY = pageHeight - 120;
                const footerX = (pageWidth / 2) - 235; // Centered offset
                
                doc.font(regularFont).fontSize(16).fillColor('#666666');
                doc.text('ขอบคุณที่ใช้บริการ', footerX, footerY, { align: 'center' });
                doc.font(regularFont).fontSize(10).fillColor('#999999');
                doc.text('หวังว่าจะได้รับความพึงพอใจจากท่าน', footerX, footerY + 20, { align: 'center' });

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }
}

module.exports = PDFService;