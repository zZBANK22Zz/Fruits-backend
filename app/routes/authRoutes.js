const express = require('express');
const router = express.Router();
const AuthController = require('../controller/authController');
const LineLoginController = require('../controller/lineLoginController');
const authMiddleware = require('../middleware/authMiddleware');

// Register route
router.post('/register', AuthController.register);

// Login route
router.post('/login', AuthController.login);

// LINE Login routes
router.get('/line/login', LineLoginController.initiateLogin);
router.post('/line/callback', LineLoginController.handleCallback);
router.post('/line/link', authMiddleware, LineLoginController.linkAccount);

module.exports = router;

