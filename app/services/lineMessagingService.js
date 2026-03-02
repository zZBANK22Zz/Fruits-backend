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
     * Send a simple text message when order status changes
     * @param {string} lineUserId - User's LINE ID
     * @param {Object} order - Full order object (with id, order_number, status, etc.)
     * @param {string} oldStatus - Previous status
     * @param {string} newStatus - New status
     */
    static async sendOrderStatusUpdate(lineUserId, order, oldStatus, newStatus) {
        if (!lineUserId || !config.channelAccessToken) {
            console.log('LINE Messaging not configured or User ID missing. Skipping status update notification.');
            return;
        }

        try {
            const statusLabels = {
                pending: 'รอดำเนินการ',
                confirmed: 'ยืนยันคำสั่งซื้อแล้ว',
                processing: 'กำลังดำเนินการ',
                paid: 'ชำระเงินแล้ว',
                cancelled: 'ยกเลิกแล้ว',
                received: 'ร้านค้าได้รับออเดอร์แล้ว',
                preparing: 'กำลังเตรียมสินค้า',
                completed: 'เตรียมสินค้าเสร็จแล้ว',
                shipped: 'จัดส่งแล้ว',
                delivering: 'กำลังจัดส่ง',
            };

            const labelOld = statusLabels[oldStatus] || oldStatus || '-';
            const labelNew = statusLabels[newStatus] || newStatus || '-';

            const baseUrl = (process.env.FRONTEND_URL || 'https://liff.line.me').replace(/\/$/, '');
            const orderUrl = `${baseUrl}/bills/BillPage?orderId=${order.id}`;

            const messageText =
                `สถานะคำสั่งซื้อของคุณ ${order.order_number} มีการเปลี่ยนแปลง\n` +
                `จาก: ${labelOld}\n` +
                `เป็น: ${labelNew}\n\n` +
                `ดูรายละเอียดเพิ่มเติมได้ที่:\n${orderUrl}`;

            console.log(`[LINE] Sending status update for order ${order.order_number}: ${oldStatus} -> ${newStatus}`);

            await client.pushMessage({
                to: lineUserId,
                messages: [
                    {
                        type: 'text',
                        text: messageText,
                    },
                ],
            });
        } catch (error) {
            console.error('[LINE] Error sending order status update:', error.response?.data || error.message);
            if (error.response?.data) {
                console.error('[LINE] Detailed error info:', JSON.stringify(error.response.data));
            }
        }
    }

    /**
     * Send delivery confirmation message when order is marked as shipped/received
     * @param {string} lineUserId
     * @param {Object} order
     */
    static async sendDeliveryConfirmation(lineUserId, order) {
        if (!lineUserId || !config.channelAccessToken) {
            console.log('LINE Messaging not configured or User ID missing. Skipping delivery confirmation notification.');
            return;
        }

        try {
            const baseUrl = (process.env.FRONTEND_URL || 'https://liff.line.me').replace(/\/$/, '');
            const orderUrl = `${baseUrl}/bills/BillPage?orderId=${order.id}`;

            const messageText =
                `จัดส่งสำเร็จแล้ว! 📦\n` +
                `คำสั่งซื้อหมายเลข ${order.order_number} ถูกจัดส่งถึงคุณเรียบร้อยแล้ว\n\n` +
                `ดูรายละเอียดคำสั่งซื้อและใบเสร็จได้ที่:\n${orderUrl}`;

            console.log(`[LINE] Sending delivery confirmation for order ${order.order_number} to ${lineUserId}`);

            await client.pushMessage({
                to: lineUserId,
                messages: [
                    {
                        type: 'text',
                        text: messageText,
                    },
                ],
            });
        } catch (error) {
            console.error('[LINE] Error sending delivery confirmation:', error.response?.data || error.message);
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
                                // Fix: Passing orderId instead of invoiceId to match frontend fetchOrderById utility
                                uri: (process.env.FRONTEND_URL || 'https://liff.line.me').replace(/\/$/, '') + `/bills/BillPage?orderId=${order.id}`
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
