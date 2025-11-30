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
                f.image,
                f.category_id,
                c.name as category_name,
                f.created_at,
                f.updated_at
            FROM fruits f
            LEFT JOIN categories c ON f.category_id = c.id
            ORDER BY f.id
        `;
        const result = await pool.query(query);
        // Convert binary image data to base64
        return result.rows.map(fruit => ({
            ...fruit,
            image: fruit.image ? fruit.image.toString('base64') : null
        }));
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
                f.image,
                f.category_id,
                c.name as category_name,
                f.created_at,
                f.updated_at
            FROM fruits f
            LEFT JOIN categories c ON f.category_id = c.id
            WHERE f.id = $1
        `;
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) return null;
        const fruit = result.rows[0];
        // Convert binary image data to base64
        return {
            ...fruit,
            image: fruit.image ? fruit.image.toString('base64') : null
        };
    }

    //Get fruit by name
    static async getFruitByName(name) {
        const query = 'SELECT * from fruits where name = $1';
        const result = await pool.query(query, [name]);
        return result.rows[0];
    }

    //Get fruits by category name
    static async getFruitsByCategoryName(categoryName) {
        const query = `
            SELECT 
                f.id,
                f.name,
                f.description,
                f.price,
                f.stock,
                f.image,
                f.category_id,
                c.name as category_name,
                f.created_at,
                f.updated_at
            FROM fruits f
            LEFT JOIN categories c ON f.category_id = c.id
            WHERE c.name = $1
            ORDER BY f.id
        `;
        const result = await pool.query(query, [categoryName]);
        // Convert binary image data to base64
        return result.rows.map(fruit => ({
            ...fruit,
            image: fruit.image ? fruit.image.toString('base64') : null
        }));
    }

    //Create new fruit
    static async createFruit(fruitData) {
        const { name, description, price, stock, image, category_id } = fruitData;
        // Convert base64 image string to Buffer if provided
        const imageBuffer = image ? Buffer.from(image, 'base64') : null;
        const query = `
            INSERT INTO fruits (name, description, price, stock, image, category_id) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *
        `;
        const result = await pool.query(query, [name, description, price, stock, imageBuffer, category_id]);
        const fruit = result.rows[0];
        // Convert binary image data to base64
        return {
            ...fruit,
            image: fruit.image ? fruit.image.toString('base64') : null
        };
    }

    //Update fruit
    static async updateFruit(id, fruitData) {
        const { name, description, price, stock, image, category_id } = fruitData;
        // Convert base64 image string to Buffer if provided
        const imageBuffer = image ? Buffer.from(image, 'base64') : null;
        const query = `
            UPDATE fruits 
            SET name = $1, description = $2, price = $3, stock = $4, image = $5, category_id = $6, updated_at = CURRENT_TIMESTAMP
            WHERE id = $7 
            RETURNING *
        `;
        const result = await pool.query(query, [name, description, price, stock, imageBuffer, category_id, id]);
        const fruit = result.rows[0];
        // Convert binary image data to base64
        return {
            ...fruit,
            image: fruit.image ? fruit.image.toString('base64') : null
        };
    }


    //Delete fruit
    static async deleteFruit(id) {
        const query = 'DELETE FROM fruits WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    // Reduce stock (when order is confirmed)
    static async reduceStock(fruitId, quantity) {
        const query = `
            UPDATE fruits 
            SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND stock >= $1
            RETURNING *
        `;
        const result = await pool.query(query, [quantity, fruitId]);
        return result.rows[0];
    }

    // Restore stock (when order is cancelled)
    static async restoreStock(fruitId, quantity) {
        const query = `
            UPDATE fruits 
            SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
        const result = await pool.query(query, [quantity, fruitId]);
        return result.rows[0];
    }

    // Check stock availability
    static async checkStock(fruitId, quantity) {
        const query = 'SELECT stock FROM fruits WHERE id = $1';
        const result = await pool.query(query, [fruitId]);
        if (result.rows.length === 0) return null;
        return result.rows[0].stock >= quantity;
    }
}

module.exports = FruitModel;