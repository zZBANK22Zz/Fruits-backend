const express = require('express');
const router = express.Router();
const CategoryController = require('../controller/categoryController');
const { requireAdmin } = require('../middleware/adminMiddleware');

// Get all categories (public - anyone can view)
router.get('/', CategoryController.getAllCategories);

// Create new category (admin only)
router.post('/', requireAdmin, CategoryController.createCategory);

// Get category by ID (public - anyone can view)
router.get('/:id', CategoryController.getCategoryById);

module.exports = router;

