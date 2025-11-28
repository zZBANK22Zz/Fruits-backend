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
            const { username, email, password, first_name, last_name } = req.body;
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

            // Hash password if provided
            let hashedPassword = existingUser.password; // Keep existing password if not provided
            if (password) {
                hashedPassword = await AuthService.hashPassword(password);
            }

            // Update user
            const updatedUser = await UserModel.editUser(userId, {
                username,
                email,
                password: hashedPassword,
                first_name: first_name !== undefined ? first_name : existingUser.first_name,
                last_name: last_name !== undefined ? last_name : existingUser.last_name
            });

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

