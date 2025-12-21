const pool = require('../config/database');

class CategoryModel {
    // Get all categories
    static async getAllCategories() {
        const query = 'SELECT * FROM categories ORDER BY name';
        const result = await pool.query(query);
        return result.rows;
    }

    // Get category by ID
    static async getCategoryById(id) {
        const query = 'SELECT * FROM categories WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    // Get category by name
    static async getCategoryByName(name) {
        const query = 'SELECT * FROM categories WHERE name = $1';
        const result = await pool.query(query, [name]);
        return result.rows[0];
    }

    // Create new category
    static async createCategory(name, unit = 'kg') {
        const query = 'INSERT INTO categories (name, unit) VALUES ($1, $2) RETURNING *';
        const result = await pool.query(query, [name, unit]);
        return result.rows[0];
    }

    // Update category
    static async updateCategory(id, name, unit) {
        if (unit !== undefined) {
            const query = 'UPDATE categories SET name = $1, unit = $2 WHERE id = $3 RETURNING *';
            const result = await pool.query(query, [name, unit, id]);
            return result.rows[0];
        } else {
            const query = 'UPDATE categories SET name = $1 WHERE id = $2 RETURNING *';
            const result = await pool.query(query, [name, id]);
            return result.rows[0];
        }
    }

    // Delete category
    static async deleteCategory(id) {
        const query = 'DELETE FROM categories WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }
}

module.exports = CategoryModel;

