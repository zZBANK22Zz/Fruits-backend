const pool = require('../config/database');

class PaymentSlipModel {
    /**
     * Create a new payment slip record
     * @param {Object} data - Slip data (order_id, image_data, amount, payment_date, notes)
     */
    static async createPaymentSlip(data) {
        const { order_id, image_data, amount, payment_date, notes } = data;
        
        // Convert base64 image string to Buffer if provided
        const imageBuffer = typeof image_data === 'string' 
            ? Buffer.from(image_data.replace(/^data:image\/\w+;base64,/, ''), 'base64') 
            : image_data;

        const query = `
            INSERT INTO payment_slips (order_id, image_data, amount, payment_date, notes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, order_id, amount, payment_date, notes, created_at
        `;
        
        const result = await pool.query(query, [
            order_id,
            imageBuffer,
            amount || null,
            payment_date || new Date(),
            notes || null
        ]);
        
        return result.rows[0];
    }

    /**
     * Get payment slip by order ID
     * @param {number} orderId 
     */
    static async getPaymentSlipByOrderId(orderId) {
        const query = `
            SELECT id, order_id, amount, payment_date, notes, created_at, ENCODE(image_data, 'base64') as image_data
            FROM payment_slips
            WHERE order_id = $1
        `;
        const result = await pool.query(query, [orderId]);
        return result.rows[0];
    }
}

module.exports = PaymentSlipModel;
