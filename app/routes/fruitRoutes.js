const express = require('express');
const router = express.Router();
const FruitController = require('../controller/fruitController');
const { requireAdmin } = require('../middleware/adminMiddleware');

// Get all fruits (public - anyone can view)
router.get('/', FruitController.getAllFruits);

// Get fruit by ID (public - anyone can view)
router.get('/:id', FruitController.getFruitById);

// Create new fruit (admin only)
router.post('/', requireAdmin, FruitController.createFruit);

// Update fruit (admin only)
router.put('/:id', requireAdmin, FruitController.updateFruit);

// Delete fruit (admin only)
router.delete('/:id', requireAdmin, FruitController.deleteFruit);

// Calculate the total price of the fruits when user add to cart
router.post('/calculate-total-price', FruitController.calculateTotalPrice);

module.exports = router;

