const pool = require('../config/database');

class FruitModel {
    //Get all fruits with category name
    static async getAllFruits() {
        const query = `
            SELECT 
                f.id,
                f.name,
                f.description,
                f.price,
                f.stock,
                f.image_url,
                f.category_id,
                c.name as category_name,
                f.created_at,
                f.updated_at
            FROM fruits f
            LEFT JOIN categories c ON f.category_id = c.id
            ORDER BY f.id
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    //Get fruit by id with category name
    static async getFruitById(id) {
        const query = `
            SELECT 
                f.id,
                f.name,
                f.description,
                f.price,
                f.stock,
                f.image_url,
                f.category_id,
                c.name as category_name,
                f.created_at,
                f.updated_at
            FROM fruits f
            LEFT JOIN categories c ON f.category_id = c.id
            WHERE f.id = $1
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    //Get fruit by name
    static async getFruitByName(name) {
        const query = 'SELECT * from fruits where name = $1';
        const result = await pool.query(query, [name]);
        return result.rows[0];
    }

    //Create new fruit
    static async createFruit(fruitData) {
        const { name, description, price, stock, image_url, category_id } = fruitData;
        const query = `
            INSERT INTO fruits (name, description, price, stock, image_url, category_id) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *
        `;
        const result = await pool.query(query, [name, description, price, stock, image_url, category_id]);
        return result.rows[0];
    }

    //Update fruit
    static async updateFruit(id, fruitData) {
        const { name, description, price, stock, image_url, category_id } = fruitData;
        const query = `
            UPDATE fruits 
            SET name = $1, description = $2, price = $3, stock = $4, image_url = $5, category_id = $6, updated_at = CURRENT_TIMESTAMP
            WHERE id = $7 
            RETURNING *
        `;
        const result = await pool.query(query, [name, description, price, stock, image_url, category_id, id]);
        return result.rows[0];
    }


    //Delete fruit
    static async deleteFruit(id) {
        const query = 'DELETE FROM fruits WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }
}

module.exports = FruitModel;