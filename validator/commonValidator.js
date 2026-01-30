const { body, validationResult } = require('express-validator');

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


const deleteUserValidators = [
    body('user_id')
        .notEmpty()
        .withMessage('User ID is required'),
    body('deleted_reason')
        .optional()
        .isString()
        .withMessage('Reason must be a text string')
];

const validateDeleteUser = [
    ...deleteUserValidators,
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
    validateToggleBlockStatus,
    validateDeleteUser
};
