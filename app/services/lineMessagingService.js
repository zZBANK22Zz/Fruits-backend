const line = require('@line/bot-sdk');
const InvoiceModel = require('../model/invoiceModel');

// Initialize LINE client
const config = {
    channelAccessToken: process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_MESSAGING_CHANNEL_SECRET,
};

const client = new line.messagingApi.MessagingApiClient({
    channelAccessToken: config.channelAccessToken
});

class LineMessagingService {
    /**
     * Send payment confirmation Flex Message to user
     * @param {string} lineUserId - User's LINE ID
     * @param {Object} order - Order details
     */
    static async sendPaymentConfirmation(lineUserId, order) {
        if (!lineUserId || !config.channelAccessToken) {
            console.log('LINE Messaging not configured or User ID missing. Skipping notification.');
            return;
        }

        try {
            // Fetch invoice to get the invoice ID for the URL
            const invoice = await InvoiceModel.getInvoiceByOrderId(order.id);
            const invoiceId = invoice ? invoice.id : null;

            console.log(`[LINE] Building Flex Message for order: ${order.order_number}`);
            const flexMessage = this.createPaymentFlexMessage(order, invoiceId);
            console.log(`[LINE] Sending push message to: ${lineUserId}`);
            await client.pushMessage({
                to: lineUserId,
                messages: [flexMessage]
            });
            console.log(`[LINE] Payment confirmation sent successfully to: ${lineUserId}`);
        } catch (error) {
            console.error('[LINE] Error sending payment confirmation:', error.response?.data || error.message);
            if (error.response?.data) {
                console.error('[LINE] Detailed error info:', JSON.stringify(error.response.data));
            }
        }
    }

    /**
     * Create a Flex Message object for payment confirmation
     * @param {Object} order - Order details
     * @param {number|string} invoiceId - Invoice ID
     */
    static createPaymentFlexMessage(order, invoiceId) {
        return {
            type: "flex",
            altText: `ขอบคุณสำหรับการสั่งซื้อ! ออเดอร์ ${order.order_number} ของคุณได้รับการชำระเงินแล้ว`,
            contents: {
                type: "bubble",
                header: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "text",
                            text: "การชำระเงินเสร็จสมบูรณ์",
                            weight: "bold",
                            size: "lg",
                            color: "#1DB446"
                        },
                        {
                            type: "text",
                            text: "ขอบคุณที่อุดหนุน Fruit WebApp!",
                            size: "sm",
                            color: "#8C8C8C"
                        }
                    ]
                },
                body: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "box",
                            layout: "horizontal",
                            contents: [
                                { type: "text", text: "เลขที่ออเดอร์", size: "sm", color: "#8C8C8C" },
                                { type: "text", text: order.order_number, size: "sm", align: "end", weight: "bold" }
                            ]
                        },
                        {
                            type: "box",
                            layout: "horizontal",
                            contents: [
                                { type: "text", text: "วันตัดยอด", size: "sm", color: "#8C8C8C" },
                                { type: "text", text: new Date().toLocaleDateString('th-TH'), size: "sm", align: "end" }
                            ],
                            margin: "sm"
                        },
                        { type: "separator", margin: "lg" },
                        {
                            type: "box",
                            layout: "horizontal",
                            contents: [
                                { type: "text", text: "ยอดรวมทั้งสิ้น", size: "md", weight: "bold" },
                                { type: "text", text: `฿${order.total_amount}`, size: "md", align: "end", weight: "bold", color: "#E63946" }
                            ],
                            margin: "lg"
                        }
                    ]
                },
                footer: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "button",
                            action: {
                                type: "uri",
                                label: "ดูรายละเอียดออเดอร์",
                                // Construct the URL as requested: https://[URL]/bills/BillPage?invoiceId=[invoiceId]
                                uri: (process.env.FRONTEND_URL || 'https://liff.line.me').replace(/\/$/, '') + `/bills/BillPage?invoiceId=${invoiceId || ''}`
                            },
                            style: "primary",
                            color: "#1DB446"
                        }
                    ]
                }
            }
        };
    }
}

module.exports = LineMessagingService;
