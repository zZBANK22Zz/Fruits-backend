const express = require('express');
const router = express.Router();
const UserController = require('../controller/userController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

// Get current user profile (authenticated users)
router.get('/profile', authMiddleware, UserController.getProfile);

// Get all users (admin only)
router.get('/', requireAdmin, UserController.getAllUsers);

// Update user role (admin only)
router.put('/:userId/role', requireAdmin, UserController.updateUserRole);

// Edit user (users can edit their own profile, admins can edit anyone)
router.put('/:userId', authMiddleware, UserController.editUser);

// Delete user (users can delete their own account, admins can delete anyone)
router.delete('/:userId', authMiddleware, UserController.deleteUser);

module.exports = router;

