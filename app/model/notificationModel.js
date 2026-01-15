const pool = require('../config/database');

class NotificationModel {
    /**
     * Create a new notification
     * @param {Object} data - Notification data (user_id, title, message, type, related_id)
     */
    static async createNotification(data) {
        const { user_id, title, message, type = 'info', related_id = null } = data;
        
        const query = `
            INSERT INTO notifications (user_id, title, message, type, related_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            user_id,
            title,
            message,
            type,
            related_id
        ]);
        
        return result.rows[0];
    }

    /**
     * Get notifications for a user
     * @param {number} userId 
     * @param {Object} options - Filter and pagination options
     */
    static async getNotificationsByUserId(userId, options = {}) {
        const { limit = 50, offset = 0, is_read = null } = options;
        
        let query = `
            SELECT * FROM notifications 
            WHERE user_id = $1
        `;
        const params = [userId];
        let paramIndex = 2;

        if (is_read !== null) {
            query += ` AND is_read = $${paramIndex++}`;
            params.push(is_read);
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Mark a notification as read
     * @param {number} id 
     * @param {number} userId - To ensure ownership
     */
    static async markAsRead(id, userId) {
        const query = `
            UPDATE notifications 
            SET is_read = TRUE 
            WHERE id = $1 AND user_id = $2
            RETURNING *
        `;
        const result = await pool.query(query, [id, userId]);
        return result.rows[0];
    }

    /**
     * Mark all notifications as read for a user
     * @param {number} userId 
     */
    static async markAllAsRead(userId) {
        const query = `
            UPDATE notifications 
            SET is_read = TRUE 
            WHERE user_id = $1
            RETURNING id
        `;
        const result = await pool.query(query, [userId]);
        return result.rowCount;
    }

    /**
     * Delete a notification
     * @param {number} id 
     * @param {number} userId 
     */
    static async deleteNotification(id, userId) {
        const query = `
            DELETE FROM notifications 
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `;
        const result = await pool.query(query, [id, userId]);
        return result.rows[0];
    }

    /**
     * Count unread notifications for a user
     * @param {number} userId 
     */
    static async countUnread(userId) {
        const query = `
            SELECT COUNT(*) FROM notifications 
            WHERE user_id = $1 AND is_read = FALSE
        `;
        const result = await pool.query(query, [userId]);
        return parseInt(result.rows[0].count);
    }
}

module.exports = NotificationModel;
