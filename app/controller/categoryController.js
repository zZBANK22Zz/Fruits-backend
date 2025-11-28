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
}

module.exports = CategoryController;

