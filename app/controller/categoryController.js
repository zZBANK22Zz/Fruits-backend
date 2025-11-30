const CategoryModel = require('../model/categoryModel');

class CategoryController {
    // Get all categories
    static async getAllCategories(req, res) {
        try {
            const categories = await CategoryModel.getAllCategories();
            res.status(200).json({
                success: true,
                message: 'Categories fetched successfully',
                data: { categories }
            });
        } catch (error) {
            console.error('Get all categories error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Get category by ID
    static async getCategoryById(req, res) {
        try {
            const { id } = req.params;
            const category = await CategoryModel.getCategoryById(id);
            
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Category fetched successfully',
                data: { category }
            });
        } catch (error) {
            console.error('Get category by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Create new category (admin only)
    static async createCategory(req, res) {
        try {
            const { name } = req.body;

            // Validation
            if (!name || name.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Category name is required'
                });
            }

            // Check if category with same name already exists
            const existingCategory = await CategoryModel.getCategoryByName(name.trim());
            if (existingCategory) {
                return res.status(409).json({
                    success: false,
                    message: 'Category with this name already exists'
                });
            }

            // Create category
            const category = await CategoryModel.createCategory(name.trim());

            res.status(201).json({
                success: true,
                message: 'Category created successfully',
                data: { category }
            });
        } catch (error) {
            console.error('Create category error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
}

module.exports = CategoryController;

