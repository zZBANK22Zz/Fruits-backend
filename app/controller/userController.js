const UserModel = require('../model/userModel');
const AuthService = require('../services/authService');

class UserController {
    // Get current user profile
    static async getProfile(req, res) {
        try {
            const userId = req.user.id;
            const user = await UserModel.findById(userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.status(200).json({
                success: true,
                data: { user }
            });
        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    // Update user role (admin only)
    static async updateUserRole(req, res) {
        try {
            const { userId } = req.params;
            const { role } = req.body;

            // Validation
            if (!role || !['user', 'admin'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role. Role must be either "user" or "admin"'
                });
            }

            // Check if user exists
            const user = await UserModel.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Update role
            const updatedUser = await UserModel.updateRole(userId, role);

            res.status(200).json({
                success: true,
                message: 'User role updated successfully',
                data: { user: updatedUser }
            });
        } catch (error) {
            console.error('Update role error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    //Edit user
    static async editUser(req, res) {
        try {
            const { userId } = req.params;
            const { username, email, password, first_name, last_name, image } = req.body;
            const currentUserId = req.user.id;
            const currentUserRole = req.user.role;

            // Check if user exists
            const existingUser = await UserModel.findById(userId);
            if (!existingUser) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Authorization: Users can only edit their own profile, admins can edit anyone
            if (currentUserRole !== 'admin' && currentUserId !== parseInt(userId)) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only edit your own profile'
                });
            }

            // Validation
            if (!username || !email) {
                return res.status(400).json({
                    success: false,
                    message: 'Username and email are required'
                });
            }

            // Check if email is already taken by another user
            const emailUser = await UserModel.findByEmail(email);
            if (emailUser && emailUser.id !== parseInt(userId)) {
                return res.status(409).json({
                    success: false,
                    message: 'Email already taken by another user'
                });
            }

            // Check if username is already taken by another user
            const usernameUser = await UserModel.findByUsername(username);
            if (usernameUser && usernameUser.id !== parseInt(userId)) {
                return res.status(409).json({
                    success: false,
                    message: 'Username already taken by another user'
                });
            }

            // Hash password if provided, otherwise don't include it in update
            let hashedPassword = undefined;
            if (password && password.trim() !== '') {
                hashedPassword = await AuthService.hashPassword(password);
            }

            // Convert base64 image to Buffer if provided
            let imageBuffer = undefined;
            if (image !== undefined) {
                if (image === null || image === '') {
                    // User wants to remove image
                    imageBuffer = null;
                } else if (typeof image === 'string') {
                    // Convert base64 string to Buffer
                    try {
                        imageBuffer = Buffer.from(image, 'base64');
                    } catch (err) {
                        return res.status(400).json({
                            success: false,
                            message: 'Invalid image format. Please provide a valid base64 encoded image.'
                        });
                    }
                }
            }

            // Prepare update data - only include fields that are provided
            const updateData = {};
            
            // Username and email are required for validation, but only update if provided
            if (username !== undefined) {
                updateData.username = username;
            } else {
                updateData.username = existingUser.username; // Use existing for validation
            }
            
            if (email !== undefined) {
                updateData.email = email;
            } else {
                updateData.email = existingUser.email; // Use existing for validation
            }
            
            // Only include password if provided
            if (hashedPassword !== undefined) {
                updateData.password = hashedPassword;
            }
            
            // Only include first_name if provided
            if (first_name !== undefined) {
                updateData.first_name = first_name;
            }
            
            // Only include last_name if provided
            if (last_name !== undefined) {
                updateData.last_name = last_name;
            }
            
            // Only include image if provided
            if (imageBuffer !== undefined) {
                updateData.image = imageBuffer;
            }

            // Update user
            const updatedUser = await UserModel.editUser(userId, updateData);

            res.status(200).json({
                success: true,
                message: 'User updated successfully',
                data: { user: updatedUser }
            });
        } catch (error) {
            console.error('Edit user error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    //Delete user
    static async deleteUser(req, res) {
        try {
            const { userId } = req.params;
            const currentUserId = req.user.id;
            const currentUserRole = req.user.role;

            // Check if user exists
            const existingUser = await UserModel.findById(userId);
            if (!existingUser) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Authorization: Users can only delete their own account, admins can delete anyone
            if (currentUserRole !== 'admin' && currentUserId !== parseInt(userId)) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only delete your own account'
                });
            }

            // Delete user
            const deletedUser = await UserModel.deleteUser(userId);
            
            res.status(200).json({
                success: true,
                message: 'User deleted successfully',
                data: { user: deletedUser }
            });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    //Get all users
    static async getAllUsers(req, res) {
        try {
            const users = await UserModel.getAllUsers();
            res.status(200).json({
                success: true,
                message: 'Users fetched successfully',
                data: { users }
            });
        } catch (error) {
            console.error('Get all users error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
}

module.exports = UserController;

