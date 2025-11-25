const authMiddleware = require('./authMiddleware');

// Admin middleware - must be used after authMiddleware
const adminMiddleware = (req, res, next) => {
    try {
        // Check if user is authenticated (authMiddleware should have set req.user)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Check if user has admin role
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error checking admin privileges',
            error: error.message
        });
    }
};

// Combined middleware: authentication + admin check
const requireAdmin = [authMiddleware, adminMiddleware];

module.exports = { adminMiddleware, requireAdmin };

