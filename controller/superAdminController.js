const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { User, Otp, Vault, VaultPricing, Nominee, Device } = require('../config/db');
const { Op } = require('sequelize');
const { generateToken } = require('../helper/tokenHelper');


// const superAdminLogin = async (req, res) => {
//     try {
//         const { email, password, device_id, device_type } = req.body;

//         const user = await User.findOne({
//             where: {
//                 email: email,
//                 role: 'super_admin'
//             }
//         });

//         if (!user) {
//             return res.status(401).json({
//                 success: 0,
//                 message: 'Invalid credentials or not a super admin'
//             });
//         }



//         const isPasswordValid = await bcrypt.compare(password, user.password);
//         if (!isPasswordValid) {
//             return res.status(401).json({
//                 success: 0,
//                 message: 'Invalid credentials'
//             });
//         }

//         await user.update({ last_login_at: new Date() });

//         const token = generateToken(
//             {
//                 id: user.id,
//                 email: user.email,
//                 role: user.role
//             },
//             '24h'
//         );

//         await Device.create({
//             user_id: user.id,
//             device_id: device_id || 'unknown',
//             device_type: device_type || 'web',
//             device_token: token
//         });

//         return res.status(200).json({
//             success: 1,
//             message: 'Login successful',
//             data: {
//                 user: {
//                     id: user.id,
//                     email: user.email,
//                     first_name: user.first_name,
//                     last_name: user.last_name,
//                     role: user.role
//                 },
//                 token: token
//             }
//         });

//     } catch (error) {
//         console.error('Super admin login error:', error);
//         return res.status(500).json({
//             success: 0,
//             message: 'Internal server error'
//         });
//     }
// };

const changeSuperAdminPassword = async (req, res) => {
    try {
        const { old_password, new_password } = req.body;
        const userId = req.user.id;

        const user = await User.findByPk(userId);
        if (!user || user.role !== 'super_admin') {
            return res.status(404).json({
                success: 0,
                message: 'Super admin not found'
            });
        }

        const isOldPasswordValid = await bcrypt.compare(old_password, user.password);
        if (!isOldPasswordValid) {
            return res.status(400).json({
                success: 0,
                message: 'Old password is incorrect'
            });
        }

        const hashedNewPassword = await bcrypt.hash(new_password, 10);

        await user.update({ password: hashedNewPassword });

        return res.status(200).json({
            success: 1,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({
            success: 0,
            message: 'Internal server error'
        });
    }
};


const addAdmin = async (req, res) => {
    const transaction = await User.sequelize.transaction();

    try {
        const {
            first_name,
            last_name,
            full_address,
            latitude,
            longitude,
            pincode,
            email,
            password,
            phone_number,
            iso_code,
        } = req.body;

        const existingAdmin = await User.findOne({
            where: { email, role: 'admin' },
            transaction
        });
        if (existingAdmin) {
            await transaction.rollback();
            return res.status(409).json({
                success: 0,
                message: 'Admin with this email already exists'
            });
        }

        const existingUser = await User.findOne({
            where: {
                [Op.or]: [{ email }, { phone_number }]
            },
            transaction
        });
        if (existingUser) {
            await transaction.rollback();
            return res.status(409).json({
                success: 0,
                message: 'User with this email or phone number already exists'
            });
        }

        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

        const newAdmin = await User.create({
            email,
            password: hashedPassword,
            iso_code,
            phone_number,
            first_name,
            last_name,
            full_address,
            latitude,
            longitude,
            pincode,
            role: 'admin',
            is_user_verified: true,
            created_by: req.user.id
        }, { transaction });

        await transaction.commit();

        const responseData = newAdmin.toJSON();
        delete responseData.password;

        return res.status(201).json({
            success: 1,
            message: 'Branch Admin created successfully',
            data: responseData
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Add branch admin error:', error);
        res.status(500).json({
            success: 0,
            message: 'Internal server error'
        });
    }
};

const updateBranch = async (req, res) => {
    const transaction = await User.sequelize.transaction();

    try {
        const {
            admin_user_id,
            branch_name,
            full_address,
            latitude,
            longitude,
            pincode,
            iso_code,
            country_code,
            password
        } = req.body;


        const admin = await User.findByPk(admin_user_id, { transaction });
        if (!admin) {
            await transaction.rollback();
            return res.status(404).json({
                success: 0,
                message: 'Admin user not found'
            });
        }

        if (admin.role !== 'admin') {
            await transaction.rollback();
            return res.status(400).json({
                success: 0,
                message: 'User is not an admin'
            });
        }

        if (admin.is_deleted) {
            await transaction.rollback();
            return res.status(400).json({
                success: 0,
                message: 'Cannot update deleted admin. Please contact administrator.'
            });
        }


        if (branch_name && branch_name !== admin.branch_name) {
            const existingBranch = await User.findOne({
                where: { branch_name, role: 'admin', id: { [Op.ne]: admin_user_id } },
                transaction
            });
            if (existingBranch) {
                await transaction.rollback();
                return res.status(409).json({
                    success: 0,
                    message: 'Branch with this name already exists'
                });
            }
        }


        const updateData = {};
        if (branch_name !== undefined) updateData.branch_name = branch_name;
        if (full_address !== undefined) updateData.full_address = full_address;
        if (latitude !== undefined) updateData.latitude = latitude;
        if (longitude !== undefined) updateData.longitude = longitude;
        if (pincode !== undefined) updateData.pincode = pincode;
        if (iso_code !== undefined) updateData.iso_code = iso_code;
        if (country_code !== undefined) updateData.country_code = country_code;

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }
        await admin.update(updateData, { transaction });

        const vaultsCreated = [];
        const vaultsDeactivated = [];
        const vaultsToMaintenance = [];
        const vaultsToAvailable = [];
        const vaultChanges = {};

        const vaultSizes = [
            {
                size: 'small',
                targetTotal: req.body.vault_small_total !== undefined ? parseInt(req.body.vault_small_total) : null,
                targetMaintenance: req.body.vault_small_maintenance !== undefined ? parseInt(req.body.vault_small_maintenance) : null
            },
            {
                size: 'medium',
                targetTotal: req.body.vault_medium_total !== undefined ? parseInt(req.body.vault_medium_total) : null,
                targetMaintenance: req.body.vault_medium_maintenance !== undefined ? parseInt(req.body.vault_medium_maintenance) : null
            },
            {
                size: 'large',
                targetTotal: req.body.vault_large_total !== undefined ? parseInt(req.body.vault_large_total) : null,
                targetMaintenance: req.body.vault_large_maintenance !== undefined ? parseInt(req.body.vault_large_maintenance) : null
            }
        ];

        for (const { size, targetTotal, targetMaintenance } of vaultSizes) {
            if (targetTotal === null && targetMaintenance === null) continue;

            const currentVaults = await Vault.findAll({
                where: { admin_user_id, size, is_active: true },
                order: [['vault_number', 'ASC']],
                transaction
            });

            const occupiedCount = currentVaults.filter(v => v.status === 'occupied').length;
            const maintenanceCount = currentVaults.filter(v => v.status === 'maintenance').length;
            const availableCount = currentVaults.filter(v => v.status === 'available').length;
            const currentTotal = currentVaults.length;

            const deactivatedVaults = await Vault.findAll({
                where: { admin_user_id, size, is_active: false },
                transaction
            });
            const deactivatedCount = deactivatedVaults.length;
            if (targetTotal !== null) {
                const minRequired = occupiedCount + maintenanceCount;

                if (targetTotal < minRequired) {
                    await transaction.rollback();
                    return res.status(400).json({
                        success: 0,
                        message: `Cannot set ${size} vault total to ${targetTotal}. Minimum required is ${minRequired} (${occupiedCount} occupied + ${maintenanceCount} maintenance).`
                    });
                }

                const totalDifference = targetTotal - currentTotal;

                if (totalDifference > 0) {
                    const allVaults = await Vault.findAll({
                        where: { admin_user_id },
                        order: [['vault_number', 'DESC']],
                        limit: 1,
                        paranoid: false,
                        transaction
                    });

                    let vaultCounter = 1;
                    if (allVaults.length > 0) {
                        vaultCounter = parseInt(allVaults[0].vault_number.replace('V', '')) + 1;
                    }

                    for (let i = 0; i < totalDifference; i++) {
                        const vaultNumber = `V${String(vaultCounter).padStart(4, '0')}`;
                        await Vault.create({
                            admin_user_id,
                            vault_number: vaultNumber,
                            size,
                            status: 'available',
                            is_active: true
                        }, { transaction });
                        vaultsCreated.push({ vault_number: vaultNumber, size });
                        vaultCounter++;
                    }

                    if (!vaultChanges[size]) vaultChanges[size] = {};
                    vaultChanges[size].added = totalDifference;

                } else if (totalDifference < 0) {
                    const countToDeactivate = Math.abs(totalDifference);

                    if (availableCount < countToDeactivate) {
                        await transaction.rollback();
                        return res.status(400).json({
                            success: 0,
                            message: `Cannot reduce ${size} vaults to ${targetTotal}. Only ${availableCount} of ${currentTotal} are available for removal.`
                        });
                    }

                    const availableVaults = currentVaults.filter(v => v.status === 'available');
                    for (const vault of availableVaults.slice(-countToDeactivate)) {
                        await vault.update({ is_active: false }, { transaction });
                        vaultsDeactivated.push({ vault_number: vault.vault_number, size });
                    }

                    if (!vaultChanges[size]) vaultChanges[size] = {};
                    vaultChanges[size].removed = countToDeactivate;
                }
            }

            if (targetMaintenance !== null) {
                const updatedVaults = await Vault.findAll({
                    where: { admin_user_id, size, status: { [Op.ne]: 'deactivated' } },
                    order: [['vault_number', 'ASC']],
                    transaction
                });

                const updatedTotal = updatedVaults.length;
                const updatedMaintenanceCount = updatedVaults.filter(v => v.status === 'maintenance').length;
                const updatedAvailableCount = updatedVaults.filter(v => v.status === 'available').length;

                if (targetMaintenance > updatedTotal) {
                    await transaction.rollback();
                    return res.status(400).json({
                        success: 0,
                        message: `Cannot set ${size} vault maintenance to ${targetMaintenance}. Total vaults is only ${updatedTotal}.`
                    });
                }
                const maintenanceDifference = targetMaintenance - updatedMaintenanceCount;
                if (maintenanceDifference > 0) {
                    if (updatedAvailableCount < maintenanceDifference) {
                        await transaction.rollback();
                        return res.status(400).json({
                            success: 0,
                            message: `Cannot set ${size} vault maintenance to ${targetMaintenance}. Only ${updatedAvailableCount} available vaults to convert.`
                        });
                    }

                    const availableVaults = updatedVaults.filter(v => v.status === 'available');
                    for (const vault of availableVaults.slice(0, maintenanceDifference)) {
                        await vault.update({ status: 'maintenance' }, { transaction });
                        vaultsToMaintenance.push({ vault_number: vault.vault_number, size });
                    }

                    if (!vaultChanges[size]) vaultChanges[size] = {};
                    vaultChanges[size].to_maintenance = maintenanceDifference;

                } else if (maintenanceDifference < 0) {
                    const countToConvert = Math.abs(maintenanceDifference);
                    const maintenanceVaults = updatedVaults.filter(v => v.status === 'maintenance');

                    for (const vault of maintenanceVaults.slice(0, countToConvert)) {
                        await vault.update({ status: 'available' }, { transaction });
                        vaultsToAvailable.push({ vault_number: vault.vault_number, size });
                    }

                    if (!vaultChanges[size]) vaultChanges[size] = {};
                    vaultChanges[size].to_available = countToConvert;
                }
            }
        }

        await transaction.commit();

        const adminResponse = admin.toJSON();
        delete adminResponse.password;
        const finalVaults = await Vault.findAll({
            where: { admin_user_id, is_active: true }
        });

        const vaultSummary = {
            total_inventory: finalVaults.length,
            inventory_by_size: {
                small: finalVaults.filter(v => v.size === 'small').length,
                medium: finalVaults.filter(v => v.size === 'medium').length,
                large: finalVaults.filter(v => v.size === 'large').length
            },
            available_by_size: {
                small: finalVaults.filter(v => v.size === 'small' && v.status === 'available').length,
                medium: finalVaults.filter(v => v.size === 'medium' && v.status === 'available').length,
                large: finalVaults.filter(v => v.size === 'large' && v.status === 'available').length
            }
        };

        const response = {
            success: 1,
            message: 'Admin details updated successfully',
            data: adminResponse,
            vault_summary: vaultSummary
        };

        if (vaultsCreated.length > 0 || vaultsDeactivated.length > 0 || vaultsToMaintenance.length > 0 || vaultsToAvailable.length > 0) {
            response.vault_changes = {
                summary: vaultChanges,
                added: vaultsCreated.length > 0 ? { total: vaultsCreated.length, vaults: vaultsCreated } : null,
                deactivated: vaultsDeactivated.length > 0 ? { total: vaultsDeactivated.length, vaults: vaultsDeactivated } : null,
                to_maintenance: vaultsToMaintenance.length > 0 ? { total: vaultsToMaintenance.length, vaults: vaultsToMaintenance } : null,
                to_available: vaultsToAvailable.length > 0 ? { total: vaultsToAvailable.length, vaults: vaultsToAvailable } : null
            };
        }

        return res.status(200).json(response);

    } catch (error) {
        await transaction.rollback();
        console.error('Update branch error:', error);
        return res.status(500).json({
            success: 0,
            message: 'Internal server error'
        });
    }
};

const getAllBranches = async (req, res) => {
    try {
        let { page, limit, search } = req.query;

        limit = Math.min(parseInt(limit) || 10, 100);
        page = parseInt(page) || 1;
        if (search && search.trim() !== '') {
            page = 1;
        }
        const offset = (page - 1) * limit;
        const whereCondition = {
            role: 'admin',
            is_deleted: false
        };
        if (search && search.trim() !== '') {
            whereCondition[Op.or] = [
                { branch_name: { [Op.like]: `%${search}%` } },
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } }
            ];
        }
        const { count, rows: admins } = await User.findAndCountAll({
            where: whereCondition,
            attributes: {
                exclude: ['password']
            },
            order: [['created_at', 'DESC']],
            limit,
            offset
        });

        return res.status(200).json({
            success: 1,
            message: 'Admins fetched successfully',
            data: admins,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Get all admins error:', error);
        return res.status(500).json({
            success: 0,
            message: 'Internal server error'
        });
    }
};

const getBranchById = async (req, res) => {
    try {
        const { id } = req.query;

        const admin = await User.findOne({
            where: { id, role: 'admin' },
            attributes: {
                exclude: ['password']
            }
        });

        if (!admin) {
            return res.status(404).json({
                success: 0,
                message: 'Admin not found'
            });
        }
        const vaults = await Vault.findAll({
            where: { admin_user_id: id },
            attributes: ['id', 'vault_number', 'size', 'status', 'user_id', 'assigned_at', 'is_active'],
            order: [['vault_number', 'ASC']]
        });
        const vaultSummary = {
            total: vaults.length,
            by_size: {
                small: vaults.filter(v => v.size === 'small' && v.is_active).length,
                medium: vaults.filter(v => v.size === 'medium' && v.is_active).length,
                large: vaults.filter(v => v.size === 'large' && v.is_active).length
            },
            by_status: {
                available: vaults.filter(v => v.status === 'available' && v.is_active).length,
                occupied: vaults.filter(v => v.status === 'occupied' && v.is_active).length,
                blocked: vaults.filter(v => v.status === 'blocked' && v.is_active).length,
                deactivated: vaults.filter(v => !v.is_active).length
            }
        };

        return res.status(200).json({
            success: 1,
            data: {
                ...admin.toJSON(),
                vaults: vaults,
                vault_summary: vaultSummary
            }
        });
    } catch (error) {
        console.error('Get admin details error:', error);
        return res.status(500).json({
            success: 0,
            message: 'Internal server error'
        });
    }
};


const updateVaultPricing = async (req, res) => {
    const transaction = await VaultPricing.sequelize.transaction();
    try {
        const { pricing } = req.body;

        for (const item of pricing) {
            const { size, price } = item;

            const existingPricing = await VaultPricing.findOne({
                where: { size },
                transaction
            });

            if (existingPricing) {
                await existingPricing.update({
                    price,
                    updated_by: req.user.id
                }, { transaction });
            } else {
                await VaultPricing.create({
                    size,
                    price,
                    created_by: req.user.id,
                    updated_by: req.user.id
                }, { transaction });
            }
        }

        await transaction.commit();

        return res.status(200).json({
            success: 1,
            message: 'Vault pricing updated successfully',
            vault_pricing: pricing
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Update vault pricing error:', error);
        return res.status(500).json({

            success: 0,
            message: 'Internal server error'
        });
    }
};

const getVaultPricing = async (req, res) => {
    try {
        const pricing = await VaultPricing.findAll({
            attributes: ['size', 'price', 'updated_at'],
            include: [{
                model: User,
                as: 'updater',
                attributes: ['first_name', 'last_name']
            }]
        });

        return res.status(200).json({
            success: 1,
            data: pricing
        });
    } catch (error) {
        console.error('Get vault pricing error:', error);
        return res.status(500).json({
            success: 0,
            message: 'Internal server error'
        });
    }
};



module.exports = {
    addAdmin,
    updateBranch,
    getAllBranches,
    getBranchById,
    updateVaultPricing,
    getVaultPricing,
    // superAdminLogin,
    changeSuperAdminPassword
};





