import { verifyAccessToken } from '../utils/jwt.js';
/**
 * Middleware to verify JWT token and protect routes
 */
export function authMiddleware(req, res, next) {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'No token provided',
            });
            return;
        }
        // Extract token (remove "Bearer " prefix)
        const token = authHeader.substring(7);
        // Verify token
        const decoded = verifyAccessToken(token);
        // Attach user info to request
        req.user = decoded;
        // Continue to next middleware/route
        next();
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: error instanceof Error ? error.message : 'Invalid token',
        });
    }
}
/**
 * Middleware to check if user has specific role
 */
export function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
            });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
            });
            return;
        }
        next();
    };
}
