const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const userValidators = require('../validator/userValidators');
const commonController = require('../controller/commonController');
const { uploadUserImages } = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');





router.post('/send-login-otp', userValidators.validateSendLoginOtp, userController.sendLoginOtp);
router.post('/login', userValidators.validateLoginWithOtp, (req, res, next) => {
    req.body.is_login = true;
    next();
}, commonController.verifyOtp);

router.post('/logout', authenticateToken, commonController.logout);

router.get('/profile', authenticateToken, commonController.getMe);
router.post('/add-nominee', authenticateToken, uploadUserImages, userValidators.validateAddNominee, commonController.addNominee);
router.get('/get-nominees', authenticateToken, commonController.getNominees);
router.get('/get-user-vaults', authenticateToken, commonController.getUserVaults);
router.delete('/delete-nominee', authenticateToken, commonController.deleteNominee);


module.exports = router;
