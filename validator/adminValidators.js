const { body, validationResult } = require('express-validator');

const adminLoginValidators = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
]

const validateAdminLogin = [
    ...adminLoginValidators,
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
]


const addUserValidators = [
    body('phone_number')
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    body('first_name')
        .isLength({ min: 1 })
        .withMessage('First name cannot be empty'),
    body('last_name')
        .isLength({ min: 1 })
        .withMessage('Last name cannot be empty'),
    body('iso_code')
        .notEmpty()
        .withMessage('ISO code is required'),
    body('country_code')
        .notEmpty()
        .withMessage('Country code is required'),
    body('full_address')
        .notEmpty()
        .withMessage('Full address is required'),
    body('latitude')
        .isNumeric()
        .withMessage('Latitude must be a number'),
    body('longitude')
        .isNumeric()
        .withMessage('Longitude must be a number'),
    body('pincode')
        .notEmpty()
        .withMessage('Pincode is required'),
    body('aadhar_number')
        .isLength({ min: 12, max: 12 })
        .withMessage('Aadhar number must be 12 digits')
        .isNumeric()
        .withMessage('Aadhar number must contain only digits'),
];

const validateAddUser = [
    ...addUserValidators,
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

const updateUserValidators = [
    body('user_id')
        .notEmpty()
        .withMessage('User ID is required'),
    body('phone_number')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    body('first_name')
        .optional()
        .isLength({ min: 1 })
        .withMessage('First name cannot be empty'),
    body('last_name')
        .optional()
        .isLength({ min: 1 })
        .withMessage('Last name cannot be empty'),
    body('iso_code')
        .optional()
        .notEmpty()
        .withMessage('ISO code is required'),
    body('country_code')
        .optional()
        .notEmpty()
        .withMessage('Country code is required'),
    body('full_address')
        .optional()
        .notEmpty()
        .withMessage('Full address is required'),
    body('latitude')
        .optional()
        .isNumeric()
        .withMessage('Latitude must be a number'),
    body('longitude')
        .optional()
        .isNumeric()
        .withMessage('Longitude must be a number'),
    body('pincode')
        .optional()
        .notEmpty()
        .withMessage('Pincode is required'),
    body('aadhar_number')
        .optional()
        .isLength({ min: 12, max: 12 })
        .withMessage('Aadhar number must be 12 digits')
        .isNumeric()
        .withMessage('Aadhar number must contain only digits'),
    body('branch_id')
        .optional()
        .custom((value) => {
            if (value === null || value === '' || value === 0 || value === '0') return true;
            if (Number(value) < 1) throw new Error('Branch ID must be a positive integer');
            return true;
        })
        .withMessage('Branch ID must be valid'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email'),
    body('role')
        .optional()
        .isIn(['user', 'manager'])
        .withMessage('Role must be either user or manager'),
];

const validateUpdateUser = [
    ...updateUserValidators,
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


const toggleBlockValidators = [
    body('user_id')
        .notEmpty()
        .withMessage('User ID is required'),
    body('is_blocked')
        .isBoolean()
        .withMessage('is_blocked status must be a boolean value'),
    body('reason')
        .optional()
        .isString()
        .withMessage('Reason must be a text string')
];

const validateToggleBlockStatus = [
    ...toggleBlockValidators,
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



const allotVaultValidators = [
    body('user_id')
        .notEmpty()
        .withMessage('User ID is required'),
    body('requests')
        .isArray({ min: 1 })
        .withMessage('Requests must be an array with at least one item'),
    body('requests.*.size')
        .notEmpty()
        .isIn(['small', 'medium', 'large'])
        .withMessage('Size must be small, medium, or large'),
    body('requests.*.quantity')
        .optional()
        .custom((value) => {
            if (value === null || value === '' || value === 0 || value === '0') return true;
            if (Number(value) < 1) throw new Error('Branch ID must be a positive integer');
            return true;
        })
        .withMessage('Quantity must be a positive integer')
];

const validateAllotVault = [
    ...allotVaultValidators,
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


const validateUpdateNomineeStatus = [
    body('nominee_id')
        .notEmpty().withMessage('Nominee ID is required'),
    body('status')
        .notEmpty().withMessage('Status is required')
        .isIn(['0', '1', 0, 1]).withMessage('Status must be 1 (approved) or 0 (rejected)'),
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


const validateAddBranch = [
    body('branch_name')
        .notEmpty().withMessage('Branch name is required')
        .trim()
        .isLength({ min: 3, max: 150 }).withMessage('Branch name must be between 3 and 150 characters'),
    body('branch_address')
        .notEmpty().withMessage('Branch address is required')
        .trim(),
    body('branch_city')
        .notEmpty().withMessage('Branch city is required')
        .trim(),
    body('branch_state')
        .notEmpty().withMessage('Branch state is required')
        .trim(),
    body('branch_country')
        .notEmpty().withMessage('Branch country is required')
        .trim(),
    body('branch_pincode')
        .notEmpty().withMessage('Branch pincode is required')
        .trim()
        .isLength({ min: 4, max: 10 }).withMessage('Pincode must be between 4 and 10 characters'),
    body('branch_phone_number')
        .notEmpty().withMessage('Branch phone number is required')
        .trim()
        .isLength({ min: 10, max: 15 }).withMessage('Phone number must be between 10 and 15 digits'),
    body('iso_code')
        .notEmpty().withMessage('ISO code is required')
        .trim(),
    body('branch_email')
        .notEmpty().withMessage('Branch email is required')
        .trim()
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    body('branch_password')
        .notEmpty().withMessage('Branch password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
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



const validateUpdateBranch = [
    body('branch_id')
        .notEmpty().withMessage('Branch ID is required')
        .isInt({ min: 1 }).withMessage('Branch ID must be a valid positive integer'),
    body('branch_name')
        .optional()
        .trim()
        .isLength({ min: 3, max: 150 }).withMessage('Branch name must be between 3 and 150 characters'),
    body('branch_address')
        .optional()
        .trim(),
    body('branch_city')
        .optional()
        .trim(),
    body('branch_state')
        .optional()
        .trim(),
    body('branch_country')
        .optional()
        .trim(),
    body('iso_code')
        .optional()
        .trim(),
    body('branch_pincode')
        .optional()
        .trim()
        .isLength({ min: 4, max: 10 }).withMessage('Pincode must be between 4 and 10 characters'),
    body('branch_phone_number')
        .optional()
        .trim()
        .isLength({ min: 10, max: 15 }).withMessage('Phone number must be between 10 and 15 digits'),
    body('branch_email')
        .optional()
        .trim()
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    body('branch_is_active')
        .optional()
        .isBoolean().withMessage('branch_is_active must be a boolean'),
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

const validateDeleteBranch = [
    body('branch_id')
        .notEmpty().withMessage('Branch ID is required')
        .isInt({ min: 1 }).withMessage('Branch ID must be a valid positive integer'),
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

const validateChangePassword = [
    body('old_password')
        .notEmpty().withMessage('Old password is required'),
    body('new_password')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
        .custom((value, { req }) => {
            if (value === req.body.old_password) {
                throw new Error('New password cannot be the same as the old password');
            }
            return true;
        }),
    body('confirm_password')
        .notEmpty().withMessage('Confirm password is required')
        .custom((value, { req }) => {
            if (value !== req.body.new_password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),
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

const validateForgotPassword = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email'),
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

const validateResetPassword = [
    body('email')
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email'),
    body('otp')
        .notEmpty().withMessage('OTP is required')
        .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    body('new_password')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('confirm_password')
        .notEmpty().withMessage('Confirm password is required')
        .custom((value, { req }) => {
            if (value !== req.body.new_password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),
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

const validateAddManager = [
    ...addUserValidators,
    body('branch_id')
        .optional()
        .custom((value) => {
            if (value === null || value === '' || value === 0 || value === '0') return true;
            if (Number(value) < 1) throw new Error('Branch ID must be a positive integer');
            return true;
        })
        .withMessage('Branch ID must be valid'),
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

const validateDeleteManager = [
    body('user_id')
        .notEmpty().withMessage('User ID is required')
        .isInt({ min: 1 }).withMessage('User ID must be a valid positive integer'),
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

const validateConfigureBranchVaults = [
    body('branch_id')
        .notEmpty().withMessage('Branch ID is required')
        .isInt({ min: 1 }).withMessage('Branch ID must be a valid positive integer'),
    body('vaults')
        .isArray({ min: 1 }).withMessage('Vaults must be an array with at least one item'),
    body('vaults.*.size')
        .notEmpty().withMessage('Vault size is required')
        .isIn(['small', 'medium', 'large']).withMessage('Size must be small, medium, or large'),
    body('vaults.*.price')
        .notEmpty().withMessage('Price is required')
        .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('vaults.*.quantity')
        .notEmpty().withMessage('Quantity is required')
        .isInt({ min: 0 }).withMessage('Quantity must be a positive integer'),
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
    validateAdminLogin,
    validateAddUser,
    validateUpdateUser,
    validateToggleBlockStatus,
    validateAllotVault,
    validateUpdateNomineeStatus,
    validateAddBranch,
    validateUpdateBranch,
    validateDeleteBranch,
    validateChangePassword,
    validateForgotPassword,
    validateResetPassword,
    validateAddManager,
    validateDeleteManager,
    validateConfigureBranchVaults
}
