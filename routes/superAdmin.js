const express = require('express');
const router = express.Router();
const superAdmin = require('../controller/superAdminController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const superAdminValidator = require('../validator/superAdminValidators');
const { uploadUserImages } = require('../middleware/upload');
const commonController = require('../controller/commonController');


// router.post('/login', superAdminValidator.validateSuperAdminLogin, superAdmin.superAdminLogin);
router.post('/login', superAdminValidator.validateSuperAdminLogin, commonController.login);
router.post('/change-password', authenticateToken, authorizeRoles('super_admin'), superAdminValidator.validateChangePassword, superAdmin.changeSuperAdminPassword);
router.post('/add-admin', authenticateToken, authorizeRoles('super_admin'), superAdminValidator.validateAddBranchAdmin, superAdmin.addAdmin);

router.post('/add-user', authenticateToken, authorizeRoles('super_admin'), uploadUserImages, superAdminValidator.validateAddUser, commonController.addUser);
router.put('/update-branch', authenticateToken, authorizeRoles('super_admin'), superAdminValidator.validateUpdateBranch, superAdmin.updateBranch);
router.put('/update-user', authenticateToken, authorizeRoles('super_admin'), uploadUserImages, superAdminValidator.validateUpdateUser, commonController.updateUser);
router.get('/get-all-branches', authenticateToken, authorizeRoles('super_admin'), superAdmin.getAllBranches);
router.get('/get-all-users', authenticateToken, authorizeRoles('super_admin'), commonController.getAllUsers);
router.get('/get-user', authenticateToken, authorizeRoles('super_admin'), commonController.getUserById);
router.get('/get-branch', authenticateToken, authorizeRoles('super_admin'), superAdmin.getBranchById);

router.delete('/delete-user', authenticateToken, authorizeRoles('super_admin'), commonController.deleteUser);
router.put('/toggle-block-status', authenticateToken, authorizeRoles('super_admin'), commonController.toggleBlockStatus);

router.post('/vault-pricing', authenticateToken, authorizeRoles('super_admin'), superAdminValidator.validateUpdateVaultPricing, superAdmin.updateVaultPricing);
router.get('/get-vault-pricing', authenticateToken, authorizeRoles('super_admin'), superAdmin.getVaultPricing);

router.post('/logout', authenticateToken, commonController.logout);
router.get('/profile', authenticateToken, authorizeRoles('super_admin'), commonController.getMe);

module.exports = router;