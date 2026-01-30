const { body, validationResult } = require('express-validator');
const { normalizePhoneNumber } = require('../helper/phoneHelper');


const superAdminLoginValidators = [
    body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail()
        .toLowerCase(),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
];

const validateSuperAdminLogin = [
    ...superAdminLoginValidators,
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

const changePasswordValidators = [
    body('old_password')
        .notEmpty()
        .withMessage('Old password is required'),

    body('new_password')
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long'),

    body('confirm_password')
        .notEmpty()
        .withMessage('Confirm password is required')
        .custom((value, { req }) => {
            if (value !== req.body.new_password) {
                throw new Error('Confirm password does not match new password');
            }
            return true;
        })
];

const validateChangePassword = [
    ...changePasswordValidators,
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

const validateAddBranchAdmin = [
    body('branch_name')
        .notEmpty()
        .withMessage('branch_name is required'),

    body('full_address')
        .notEmpty()
        .withMessage('full_address is required'),

    body('latitude')
        .optional()
        .isFloat()
        .withMessage('latitude must be a number'),

    body('longitude')
        .optional()
        .isFloat()
        .withMessage('longitude must be a number'),

    body('pincode')
        .optional()
        .isNumeric()
        .withMessage('pincode must be numeric'),

    body('phone_number')
        .notEmpty()
        .withMessage('phone_number is required')
        .isMobilePhone()
        .withMessage('Invalid phone number'),

    body('password')
        .notEmpty()
        .withMessage('password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),

    body('email')
        .optional()
        .isEmail()
        .withMessage('Invalid email address'),

    body('first_name')
        .notEmpty()
        .withMessage('first_name is required'),

    body('last_name')
        .notEmpty()
        .withMessage('last_name is required'),
    body('iso_code')
        .notEmpty()
        .isLength({ min: 1, max: 3 })
        .withMessage('ISO code must be 2 or 3 characters (e.g., US/USA, IN/IND, GB/GBR)'),

    body('country_code')
        .notEmpty(),

    body('vault_small_total')
        .optional()
        .isInt({ min: 0, max: 1000 })
        .withMessage('vault_small_total must be an integer between 0 and 1000'),

    body('vault_small_maintenance')
        .optional()
        .isInt({ min: 0, max: 1000 })
        .withMessage('vault_small_maintenance must be an integer between 0 and 1000'),

    body('vault_medium_total')
        .optional()
        .isInt({ min: 0, max: 1000 })
        .withMessage('vault_medium_total must be an integer between 0 and 1000'),

    body('vault_medium_maintenance')
        .optional()
        .isInt({ min: 0, max: 1000 })
        .withMessage('vault_medium_maintenance must be an integer between 0 and 1000'),

    body('vault_large_total')
        .optional()
        .isInt({ min: 0, max: 1000 })
        .withMessage('vault_large_total must be an integer between 0 and 1000'),

    body('vault_large_maintenance')
        .optional()
        .isInt({ min: 0, max: 1000 })
        .withMessage('vault_large_maintenance must be an integer between 0 and 1000'),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const formattedErrors = {};
            errors.array().forEach(err => {
                formattedErrors[err.path] = err.msg;
            });

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: formattedErrors
            });
        }

        next();
    }
];

const validateUpdateBranch = [
    body('admin_user_id')
        .notEmpty()
        .withMessage('admin_user_id is required')
        .isInt()
        .withMessage('admin_user_id must be an integer'),

    body('branch_name')
        .optional()
        .notEmpty()
        .withMessage('branch_name cannot be empty'),

    body('full_address')
        .optional()
        .notEmpty()
        .withMessage('full_address cannot be empty'),

    body('latitude')
        .optional()
        .isFloat()
        .withMessage('latitude must be a number'),

    body('longitude')
        .optional()
        .isFloat()
        .withMessage('longitude must be a number'),

    body('pincode')
        .optional()
        .isNumeric()
        .withMessage('pincode must be numeric'),

    body('iso_code')
        .optional()
        .isLength({ min: 1, max: 3 })
        .withMessage('ISO code must be 1-3 characters (e.g., US/USA, IN/IND)'),

    body('country_code')
        .optional()
        .isLength({ min: 1, max: 10 })
        .withMessage('Country code must be 1-10 characters'),

    body('status')
        .optional()
        .isIn(['active', 'inactive'])
        .withMessage('status must be active or inactive'),

    body('password')
        .optional()
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),

    body('vault_small_total')
        .optional()
        .isInt({ min: 0, max: 1000 })
        .withMessage('vault_small_total must be an integer between 0 and 1000'),

    body('vault_small_maintenance')
        .optional()
        .isInt({ min: 0, max: 1000 })
        .withMessage('vault_small_maintenance must be an integer between 0 and 1000'),

    body('vault_medium_total')
        .optional()
        .isInt({ min: 0, max: 1000 })
        .withMessage('vault_medium_total must be an integer between 0 and 1000'),

    body('vault_medium_maintenance')
        .optional()
        .isInt({ min: 0, max: 1000 })
        .withMessage('vault_medium_maintenance must be an integer between 0 and 1000'),

    body('vault_large_total')
        .optional()
        .isInt({ min: 0, max: 1000 })
        .withMessage('vault_large_total must be an integer between 0 and 1000'),

    body('vault_large_maintenance')
        .optional()
        .isInt({ min: 0, max: 1000 })
        .withMessage('vault_large_maintenance must be an integer between 0 and 1000'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const formattedErrors = {};
            errors.array().forEach(err => {
                formattedErrors[err.path] = err.msg;
            });
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: formattedErrors
            });
        }
        next();
    }
];

const validateUpdateUser = [
    body('user_id')
        .notEmpty()
        .withMessage('user_id is required')
        .isInt()
        .withMessage('user_id must be a valid integer'),

    body('phone_number')
        .optional()
        .isMobilePhone()
        .withMessage('Invalid phone number format'),

    body('iso_code')
        .optional()
        .isLength({ min: 2, max: 3 })
        .withMessage('ISO code must be 2-3 characters (e.g., IN, IND)'),

    body('first_name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('First name must be 1-100 characters'),

    body('last_name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Last name must be 1-100 characters'),

    body('aadhar_number')
        .optional()
        .isLength({ min: 12, max: 12 })
        .withMessage('Aadhar number must be exactly 12 digits')
        .isNumeric()
        .withMessage('Aadhar number must contain only digits'),

    body('full_address')
        .optional()
        .trim(),

    body('latitude')
        .optional()
        .isFloat()
        .withMessage('Latitude must be a number'),

    body('longitude')
        .optional()
        .isFloat()
        .withMessage('Longitude must be a number'),

    body('pincode')
        .optional()
        .isNumeric()
        .withMessage('Pincode must be numeric'),

    body('status')
        .optional()
        .isIn(['active', 'inactive', 'blocked'])
        .withMessage('Status must be one of: active, inactive, blocked'),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const formattedErrors = {};
            errors.array().forEach(err => {
                formattedErrors[err.path] = err.msg;
            });

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: formattedErrors
            });
        }

        const { phone_number, iso_code } = req.body;

        if (phone_number && iso_code) {
            const phoneValidation = normalizePhoneNumber(phone_number, iso_code);

            if (phoneValidation.status === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: {
                        phone_number: phoneValidation.message
                    }
                });
            }
        } else if (phone_number && !iso_code) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: {
                    iso_code: 'ISO code is required when updating phone number'
                }
            });
        }

        next();
    }
];

const validateDeleteBranch = [
    body('admin_user_id')
        .notEmpty()
        .withMessage('admin_user_id is required')
        .isInt()
        .withMessage('admin_user_id must be an integer'),

    body('deleted_reason')
        .optional()
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('deleted_reason must be between 1 and 500 characters'),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const formattedErrors = {};
            errors.array().forEach(err => {
                formattedErrors[err.path] = err.msg;
            });

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: formattedErrors
            });
        }

        next();
    }
];

const validateDeleteUser = [
    body('user_id')
        .notEmpty()
        .withMessage('user_id is required')
        .isInt()
        .withMessage('user_id must be a valid integer'),

    body('deleted_reason')
        .optional()
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Deleted reason must be 1-500 characters'),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const formattedErrors = {};
            errors.array().forEach(err => {
                formattedErrors[err.path] = err.msg;
            });

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: formattedErrors
            });
        }

        next();
    }
];

const validateBlockUser = [
    body('user_id')
        .notEmpty()
        .withMessage('user_id is required')
        .isInt()
        .withMessage('user_id must be a valid integer'),

    body('blocked_reason')
        .notEmpty()
        .withMessage('blocked_reason is required')
        .trim()
        .isLength({ min: 1, max: 500 })
        .withMessage('Blocked reason must be 1-500 characters'),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const formattedErrors = {};
            errors.array().forEach(err => {
                formattedErrors[err.path] = err.msg;
            });

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: formattedErrors
            });
        }

        next();
    }
];

const validateUnblockUser = [
    body('user_id')
        .notEmpty()
        .withMessage('user_id is required')
        .isInt()
        .withMessage('user_id must be a valid integer'),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const formattedErrors = {};
            errors.array().forEach(err => {
                formattedErrors[err.path] = err.msg;
            });

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: formattedErrors
            });
        }

        next();
    }
];

const validateAddUser = [
    body('phone_number')
        .notEmpty()
        .withMessage('phone_number is required')
        .isMobilePhone()
        .withMessage('Invalid phone number format'),

    body('iso_code')
        .notEmpty()
        .withMessage('ISO code is required')
        .isLength({ min: 2, max: 3 })
        .withMessage('ISO code must be 2-3 characters (e.g., IN, IND)'),

    body('first_name')
        .notEmpty()
        .withMessage('first_name is required')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('First name must be 1-100 characters'),

    body('last_name')
        .notEmpty()
        .withMessage('last_name is required')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Last name must be 1-100 characters'),

    body('aadhar_number')
        .notEmpty()
        .withMessage('aadhar_number is required')
        .isLength({ min: 12, max: 12 })
        .withMessage('Aadhar number must be exactly 12 digits')
        .isNumeric()
        .withMessage('Aadhar number must contain only digits'),

    body('full_address')
        .optional()
        .trim(),

    body('latitude')
        .optional()
        .isFloat()
        .withMessage('Latitude must be a number'),

    body('longitude')
        .optional()
        .isFloat()
        .withMessage('Longitude must be a number'),

    body('pincode')
        .optional()
        .isNumeric()
        .withMessage('Pincode must be numeric'),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const formattedErrors = {};
            errors.array().forEach(err => {
                formattedErrors[err.path] = err.msg;
            });

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: formattedErrors
            });
        }

        const { phone_number, iso_code } = req.body;

        const phoneValidation = normalizePhoneNumber(phone_number, iso_code);

        if (phoneValidation.status === 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: {
                    phone_number: phoneValidation.message
                }
            });
        }

        if (!req.files || !req.files.aadhar_front_image || !req.files.aadhar_back_image) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: {
                    aadhar_front_image: !req.files?.aadhar_front_image ? 'Aadhar front image is required' : undefined,
                    aadhar_back_image: !req.files?.aadhar_back_image ? 'Aadhar back image is required' : undefined
                }
            });
        }

        next();
    }
];

const validateUpdateVaultPricing = [
    body('pricing')
        .isArray({ min: 1, max: 3 })
        .withMessage('pricing must be an array with 1-3 items'),

    body('pricing.*.size')
        .isIn(['small', 'medium', 'large'])
        .withMessage('size must be small, medium, or large'),

    body('pricing.*.price')
        .isFloat({ min: 0 })
        .withMessage('price must be a positive number'),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const formattedErrors = {};
            errors.array().forEach(err => {
                formattedErrors[err.path] = err.msg;
            });

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: formattedErrors
            });
        }

        next();
    }
];

module.exports = {
    validateSuperAdminLogin,
    validateChangePassword,
    validateAddBranchAdmin,
    validateUpdateBranch,
    validateUpdateUser,
    validateDeleteBranch,
    validateDeleteUser,
    validateBlockUser,
    validateUnblockUser,
    validateAddUser,
    validateUpdateVaultPricing
};
