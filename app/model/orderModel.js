const pool = require('../config/database');

class OrderModel {
    // Generate order number: ORD-YYYY-MMDD-{order_id}
    static generateOrderNumber(orderId) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `ORD-${year}-${month}${day}-${orderId}`;
    }

    // Create new order
    // UPDATED: Supports shared connection
    static async createOrder(orderData, client = null) {
        const { user_id, total_amount, shipping_address, shipping_city, shipping_postal_code, shipping_country, payment_method, notes } = orderData;
        
        const db = client || await pool.connect();
        const shouldManageTransaction = !client;

        try {
            if (shouldManageTransaction) await db.query('BEGIN');

            // Insert order with temporary order_number
            const tempOrderNumber = `TEMP-${Date.now()}`;
            const insertOrderQuery = `
                INSERT INTO orders (user_id, order_number, total_amount, shipping_address, shipping_city, shipping_postal_code, shipping_country, payment_method, notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            `;
            const orderResult = await db.query(insertOrderQuery, [
                user_id,
                tempOrderNumber,
                total_amount,
                shipping_address,
                shipping_city,
                shipping_postal_code,
                shipping_country,
                payment_method,
                notes
            ]);

            const orderId = orderResult.rows[0].id;
            const orderNumber = this.generateOrderNumber(orderId);

            // Update order with actual order_number
            const updateOrderQuery = `
                UPDATE orders 
                SET order_number = $1 
                WHERE id = $2
                RETURNING *
            `;
            const updatedOrder = await db.query(updateOrderQuery, [orderNumber, orderId]);

            if (shouldManageTransaction) await db.query('COMMIT');
            return updatedOrder.rows[0];
        } catch (error) {
            if (shouldManageTransaction) await db.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) db.release();
        }
    }

    // Create order items
    // UPDATED: Supports shared connection
    static async createOrderItems(orderId, items, client = null) {
        const db = client || await pool.connect();
        const shouldManageTransaction = !client;

        try {
            if (shouldManageTransaction) await db.query('BEGIN');

            const insertItemQuery = `
                INSERT INTO order_items (order_id, fruit_id, quantity, price, subtotal)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;

            const createdItems = [];
            for (const item of items) {
                const result = await db.query(insertItemQuery, [
                    orderId,
                    item.fruit_id,
                    item.quantity, 
                    item.price,
                    item.subtotal
                ]);
                createdItems.push(result.rows[0]);
            }

            if (shouldManageTransaction) await db.query('COMMIT');
            return createdItems;
        } catch (error) {
            if (shouldManageTransaction) await db.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) db.release();
        }
    }

    // Get order by ID with items
    static async getOrderById(orderId, client = null) {
        const db = client || pool; 

        const orderQuery = `
            SELECT 
                o.*,
                u.username,
                u.email,
                u.line_user_id
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.id = $1
        `;
        const orderResult = await db.query(orderQuery, [orderId]);
        
        if (orderResult.rows.length === 0) {
            return null;
        }

        const order = orderResult.rows[0];

        const itemsQuery = `
            SELECT 
                oi.*,
                f.name as fruit_name,
                f.image as fruit_image
            FROM order_items oi
            LEFT JOIN fruits f ON oi.fruit_id = f.id
            WHERE oi.order_id = $1
        `;
        const itemsResult = await db.query(itemsQuery, [orderId]);
        
        order.items = itemsResult.rows.map(item => ({
            ...item,
            fruit_image: item.fruit_image ? item.fruit_image.toString('base64') : null
        }));

        return order;
    }

    // Get all orders by user ID
    static async getOrdersByUserId(userId, client = null) {
        const db = client || pool; // <--- FIX: Use db instead of pool
        const query = `
            SELECT 
                o.*,
                COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = $1
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `;
        const result = await db.query(query, [userId]); // <--- FIX: Use db
        return result.rows;
    }

    // Get all orders (admin)
    static async getAllOrders(client = null) {
        const db = client || pool; // <--- FIX: Use db instead of pool
        const query = `
            SELECT 
                o.*,
                u.username,
                u.email,
                u.line_user_id,
                COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            GROUP BY o.id, u.username, u.email, u.line_user_id
            ORDER BY o.created_at DESC
        `;
        const result = await db.query(query); // <--- FIX: Use db
        return result.rows;
    }

    // Update order status
    static async updateOrderStatus(orderId, status, client = null) {
        const db = client || pool; 
        const query = `
            UPDATE orders 
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
        const result = await db.query(query, [status, orderId]);
        return result.rows[0];
    }

    // Get order items for stock management
    static async getOrderItems(orderId, client = null) {
        const db = client || pool;
        const query = 'SELECT fruit_id, quantity FROM order_items WHERE order_id = $1';
        const result = await db.query(query, [orderId]);
        return result.rows;
    }

    // Get expired pending orders
    static async getExpiredPendingOrders(minutes = 5, client = null) {
        const db = client || pool; // <--- FIX: Use db instead of pool
        const minutesValue = parseInt(minutes, 10) || 5;
        if (minutesValue < 0 || minutesValue > 1440) {
            throw new Error('Invalid minutes value. Must be between 0 and 1440 (24 hours)');
        }
        
        const query = `
            SELECT id, order_number, created_at
            FROM orders
            WHERE status = 'pending'
            AND created_at < NOW() - INTERVAL '${minutesValue} minutes'
        `;
        const result = await db.query(query); // <--- FIX: Use db
        return result.rows;
    }

    // Batch update orders to cancelled status
    // UPDATED: Supports shared connection
    static async batchUpdateOrdersToCancelled(orderIds, client = null) {
        if (!orderIds || orderIds.length === 0) {
            return [];
        }

        const db = client || await pool.connect();
        const shouldManageTransaction = !client;

        try {
            if (shouldManageTransaction) await db.query('BEGIN');

            const placeholders = orderIds.map((_, index) => `$${index + 1}`).join(', ');
            const query = `
                UPDATE orders 
                SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
                WHERE id IN (${placeholders})
                RETURNING id, order_number, status
            `;
            
            const result = await db.query(query, orderIds);
            
            if (shouldManageTransaction) await db.query('COMMIT');
            return result.rows;
        } catch (error) {
            if (shouldManageTransaction) await db.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldManageTransaction) db.release();
        }
    }

    // Get user's most frequently bought products
    static async getMostBoughtProducts(userId, limit = 4, client = null) {
        const db = client || pool; // <--- FIX: Use db instead of pool
        const query = `
            SELECT 
                oi.fruit_id,
                SUM(oi.quantity) as total_quantity,
                COUNT(DISTINCT oi.order_id) as order_count,
                f.id,
                f.name,
                f.description,
                f.price,
                f.stock,
                ENCODE(f.image, 'base64') as image,
                f.category_id,
                c.name as category_name
            FROM order_items oi
            INNER JOIN orders o ON oi.order_id = o.id
            INNER JOIN fruits f ON oi.fruit_id = f.id
            LEFT JOIN categories c ON f.category_id = c.id
            WHERE o.user_id = $1
            AND o.status IN ('paid', 'completed')
            GROUP BY oi.fruit_id, f.id, f.name, f.description, f.price, f.stock, f.image, f.category_id, c.name
            ORDER BY total_quantity DESC, order_count DESC
            LIMIT $2
        `;
        const result = await db.query(query, [userId, limit]); // <--- FIX: Use db
        return result.rows;
    }
}

module.exports = OrderModel;