const promptpay = require('promptpay-qr');
const QRCode = require('qrcode');

class QRPromptPayService {
    // Generate PromptPay QR Code
    static async generateQRCode(amount, orderNumber) {
        try {
            const phoneNumber = process.env.PROMPTPAY_PHONE_NUMBER;
            
            if (!phoneNumber) {
                throw new Error('PROMPTPAY_PHONE_NUMBER is not set in environment variables');
            }

            // Generate PromptPay payload string
            // promptpay-qr function signature: generatePayload(target, options)
            // target: phone number or merchant ID
            // options: { amount: number }
            const payload = promptpay(phoneNumber, {
                amount: amount
            });

            // Generate QR code image as data URL (base64)
            const qrCodeDataURL = await QRCode.toDataURL(payload, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                width: 400,
                margin: 2
            });

            // Also generate as buffer for direct image response
            const qrCodeBuffer = await QRCode.toBuffer(payload, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                width: 400,
                margin: 2
            });

            return {
                payload: payload,
                qrCodeDataURL: qrCodeDataURL,
                qrCodeBuffer: qrCodeBuffer,
                amount: amount,
                phoneNumber: phoneNumber,
                orderNumber: orderNumber
            };
        } catch (error) {
            console.error('Generate QR Code error:', error);
            throw error;
        }
    }

    // Generate QR Code for order
    static async generateQRCodeForOrder(order) {
        try {
            const amount = parseFloat(order.total_amount);
            const orderNumber = order.order_number;

            return await this.generateQRCode(amount, orderNumber);
        } catch (error) {
            console.error('Generate QR Code for order error:', error);
            throw error;
        }
    }
}

module.exports = QRPromptPayService;

