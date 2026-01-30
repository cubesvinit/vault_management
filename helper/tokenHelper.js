const jwt = require('jsonwebtoken');
const { Device } = require('../config/db');

/**
 * Generate a JWT token
 * @param {Object} payload - Data to be encoded in the token
 * @param {string} expiresIn - Token expiration time (default: '24h')
 * @returns {string} - Signed JWT token
 */
const generateToken = (payload, expiresIn = '24h') => {
    return jwt.sign(
        payload,
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn }
    );
};

/**
 * Save or update device token (Upsert logic) to prevent duplicate entries
 * @param {number} userId - ID of the user
 * @param {string} deviceId - Unique device identifier
 * @param {string} deviceType - Type of device (e.g., 'web', 'android', 'ios')
 * @param {string} token - The JWT token to save
 */
const saveToken = async (userId, deviceId, deviceType, token) => {
    try {
        const existingDevice = await Device.findOne({
            where: {
                user_id: userId,
                device_id: deviceId
            }
        });

        if (existingDevice) {
            return await existingDevice.update({
                device_token: token,
                device_type: deviceType,
                updated_at: new Date()
            });
        } else {
            return await Device.create({
                user_id: userId,
                device_id: deviceId,
                device_type: deviceType,
                device_token: token
            });
        }
    } catch (error) {
        console.error('Error saving token:', error);
        throw error;
    }
};

module.exports = { generateToken, saveToken };
