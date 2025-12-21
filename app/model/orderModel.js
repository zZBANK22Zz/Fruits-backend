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
    static async createOrder(orderData) {
        const { user_id, total_amount, shipping_address, shipping_city, shipping_postal_code, shipping_country, payment_method, notes } = orderData;
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Insert order with temporary order_number (will be updated immediately)
            // We use a placeholder that includes the current timestamp to ensure uniqueness
            const tempOrderNumber = `TEMP-${Date.now()}`;
            const insertOrderQuery = `
                INSERT INTO orders (user_id, order_number, total_amount, shipping_address, shipping_city, shipping_postal_code, shipping_country, payment_method, notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            `;
            const orderResult = await client.query(insertOrderQuery, [
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
            const updatedOrder = await client.query(updateOrderQuery, [orderNumber, orderId]);

            await client.query('COMMIT');
            return updatedOrder.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Create order items
    // Note: The 'quantity' column in order_items table stores weight in kilograms (DECIMAL)
    // This allows decimal values like 1.5, 2.5 kg, etc.
    static async createOrderItems(orderId, items) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const insertItemQuery = `
                INSERT INTO order_items (order_id, fruit_id, quantity, price, subtotal)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;

            const createdItems = [];
            for (const item of items) {
                // item.quantity contains weight in kilograms (can be decimal)
                const result = await client.query(insertItemQuery, [
                    orderId,
                    item.fruit_id,
                    item.quantity, // This is weight in kg, stored in quantity column
                    item.price,
                    item.subtotal
                ]);
                createdItems.push(result.rows[0]);
            }

            await client.query('COMMIT');
            return createdItems;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Get order by ID with items
    static async getOrderById(orderId) {
        const orderQuery = `
            SELECT 
                o.*,
                u.username,
                u.email
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.id = $1
        `;
        const orderResult = await pool.query(orderQuery, [orderId]);
        
        if (orderResult.rows.length === 0) {
            return null;
        }

        const order = orderResult.rows[0];

        // Get order items with fruit details
        const itemsQuery = `
            SELECT 
                oi.*,
                f.name as fruit_name,
                f.image as fruit_image
            FROM order_items oi
            LEFT JOIN fruits f ON oi.fruit_id = f.id
            WHERE oi.order_id = $1
        `;
        const itemsResult = await pool.query(itemsQuery, [orderId]);
        // Convert binary image data to base64
        order.items = itemsResult.rows.map(item => ({
            ...item,
            fruit_image: item.fruit_image ? item.fruit_image.toString('base64') : null
        }));

        return order;
    }

    // Get all orders by user ID
    static async getOrdersByUserId(userId) {
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
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    // Get all orders (admin)
    static async getAllOrders() {
        const query = `
            SELECT 
                o.*,
                u.username,
                u.email,
                COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            GROUP BY o.id, u.username, u.email
            ORDER BY o.created_at DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    // Update order status
    static async updateOrderStatus(orderId, status) {
        const query = `
            UPDATE orders 
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
        const result = await pool.query(query, [status, orderId]);
        return result.rows[0];
    }

    // Get order items for stock management
    // Returns items with fruit_id and quantity (which contains weight in kilograms)
    static async getOrderItems(orderId) {
        const query = 'SELECT fruit_id, quantity FROM order_items WHERE order_id = $1';
        const result = await pool.query(query, [orderId]);
        return result.rows; // quantity field contains weight in kg (decimal)
    }

    // Get expired pending orders (older than specified minutes)
    static async getExpiredPendingOrders(minutes = 5) {
        // Ensure minutes is a valid number to prevent SQL injection
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
        const result = await pool.query(query);
        return result.rows;
    }

    // Batch update orders to cancelled status (for expired unpaid orders)
    static async batchUpdateOrdersToCancelled(orderIds) {
        if (!orderIds || orderIds.length === 0) {
            return [];
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const placeholders = orderIds.map((_, index) => `$${index + 1}`).join(', ');
            const query = `
                UPDATE orders 
                SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
                WHERE id IN (${placeholders})
                RETURNING id, order_number, status
            `;
            
            const result = await client.query(query, orderIds);
            await client.query('COMMIT');
            return result.rows;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Get user's most frequently bought products
    static async getMostBoughtProducts(userId, limit = 4) {
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
        const result = await pool.query(query, [userId, limit]);
        return result.rows;
    }
}

module.exports = OrderModel;

