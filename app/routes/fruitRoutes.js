const express = require('express');
const router = express.Router();
const FruitController = require('../controller/fruitController');
const { requireAdmin } = require('../middleware/adminMiddleware');

// Get all fruits (public - anyone can view)
router.get('/', FruitController.getAllFruits);

// Calculate the popular fruit from order_items table (must come before /:id route)
router.get('/popular-fruit', FruitController.calculatePopularFruit);

// Calculate the total price of the fruits when user add to cart
router.post('/calculate-total-price', FruitController.calculateTotalPrice);

// Get fruit by ID (public - anyone can view) - must come after specific routes
router.get('/:id', FruitController.getFruitById);

// Create new fruit (admin only)
router.post('/', requireAdmin, FruitController.createFruit);

// Update fruit (admin only)
router.put('/:id', requireAdmin, FruitController.updateFruit);

// Delete fruit (admin only)
router.delete('/:id', requireAdmin, FruitController.deleteFruit);

module.exports = router;

