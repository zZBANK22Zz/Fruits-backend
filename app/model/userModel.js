const pool = require('../config/database');

class UserModel {
    // Find user by email
    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await pool.query(query, [email]);
        return result.rows[0];
    }

    // Find user by username
    static async findByUsername(username) {
        const query = 'SELECT * FROM users WHERE username = $1';
        const result = await pool.query(query, [username]);
        return result.rows[0];
    }

    // Find user by LINE user ID
    static async findByLineUserId(lineUserId) {
        const query = 'SELECT * FROM users WHERE line_user_id = $1';
        const result = await pool.query(query, [lineUserId]);
        return result.rows[0];
    }

    // Find user by ID
    static async findById(id) {
        const query = 'SELECT id, username, email, first_name, last_name, role, created_at, image, line_user_id FROM users WHERE id = $1';
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) return null;
        const user = result.rows[0];
        // Convert binary image data to base64
        return {
            ...user,
            image: user.image ? user.image.toString('base64') : null
        };
    }

    // Create new user
    static async create(userData) {
        const { username, email, password, first_name, last_name, role = 'user', line_user_id } = userData;
        
        // Build query dynamically based on whether password or line_user_id is provided
        if (line_user_id) {
            // LINE user - no password required
            const query = `
                INSERT INTO users (username, email, password, first_name, last_name, role, line_user_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, username, email, first_name, last_name, role, line_user_id, created_at
            `;
            const result = await pool.query(query, [username, email, null, first_name, last_name, role, line_user_id]);
            return result.rows[0];
        } else {
            // Regular user - password required
            const query = `
                INSERT INTO users (username, email, password, first_name, last_name, role)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, username, email, first_name, last_name, role, created_at
            `;
            const result = await pool.query(query, [username, email, password, first_name, last_name, role]);
            return result.rows[0];
        }
    }

    // Update user role (admin only)
    static async updateRole(userId, role) {
        const query = `
            UPDATE users 
            SET role = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, username, email, role, updated_at
        `;
        const result = await pool.query(query, [role, userId]);
        return result.rows[0];
    }

    //Edit user
    static async editUser(userId, userData) {
        // Build dynamic query based on which fields are provided
        const updates = [];
        const params = [];
        let paramIndex = 1;
        
        // Username is always required (for validation)
        if (userData.username !== undefined) {
            updates.push(`username = $${paramIndex++}`);
            params.push(userData.username);
        }
        
        // Email is always required (for validation)
        if (userData.email !== undefined) {
            updates.push(`email = $${paramIndex++}`);
            params.push(userData.email);
        }
        
        // Only update password if provided
        if (userData.password !== undefined && userData.password !== null) {
            updates.push(`password = $${paramIndex++}`);
            params.push(userData.password);
        }
        
        // Only update first_name if provided
        if (userData.first_name !== undefined) {
            updates.push(`first_name = $${paramIndex++}`);
            params.push(userData.first_name);
        }
        
        // Only update last_name if provided
        if (userData.last_name !== undefined) {
            updates.push(`last_name = $${paramIndex++}`);
            params.push(userData.last_name);
        }
        
        // Only update image if provided
        if (userData.image !== undefined) {
            updates.push(`image = $${paramIndex++}`);
            params.push(userData.image); // image should be Buffer or null
        }
        
        // Only update line_user_id if provided
        if (userData.line_user_id !== undefined) {
            updates.push(`line_user_id = $${paramIndex++}`);
            params.push(userData.line_user_id);
        }
        
        // Always update timestamp
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        
        // Add userId as last parameter
        params.push(userId);
        
        const query = `
            UPDATE users 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING id, username, email, first_name, last_name, role, updated_at, image, line_user_id
        `;
        
        const result = await pool.query(query, params);
        const user = result.rows[0];
        // Convert binary image data to base64
        return {
            ...user,
            image: user.image ? user.image.toString('base64') : null
        };
    }

    //Delete user
    static async deleteUser(userId) {
        const query = `
            DELETE FROM users WHERE id = $1
            RETURNING id, username, email
        `;
        const result = await pool.query(query, [userId]);
        return result.rows[0];
    }

    //Get all users
    static async getAllUsers() {
        const query = `
            SELECT id, username, email, first_name, last_name, role, created_at FROM users
        `;
        const result = await pool.query(query);
        return result.rows;
    }
}

module.exports = UserModel;

