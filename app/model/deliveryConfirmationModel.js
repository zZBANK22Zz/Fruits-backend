const pool = require('../config/database');

class DeliveryConfirmationModel {
    /**
     * Create a new delivery confirmation record
     * @param {Object} data - Delivery data
     * @param {Object} client - DB client for transaction
     */
    static async createDeliveryConfirmation(data, client = null) {
        const { 
            order_id, 
            delivery_image, 
            delivery_date, 
            delivery_time, 
            sender_name, 
            receiver_name, 
            receiver_phone, 
            receiver_address 
        } = data;
        
        const db = client || pool;

        // Convert base64 image string to Buffer if provided
        const imageBuffer = typeof delivery_image === 'string' 
            ? Buffer.from(delivery_image.replace(/^data:image\/\w+;base64,/, ''), 'base64') 
            : delivery_image;

        const query = `
            INSERT INTO delivery_confirmations (
                order_id, 
                delivery_image, 
                delivery_date, 
                delivery_time, 
                sender_name, 
                receiver_name, 
                receiver_phone, 
                receiver_address
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, order_id, delivery_date, delivery_time, sender_name, created_at
        `;
        
        const result = await db.query(query, [
            order_id,
            imageBuffer,
            delivery_date,
            delivery_time,
            sender_name,
            receiver_name,
            receiver_phone,
            receiver_address
        ]);
        
        return result.rows[0];
    }

    /**
     * Get delivery confirmation by order ID
     * @param {number} orderId 
     */
    static async getDeliveryConfirmationByOrderId(orderId) {
        const query = `
            SELECT 
                id, order_id, delivery_date, delivery_time, sender_name, 
                receiver_name, receiver_phone, receiver_address, created_at, 
                ENCODE(delivery_image, 'base64') as delivery_image
            FROM delivery_confirmations
            WHERE order_id = $1
        `;
        const result = await pool.query(query, [orderId]);
        return result.rows[0];
    }
}

module.exports = DeliveryConfirmationModel;
