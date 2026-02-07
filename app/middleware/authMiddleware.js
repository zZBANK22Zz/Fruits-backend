const AuthService = require('../services/authService');

const authMiddleware = (req, res, next) => {
    try {
        // Get token from header or query param
        let token = null;
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided. Authorization header must be: Bearer <token> or use query param: ?token=<token>'
            });
        }

        // Verify token
        const decoded = AuthService.verifyToken(token);
        
        // Attach user info to request
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
            error: error.message
        });
    }
};

module.exports = authMiddleware;

