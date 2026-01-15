const pool = require('../config/database');

class InvoiceModel {
    // Generate invoice number: INV-YYYY-MMDD-{invoice_id}
    static generateInvoiceNumber(invoiceId) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `INV-${year}-${month}${day}-${invoiceId}`;
    }

    // Create new invoice
    // UPDATED: Accepts optional client
    static async createInvoice(invoiceData, client = null) {
        const { order_id, user_id, subtotal, total_amount, payment_method, payment_date, notes } = invoiceData;
        
        // If client is passed, use it. If not, connect to pool.
        const db = client || await pool.connect();
        
        // Only manage the transaction (BEGIN/COMMIT) if we created the connection ourselves
        const shouldManageTransaction = !client;

        try {
            if (shouldManageTransaction) {
                await db.query('BEGIN');
            }

            // Insert invoice with temporary invoice_number
            const tempInvoiceNumber = `TEMP-${Date.now()}`;
            const insertInvoiceQuery = `
                INSERT INTO invoices (invoice_number, order_id, user_id, subtotal, total_amount, payment_method, payment_date, notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            `;
            const invoiceResult = await db.query(insertInvoiceQuery, [
                tempInvoiceNumber,
                order_id,
                user_id,
                subtotal,
                total_amount,
                payment_method,
                payment_date,
                notes
            ]);

            const invoiceId = invoiceResult.rows[0].id;
            const invoiceNumber = this.generateInvoiceNumber(invoiceId);

            // Update invoice with actual invoice_number
            const updateInvoiceQuery = `
                UPDATE invoices 
                SET invoice_number = $1 
                WHERE id = $2
                RETURNING *
            `;
            const updatedInvoice = await db.query(updateInvoiceQuery, [invoiceNumber, invoiceId]);

            if (shouldManageTransaction) {
                await db.query('COMMIT');
            }
            
            return updatedInvoice.rows[0];
        } catch (error) {
            if (shouldManageTransaction) {
                await db.query('ROLLBACK');
            }
            throw error;
        } finally {
            // Only release if we created the connection ourselves
            if (shouldManageTransaction) {
                db.release();
            }
        }
    }

    // Get invoice by ID with order and user details
    // UPDATED: Accepts optional client
    static async getInvoiceById(invoiceId, client = null) {
        const db = client || pool;
        const query = `
            SELECT 
                i.*,
                o.order_number,
                o.status as order_status,
                o.shipping_address,
                o.shipping_city,
                o.shipping_postal_code,
                o.shipping_country,
                u.username,
                u.email
            FROM invoices i
            LEFT JOIN orders o ON i.order_id = o.id
            LEFT JOIN users u ON i.user_id = u.id
            WHERE i.id = $1
        `;
        const result = await db.query(query, [invoiceId]);
        return result.rows[0];
    }

    // Get invoice by order ID
    // UPDATED: Accepts optional client
    static async getInvoiceByOrderId(orderId, client = null) {
        const db = client || pool;
        const query = `
            SELECT 
                i.*,
                o.order_number,
                o.status as order_status,
                o.shipping_address,
                o.shipping_city,
                o.shipping_postal_code,
                o.shipping_country,
                u.username,
                u.email
            FROM invoices i
            LEFT JOIN orders o ON i.order_id = o.id
            LEFT JOIN users u ON i.user_id = u.id
            WHERE i.order_id = $1
        `;
        const result = await db.query(query, [orderId]);
        return result.rows[0];
    }

    // Get all invoices by user ID
    static async getInvoicesByUserId(userId) {
        const query = `
            SELECT 
                i.*,
                o.order_number,
                o.status as order_status
            FROM invoices i
            LEFT JOIN orders o ON i.order_id = o.id
            WHERE i.user_id = $1
            ORDER BY i.created_at DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    // Get all invoices (admin)
    static async getAllInvoices() {
        const query = `
            SELECT 
                i.*,
                o.order_number,
                o.status as order_status,
                u.username,
                u.email
            FROM invoices i
            LEFT JOIN orders o ON i.order_id = o.id
            LEFT JOIN users u ON i.user_id = u.id
            ORDER BY i.created_at DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    // Check if invoice exists for order
    // UPDATED: Accepts optional client
    static async invoiceExistsForOrder(orderId, client = null) {
        const db = client || pool;
        const query = 'SELECT id FROM invoices WHERE order_id = $1';
        const result = await db.query(query, [orderId]);
        return result.rows.length > 0;
    }
}

module.exports = InvoiceModel;