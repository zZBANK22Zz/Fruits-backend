const pool = require('../config/database');

class AddressModel {
    // Create new address
    static async create(addressData) {
        const { user_id, address_line, sub_district, district, province, postal_code, latitude, longitude } = addressData;
        const query = `
            INSERT INTO addresses (user_id, address_line, sub_district, district, province, postal_code, latitude, longitude)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const result = await pool.query(query, [user_id, address_line, sub_district, district, province, postal_code, latitude, longitude]);
        return result.rows[0];
    }

    // Find addresses by user ID
    static async findByUserId(userId) {
        const query = 'SELECT * FROM addresses WHERE user_id = $1 ORDER BY created_at DESC';
        const result = await pool.query(query, [userId]);
        return result.rows;
    }

    // Find latest address for shop owner (dynamic shop location)
    static async findShopAddress(ownerId) {
        const query = 'SELECT * FROM addresses WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1';
        const result = await pool.query(query, [ownerId]);
        return result.rows[0];
    }

    // Find address by ID
    static async findById(id) {
        const query = 'SELECT * FROM addresses WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    // Update address
    static async update(id, addressData) {
        const { address_line, sub_district, district, province, postal_code, latitude, longitude } = addressData;
        const query = `
            UPDATE addresses 
            SET address_line = $1, sub_district = $2, district = $3, province = $4, postal_code = $5, latitude = $6, longitude = $7, updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `;
        const result = await pool.query(query, [address_line, sub_district, district, province, postal_code, latitude, longitude, id]);
        return result.rows[0];
    }

    // Delete address
    static async delete(id) {
        const query = 'DELETE FROM addresses WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }
}

module.exports = AddressModel;
