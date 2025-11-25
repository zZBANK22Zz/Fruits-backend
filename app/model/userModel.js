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

    // Find user by ID
    static async findById(id) {
        const query = 'SELECT id, username, email, role, created_at FROM users WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    // Create new user
    static async create(userData) {
        const { username, email, password, role = 'user' } = userData;
        const query = `
            INSERT INTO users (username, email, password, role)
            VALUES ($1, $2, $3, $4)
            RETURNING id, username, email, role, created_at
        `;
        const result = await pool.query(query, [username, email, password, role]);
        return result.rows[0];
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
        const { username, email, password } = userData;
        const query = `
            UPDATE users 
            SET username = $1, email = $2, password = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING id, username, email, role, updated_at
        `;
        const result = await pool.query(query, [username, email, password, userId]);
        return result.rows[0];
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
            SELECT id, username, email, role, created_at FROM users
        `;
        const result = await pool.query(query);
        return result.rows;
    }
}

module.exports = UserModel;

