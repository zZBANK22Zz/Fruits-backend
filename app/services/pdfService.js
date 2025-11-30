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
                    autoFirstPage: true,
                    size: 'A4' // Standard A4 size
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

                // Page dimensions
                const pageWidth = doc.page.width;
                const pageHeight = doc.page.height;
                const margin = 50;
                const contentWidth = pageWidth - (margin * 2);
                
                // Load logo image
                const logoPath = path.join(__dirname, '../../public/images/Logo.png');
                let logoHeight = 0;
                const logoWidth = 100; // Increased from 70 to 100 for bigger logo
                const headerTop = 50;
                
                // Header Section with Logo and Shop Name
                if (fs.existsSync(logoPath)) {
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
                
                // Shop Name - Large bold Thai text next to logo, aligned on same baseline
                doc.font(boldFont).fontSize(20).fillColor('black'); // Slightly larger font
                const shopNameX = margin + logoWidth + 25; // More spacing from logo
                // Align text to center vertically with logo - moved up by 2 cm (56 points)
                const shopNameY = headerTop + (logoHeight / 2) - 10 - 23; // Moved up by 2 cm
                doc.text('ร้านผลไม้ดี', shopNameX, shopNameY);
                
                // Invoice/Order ID in top-right corner
                doc.font(regularFont).fontSize(11).fillColor('#666666');
                const invoiceId = invoice.invoice_number || invoice.order_number || 'N/A';
                const idText = `เลขที่: ${invoiceId}`;
                doc.text(idText, pageWidth - margin, headerTop, { align: 'right', width: 200 });
                
                // Date below ID
                let invoiceDateStr = '';
                if (invoice.issue_date) {
                    try {
                        const invoiceDate = invoice.issue_date instanceof Date 
                            ? invoice.issue_date 
                            : new Date(invoice.issue_date);
                        invoiceDateStr = invoiceDate.toLocaleDateString('th-TH', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        });
                    } catch (e) {
                        invoiceDateStr = invoice.issue_date;
                    }
                }
                if (invoiceDateStr) {
                    doc.font(regularFont).fontSize(10).fillColor('#666666');
                    doc.text(`วันที่: ${invoiceDateStr}`, pageWidth - margin, headerTop + 15, { align: 'right', width: 200 });
                }
                
                // Move down after header with spacing
                doc.y = headerTop + logoHeight + 30;
                
                // Payment Method Section with background
                const paymentSectionY = doc.y;
                doc.roundedRect(margin, paymentSectionY, contentWidth, 35, 5)
                   .fillColor('#f8f9fa')
                   .fill()
                   .fillColor('black'); // Reset fill color
                
                doc.font(boldFont).fontSize(12).fillColor('#333333');
                doc.text('วิธีการชำระเงิน', margin + 15, paymentSectionY + 8);
                doc.font(regularFont).fontSize(14).fillColor('black');
                const paymentMethod = String(invoice.payment_method || 'QR PromptPay');
                doc.text(paymentMethod, margin + 15, paymentSectionY + 22);
                
                doc.y = paymentSectionY + 45;
                
                // Items Section Header
                doc.moveDown(1);
                doc.font(boldFont).fontSize(18).fillColor('black');
                doc.text('รายการสินค้า', { align: 'center' });
                doc.moveDown(0.8);
                
                // Draw line under header
                const headerLineY = doc.y - 5;
                doc.moveTo(margin, headerLineY)
                   .lineTo(pageWidth - margin, headerLineY)
                   .lineWidth(1)
                   .strokeColor('#333333')
                   .stroke();
                
                doc.moveDown(1);
                
                // Items Table with better formatting
                const itemsStartY = doc.y;
                const itemRowHeight = 25;
                const col1X = margin + 10; // Item name
                const col2X = pageWidth - margin - 150; // Quantity
                const col3X = pageWidth - margin - 50; // Price
                
                // Table header
                doc.font(boldFont).fontSize(12).fillColor('#666666');
                doc.text('สินค้า', col1X, itemsStartY);
                doc.text('จำนวน', col2X, itemsStartY, { width: 60, align: 'center' });
                doc.text('ราคา', col3X, itemsStartY, { align: 'right' });
                
                // Draw line under header
                doc.moveTo(margin, itemsStartY + 18)
                   .lineTo(pageWidth - margin, itemsStartY + 18)
                   .lineWidth(0.5)
                   .strokeColor('#cccccc')
                   .stroke();
                
                doc.y = itemsStartY + itemRowHeight;
                
                // Items List
                doc.font(regularFont).fontSize(13).fillColor('black');
                
                orderItems.forEach((item, index) => {
                    if (doc.y > pageHeight - 200) { // New page if needed
                        doc.addPage();
                        doc.y = 50;
                    }
                    
                    // Convert price to number
                    const price = parseFloat(item.price) || 0;
                    const quantity = parseInt(item.quantity, 10) || 0;
                    const fruitName = String(item.fruit_name || `Item ${index + 1}`);
                    
                    // Item name on left
                    doc.text(fruitName, col1X, doc.y);
                    
                    // Quantity in middle (centered)
                    doc.text(String(quantity), col2X, doc.y, { width: 60, align: 'center' });
                    
                    // Price on right
                    doc.text(`${price.toFixed(2)} บาท`, col3X, doc.y, { align: 'right' });
                    
                    doc.y += itemRowHeight;
                });
                
                // Draw line before total
                const totalLineY = doc.y + 10;
                doc.moveTo(margin, totalLineY)
                   .lineTo(pageWidth - margin, totalLineY)
                   .lineWidth(1.5)
                   .strokeColor('#333333')
                   .stroke();
                
                doc.y = totalLineY + 20;
                
                // Total Amount Section with highlight
                const invoiceTotal = parseFloat(invoice.total_amount) || 0;
                const totalBoxY = doc.y;
                const totalBoxHeight = 50;
                
                // Background box for total
                doc.roundedRect(margin, totalBoxY, contentWidth, totalBoxHeight, 5)
                   .fillColor('#fff3cd')
                   .fill()
                   .fillColor('black'); // Reset fill color
                
                // Total text - Large bold Thai text
                doc.font(boldFont).fontSize(20).fillColor('#333333');
                const totalText = `ยอดชำระสุทธิ: ${invoiceTotal.toFixed(2)} บาท`;
                doc.text(totalText, margin + 15, totalBoxY + 15, { align: 'left' });
                
                doc.y = totalBoxY + totalBoxHeight + 25;
                
                // Footer - Thank you message with better styling
                doc.font(regularFont).fontSize(16).fillColor('#666666');
                const footerY = pageHeight - 120;
                // Shift text 1 cm (approx 28.35 pt) to left from center
                const footerX = (pageWidth / 2) - 235;
                doc.text('ขอบคุณที่ใช้บริการ', footerX, footerY, { align: 'center' });

                // Additional footer text
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

