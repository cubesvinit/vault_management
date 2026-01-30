const jwt = require('jsonwebtoken');

const { User, Device } = require('../config/db');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: 0,
            message: 'Access token required'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', async (err, user) => {
        if (err) {
            return res.status(403).json({
                success: 0,
                message: 'Invalid or expired token'
            });
        }

        try {
            const deviceSession = await Device.findOne({ where: { device_token: token } });
            if (!deviceSession) {
                return res.status(401).json({
                    success: 0,
                    message: 'Session expired or logged out. Please login again.'
                });
            }
            req.activeToken = deviceSession; // Attach session record to request

            const dbUser = await User.findByPk(user.id);
            if (!dbUser) {
                return res.status(404).json({
                    success: 0,
                    message: 'User no longer exists'
                });
            }

            if (dbUser.is_deleted) {
                return res.status(403).json({
                    success: 0,
                    message: 'User account has been deleted'
                });
            }

            if (dbUser.is_blocked) {
                return res.status(403).json({
                    success: 0,
                    message: 'User account is blocked'
                });
            }

            req.user = dbUser; // Attach DB user
            next();
        } catch (dbError) {
            console.error('Auth verification error:', dbError);
            return res.status(500).json({
                success: 0,
                message: 'Internal server error during authentication'
            });
        }
    });
};

const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: 0,
                message: 'Unauthorized'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: 0,
                message: 'Access denied'
            });
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRoles
};