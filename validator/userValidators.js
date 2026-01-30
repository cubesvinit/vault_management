const { body, validationResult } = require('express-validator');

const validateSendLoginOtp = [
    body('phone_number')
        .notEmpty().withMessage('Phone number is required'),
    body('iso_code')
        .notEmpty().withMessage('ISO code is required (e.g., IN, US)'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg
            });
        }
        next();
    }
];

const validateLoginWithOtp = [
    body('phone_number')
        .notEmpty().withMessage('Phone number is required'),
    body('otp_code')
        .notEmpty().withMessage('OTP code is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array()[0].msg
            });
        }
        next();
    }
];

const validateAddNominee = [
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('relation').notEmpty().withMessage('Relation is required'),
    body('phone_number').notEmpty().withMessage('Phone number is required'),
    body('iso_code').notEmpty().withMessage('ISO code is required'),
    body('country_code').notEmpty().withMessage('Country code is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('pincode').notEmpty().withMessage('Pincode is required'),
    body('aadhar_number')
        .notEmpty().withMessage('Aadhar number is required')
        .isLength({ min: 12, max: 12 }).withMessage('Aadhar number must be 12 digits')
        .isNumeric().withMessage('Aadhar number must be numeric'),
    body('phone_number')
        .notEmpty().withMessage('Phone number is required')
        .isNumeric().withMessage('Phone number must be numeric'),
    body('user_id')
        .optional()
        .custom((value, { req }) => {
            if (req.user && req.user.role === 'super_admin' && !value) {
                throw new Error('User ID is required for Super Admin');
            }
            return true;
        }),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: 0, errors: errors.array() });
        }
        next();
    }
];

module.exports = {
    validateSendLoginOtp,
    validateLoginWithOtp,
    validateAddNominee
};

