const FruitModel = require('../model/fruitModel');
const CategoryModel = require('../model/categoryModel');
const FruitCalculationService = require('../services/fruitCalculationService');

class FruitController {
    // Get all fruits
    static async getAllFruits(req, res) {
        try {
            const { category } = req.query;
            
            let fruits;
            if (category) {
                // Filter by category name
                fruits = await FruitModel.getFruitsByCategoryName(category);
            } else {
                // Get all fruits
                fruits = await FruitModel.getAllFruits();
            }
            
            res.status(200).json({
                success: true,
                message: 'Fruits fetched successfully',
                data: { fruits }
            });
        } catch (error) {
            console.error('Get all fruits error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Get fruit by ID
    static async getFruitById(req, res) {
        try {
            const { id } = req.params;
            const fruit = await FruitModel.getFruitById(id);
            
            if (!fruit) {
                return res.status(404).json({
                    success: false,
                    message: 'Fruit not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Fruit fetched successfully',
                data: { fruit }
            });
        } catch (error) {
            console.error('Get fruit by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Create new fruit (admin only)
    static async createFruit(req, res) {
        try {
            const { name, description, price, stock, image, category_id } = req.body;

            // Validation
            if (!name || !price) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and price are required'
                });
            }

            // Validate price is a positive number
            if (isNaN(price) || parseFloat(price) < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Price must be a valid positive number'
                });
            }

            // Validate category_id if provided
            if (category_id !== undefined && category_id !== null) {
                const category = await CategoryModel.getCategoryById(category_id);
                if (!category) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid category_id. Category does not exist'
                    });
                }
            }

            // Check if fruit with same name already exists
            const existingFruit = await FruitModel.getFruitByName(name);
            if (existingFruit) {
                return res.status(409).json({
                    success: false,
                    message: 'Fruit with this name already exists'
                });
            }

            // Create fruit (unit comes from category, not fruit)
            const fruitData = {
                name,
                description: description || null,
                price: parseFloat(price),
                stock: stock !== undefined && stock !== null ? parseFloat(stock) : 0, // Stock in unit from category
                image: image || null,
                category_id: category_id || null
            };

            const fruit = await FruitModel.createFruit(fruitData);
            
            // Get fruit with category name
            const fruitWithCategory = await FruitModel.getFruitById(fruit.id);

            res.status(201).json({
                success: true,
                message: 'Fruit created successfully',
                data: { fruit: fruitWithCategory }
            });
        } catch (error) {
            console.error('Create fruit error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Update fruit (admin only)
    static async updateFruit(req, res) {
        try {
            const { id } = req.params;
            const { name, description, price, stock, image, category_id } = req.body;

            // Check if fruit exists
            const existingFruit = await FruitModel.getFruitById(id);
            if (!existingFruit) {
                return res.status(404).json({
                    success: false,
                    message: 'Fruit not found'
                });
            }

            // Validation - at least one field should be provided
            if (!name && !description && !price && stock === undefined && !image && category_id === undefined) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one field must be provided for update'
                });
            }

            // Validate price if provided
            if (price !== undefined && (isNaN(price) || parseFloat(price) < 0)) {
                return res.status(400).json({
                    success: false,
                    message: 'Price must be a valid positive number'
                });
            }

            // Validate category_id if provided
            if (category_id !== undefined && category_id !== null) {
                const category = await CategoryModel.getCategoryById(category_id);
                if (!category) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid category_id. Category does not exist'
                    });
                }
            }

            // Check if name is being changed and if new name already exists
            if (name && name !== existingFruit.name) {
                const fruitWithSameName = await FruitModel.getFruitByName(name);
                if (fruitWithSameName) {
                    return res.status(409).json({
                        success: false,
                        message: 'Fruit with this name already exists'
                    });
                }
            }

            // Validate stock if provided (must be >= 0, can be decimal for weight in kg or integer for pieces)
            if (stock !== undefined && (isNaN(stock) || parseFloat(stock) < 0)) {
                return res.status(400).json({
                    success: false,
                    message: 'Stock must be a valid number >= 0'
                });
            }

            // Prepare update data (use existing values if not provided)
            // Note: unit comes from category, not fruit
            const fruitData = {
                name: name || existingFruit.name,
                description: description !== undefined ? description : existingFruit.description,
                price: price !== undefined ? parseFloat(price) : existingFruit.price,
                stock: stock !== undefined ? parseFloat(stock) : existingFruit.stock, // Stock in unit from category
                image: image !== undefined ? image : existingFruit.image,
                category_id: category_id !== undefined ? category_id : existingFruit.category_id
            };

            await FruitModel.updateFruit(id, fruitData);
            
            // Get updated fruit with category name
            const updatedFruit = await FruitModel.getFruitById(id);

            res.status(200).json({
                success: true,
                message: 'Fruit updated successfully',
                data: { fruit: updatedFruit }
            });
        } catch (error) {
            console.error('Update fruit error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Delete fruit (admin only)
    static async deleteFruit(req, res) {
        try {
            const { id } = req.params;

            // Check if fruit exists
            const existingFruit = await FruitModel.getFruitById(id);
            if (!existingFruit) {
                return res.status(404).json({
                    success: false,
                    message: 'Fruit not found'
                });
            }

            // Delete fruit
            const deletedFruit = await FruitModel.deleteFruit(id);

            res.status(200).json({
                success: true,
                message: 'Fruit deleted successfully',
                data: { fruit: deletedFruit }
            });
        } catch (error) {
            console.error('Delete fruit error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    //calculate the total price of the fruits when user add to cart
    static async calculateTotalPrice(req, res) {
        try {
            const { fruit_id, weight } = req.body;
            const totalPrice = await FruitCalculationService.calculateTotalPrice(fruit_id, weight);
            res.status(200).json({
                success: true,
                message: 'Total price calculated successfully',
                data: { totalPrice }
            });
        } catch (error) {
            console.error('Calculate total price error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    static async calculatePopularFruit(req, res) {
        try {
            const popularFruit = await FruitCalculationService.calculatePopularFruit();
            res.status(200).json({
                success: true,
                message: 'Popular fruit calculated successfully',
                data: { popularFruit }
            });
        }
        catch (error) {
            console.error('Calculate popular fruit error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
}

module.exports = FruitController;