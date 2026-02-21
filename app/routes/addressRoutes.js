const express = require('express');
const router = express.Router();
const AddressController = require('../controller/addressController');
const verifyToken = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// Create new address
router.post('/', AddressController.createAddress);

// Get user's addresses
router.get('/', AddressController.getMyAddresses);

// Update address
router.put('/:id', AddressController.updateAddress);

// Delete address
router.delete('/:id', AddressController.deleteAddress);

module.exports = router;
