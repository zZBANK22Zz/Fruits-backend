const UserModel = require('../model/userModel');
const AuthService = require('../services/authService');
const LineLoginService = require('../services/lineLoginService');
const crypto = require('crypto');

class LineLoginController {
    /**
     * Initiate LINE Login - redirects user to LINE authorization page
     * GET /api/auth/line/login
     */
    static async initiateLogin(req, res) {
        try {
            // Generate state parameter for CSRF protection
            const state = crypto.randomBytes(32).toString('hex');
            
            // Store state in session or return it to client to verify on callback
            // For stateless API, we'll return state to client and they should send it back
            const authUrl = LineLoginService.getAuthorizationUrl(state);

            res.json({
                success: true,
                message: 'LINE Login authorization URL generated',
                data: {
                    auth_url: authUrl,
                    state: state // Client should store this and verify on callback
                }
            });
        } catch (error) {
            console.error('LINE Login initiation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to initiate LINE Login',
                error: error.message
            });
        }
    }

    /**
     * Verify LINE ID Token (from LIFF)
     * POST /api/auth/line/verify
     * Body: { idToken: string }
     */
    static async verifyLineToken(req, res) {
        try {
            const { idToken } = req.body;

            if (!idToken) {
                return res.status(400).json({
                    success: false,
                    message: 'ID Token is required'
                });
            }

            // Verify ID token with LINE's servers
            const decodedToken = await LineLoginService.verifyIdToken(idToken);

            // Extract user info from decoded token
            // sub: LINE user ID, name: display name, picture: profile image, email: email
            const { sub: line_user_id, name: display_name, picture: picture_url, email } = decodedToken;

            // Check if user already exists with this LINE user ID
            let user = await UserModel.findByLineUserId(line_user_id);

            if (user) {
                // Existing LINE user - login
                const fullUser = await UserModel.findById(user.id);
                const token = AuthService.generateToken(user);

                return res.json({
                    success: true,
                    message: 'LINE Login successful',
                    data: {
                        user: {
                            id: fullUser.id,
                            username: fullUser.username,
                            email: fullUser.email,
                            first_name: fullUser.first_name,
                            last_name: fullUser.last_name,
                            role: fullUser.role,
                            image: fullUser.image,
                            line_user_id: fullUser.line_user_id
                        },
                        token
                    }
                });
            }

            // New LINE user - create account
            // Generate username from display name or email
            let username = (display_name || 'line_user').toLowerCase().replace(/\s+/g, '_');
            if (email) {
                username = email.split('@')[0];
            }
            
            // Ensure username is unique
            let finalUsername = username;
            let counter = 1;
            while (await UserModel.findByUsername(finalUsername)) {
                finalUsername = `${username}_${counter}`;
                counter++;
            }

            // Extract first and last name from display name
            const displayNameStr = display_name || 'LINE User';
            const nameParts = displayNameStr.trim().split(/\s+/);
            const first_name = nameParts[0] || displayNameStr;
            const last_name = nameParts.slice(1).join(' ') || '';

            // Create user account
            user = await UserModel.create({
                username: finalUsername,
                email: email || `${line_user_id}@line.local`, 
                password: null, 
                first_name,
                last_name,
                role: 'user',
                line_user_id,
                image: picture_url || null
            });

            // Get full user data
            const fullUser = await UserModel.findById(user.id);
            const token = AuthService.generateToken(user);

            res.status(201).json({
                success: true,
                message: 'LINE account created and logged in successfully',
                data: {
                    user: {
                        id: fullUser.id,
                        username: fullUser.username,
                        email: fullUser.email,
                        first_name: fullUser.first_name,
                        last_name: fullUser.last_name,
                        role: fullUser.role,
                        image: fullUser.image,
                        line_user_id: fullUser.line_user_id
                    },
                    token
                }
            });
        } catch (error) {
            console.error('LINE token verification error:', error);
            res.status(401).json({
                success: false,
                message: 'LINE token verification failed',
                error: error.message
            });
        }
    }

    /**
     * Handle LINE Login callback
     * POST /api/auth/line/callback
     * Body: { code: string, state: string }
     */
    static async handleCallback(req, res) {
        try {
            const { code, state } = req.body;

            if (!code) {
                return res.status(400).json({
                    success: false,
                    message: 'Authorization code is required'
                });
            }

            // Exchange code for access token and user profile
            const lineUserData = await LineLoginService.exchangeCodeForToken(code);

            const { line_user_id, display_name, picture_url, email } = lineUserData;

            // Check if user already exists with this LINE user ID
            let user = await UserModel.findByLineUserId(line_user_id);

            if (user) {
                // Existing LINE user - login
                const fullUser = await UserModel.findById(user.id);
                const token = AuthService.generateToken(user);

                return res.json({
                    success: true,
                    message: 'LINE Login successful',
                    data: {
                        user: {
                            id: fullUser.id,
                            username: fullUser.username,
                            email: fullUser.email,
                            first_name: fullUser.first_name,
                            last_name: fullUser.last_name,
                            role: fullUser.role,
                            image: fullUser.image,
                            line_user_id: fullUser.line_user_id
                        },
                        token
                    }
                });
            }

            // New LINE user - create account
            // Generate username from display name or email
            let username = display_name.toLowerCase().replace(/\s+/g, '_');
            if (email) {
                username = email.split('@')[0];
            }
            
            // Ensure username is unique
            let finalUsername = username;
            let counter = 1;
            while (await UserModel.findByUsername(finalUsername)) {
                finalUsername = `${username}_${counter}`;
                counter++;
            }

            // Extract first and last name from display name
            const nameParts = display_name.trim().split(/\s+/);
            const first_name = nameParts[0] || display_name;
            const last_name = nameParts.slice(1).join(' ') || '';

            // Create user account
            user = await UserModel.create({
                username: finalUsername,
                email: email || `${line_user_id}@line.local`, // Use LINE user ID if no email
                password: null, // LINE users don't have passwords
                first_name,
                last_name,
                role: 'user',
                line_user_id
            });

            // Get full user data
            const fullUser = await UserModel.findById(user.id);
            const token = AuthService.generateToken(user);

            res.status(201).json({
                success: true,
                message: 'LINE account created and logged in successfully',
                data: {
                    user: {
                        id: fullUser.id,
                        username: fullUser.username,
                        email: fullUser.email,
                        first_name: fullUser.first_name,
                        last_name: fullUser.last_name,
                        role: fullUser.role,
                        image: fullUser.image,
                        line_user_id: fullUser.line_user_id
                    },
                    token
                }
            });
        } catch (error) {
            console.error('LINE Login callback error:', error);
            res.status(500).json({
                success: false,
                message: 'LINE Login failed',
                error: error.message
            });
        }
    }

    /**
     * Link existing account with LINE
     * POST /api/auth/line/link
     * Requires authentication - user must be logged in
     */
    static async linkAccount(req, res) {
        try {
            const userId = req.user.id;
            const { code } = req.body;

            if (!code) {
                return res.status(400).json({
                    success: false,
                    message: 'Authorization code is required'
                });
            }

            // Exchange code for LINE user data
            const lineUserData = await LineLoginService.exchangeCodeForToken(code);
            const { line_user_id } = lineUserData;

            // Check if LINE user ID is already linked to another account
            const existingLineUser = await UserModel.findByLineUserId(line_user_id);
            if (existingLineUser && existingLineUser.id !== userId) {
                return res.status(409).json({
                    success: false,
                    message: 'This LINE account is already linked to another user'
                });
            }

            // Update user account with LINE user ID
            const updatedUser = await UserModel.editUser(userId, {
                line_user_id
            });

            res.json({
                success: true,
                message: 'LINE account linked successfully',
                data: {
                    user: {
                        id: updatedUser.id,
                        username: updatedUser.username,
                        email: updatedUser.email,
                        first_name: updatedUser.first_name,
                        last_name: updatedUser.last_name,
                        role: updatedUser.role,
                        line_user_id: updatedUser.line_user_id
                    }
                }
            });
        } catch (error) {
            console.error('LINE account linking error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to link LINE account',
                error: error.message
            });
        }
    }
}

module.exports = LineLoginController;

