const { body, validationResult } = require('express-validator');

const verifyOtpValidators = [
    body('phone_number')
        .notEmpty()
        .withMessage('Phone number is required')
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    body('otp_code')
        .notEmpty()
        .withMessage('OTP code is required')
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage('OTP code must be 6 digits')
];

const validateVerifyOtp = [
    ...verifyOtpValidators,
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        next();
    }
];

module.exports = {
    validateVerifyOtp
};