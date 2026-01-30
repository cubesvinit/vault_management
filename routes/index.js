const express = require('express');
const router = express.Router();

const superAdminRoutes = require('./superAdmin');
const adminRoutes = require('./admin');
const userRoutes = require('./user');




router.use('/super-admin', superAdminRoutes);
router.use('/admin', adminRoutes);
router.use('/user', userRoutes);



module.exports = router;
