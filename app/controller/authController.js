const UserModel = require('../model/userModel');
const AuthService = require('../services/authService');

class AuthController {
    // Register new user
    static async register(req, res) {
        try {
            const { username, email, password, first_name, last_name } = req.body;

            // Validation
            if (!username || !email || !password || !first_name || !last_name) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide username, email, password, first_name, and last_name'
                });
            }

            // Check if user already exists
            const existingUserByEmail = await UserModel.findByEmail(email);
            if (existingUserByEmail) {
                return res.status(409).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            }

            const existingUserByUsername = await UserModel.findByUsername(username);
            if (existingUserByUsername) {
                return res.status(409).json({
                    success: false,
                    message: 'Username already taken'
                });
            }

            // Hash password
            const hashedPassword = await AuthService.hashPassword(password);

            // Create user
            const user = await UserModel.create({
                username,
                email,
                password: hashedPassword,
                first_name,
                last_name
            });

            // Generate token
            const token = AuthService.generateToken(user);

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        role: user.role
                    },
                    token
                }
            });
        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Login user
    static async login(req, res) {
        try {
            const { email, password } = req.body;

            // Validation
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide email and password'
                });
            }

            // Find user by email
            const user = await UserModel.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Verify password
            const isPasswordValid = await AuthService.comparePassword(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Generate token
            const token = AuthService.generateToken(user);

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        role: user.role
                    },
                    token
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
}

module.exports = AuthController;

