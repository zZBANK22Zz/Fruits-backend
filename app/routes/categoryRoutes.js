const express = require('express');
const router = express.Router();
const CategoryController = require('../controller/categoryController');

// Get all categories (public - anyone can view)
router.get('/', CategoryController.getAllCategories);

// Get category by ID (public - anyone can view)
router.get('/:id', CategoryController.getCategoryById);

module.exports = router;

