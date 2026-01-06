const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// --- 1. IMPORT THE FONT AS DATA (Fixes Vercel Issue) ---
// This requires the previous Step 1 (convert.js) to be completed
let thaiFontBase64;
try {
    thaiFontBase64 = require('./thaiFont');
} catch (e) {
    console.warn('[PDF Service] Warning: thaiFont.js not found. Run convert.js first.');
}

class PDFService {

    // --- 2. REGISTER FONT (Base64 Method) ---
    static registerThaiFont(doc) {
        if (thaiFontBase64) {
            try {
                // Convert Base64 string back to Buffer
                const fontBuffer = Buffer.from(thaiFontBase64, 'base64');
                doc.registerFont('ThaiFont', fontBuffer);
                console.log('[PDF Service] Successfully registered Thai font from memory.');
                return 'ThaiFont';
            } catch (e) {
                console.warn(`[PDF Service] Failed to load Base64 font: ${e.message}`);
            }
        } else {
            console.warn('[PDF Service] Thai font data is missing.');
        }
        return 'Helvetica'; // Fallback
    }

    // --- 3. GENERATE PDF (Your New Design) ---
    static async generateInvoicePDF(invoice, orderItems) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ 
                    margin: 50,
                    autoFirstPage: true,
                    size: 'A4' 
                });
                const buffers = [];
                
                // Register Font
                const thaiFont = this.registerThaiFont(doc);
                const regularFont = thaiFont;
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
                
                // --- ROBUST LOGO FINDER ---
                // This ensures the logo works on Vercel/Docker and Localhost
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
                
                // --- HEADER ---
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
                
                // --- PAYMENT METHOD SECTION ---
                const paymentSectionY = doc.y;
                doc.roundedRect(margin, paymentSectionY, contentWidth, 35, 5)
                   .fillColor('#f8f9fa')
                   .fill()
                   .fillColor('black'); // Reset
                
                doc.font(boldFont).fontSize(12).fillColor('#333333');
                doc.text('วิธีการชำระเงิน', margin + 15, paymentSectionY + 8);
                doc.font(regularFont).fontSize(14).fillColor('black');
                doc.text(String(invoice.payment_method || 'QR PromptPay'), margin + 15, paymentSectionY + 22);
                
                doc.y = paymentSectionY + 45;
                
                // --- ITEMS TABLE HEADER ---
                doc.moveDown(1);
                doc.font(boldFont).fontSize(18).fillColor('black');
                doc.text('รายการสินค้า', { align: 'center' });
                doc.moveDown(0.8);
                
                const headerLineY = doc.y - 5;
                doc.moveTo(margin, headerLineY).lineTo(pageWidth - margin, headerLineY).lineWidth(1).strokeColor('#333333').stroke();
                doc.moveDown(1);
                
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
                
                // --- ITEMS LIST ---
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
                
                // --- TOTAL SECTION ---
                const totalLineY = doc.y + 10;
                doc.moveTo(margin, totalLineY).lineTo(pageWidth - margin, totalLineY).lineWidth(1.5).strokeColor('#333333').stroke();
                doc.y = totalLineY + 20;
                
                const invoiceTotal = parseFloat(invoice.total_amount) || 0;
                const totalBoxY = doc.y;
                const totalBoxHeight = 50;
                
                doc.roundedRect(margin, totalBoxY, contentWidth, totalBoxHeight, 5)
                   .fillColor('#fff3cd')
                   .fill()
                   .fillColor('black');
                
                doc.font(boldFont).fontSize(20).fillColor('#333333');
                doc.text(`ยอดชำระสุทธิ: ${invoiceTotal.toFixed(2)} บาท`, margin + 15, totalBoxY + 15, { align: 'left' });
                
                // --- FOOTER ---
                doc.y = totalBoxY + totalBoxHeight + 25;
                const footerY = pageHeight - 120;
                const footerX = (pageWidth / 2) - 235;
                
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