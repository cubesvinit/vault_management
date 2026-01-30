const bcrypt = require('bcrypt');
const crypto = require('crypto');
const path = require('path');
const { User, Otp, Vault, Device, VaultPricing, Nominee, Branch } = require('../config/db');
const { extractFilePaths } = require('../helper/fileUploadHelper');
const { generateToken } = require('../helper/tokenHelper');
const fs = require('fs');
const { Op } = require('sequelize');


// const login = async (req, res) => {
//     try {

//         const { email, password, device_id, device_type } = req.body;

//         const user = await User.findOne({
//             where: {
//                 email: email,
//                 role: 'admin'
//             }
//         });

//         if (!user) {
//             return res.status(401).json({
//                 success: 0,
//                 message: 'Invalid credentials or not an admin'
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
//                 role: user.role,
//                 branch_name: user.branch_name
//             },
//             '24h'
//         );

//         await Device.create({
//             user_id: user.id,
//             device_id: device_id || 'unknown',
//             device_type: device_type || 'web',
//             device_token: token
//         });

//         const availableVaults = await Vault.findAll({
//             where: {
//                 admin_user_id: user.id,
//                 status: 'available',
//                 is_active: true
//             },
//             attributes: ['size']
//         });

//         const totalAvailable = availableVaults.length;
//         const availableBySize = { small: 0, medium: 0, large: 0 };
//         availableVaults.forEach(v => {
//             if (v.size && availableBySize[v.size] !== undefined) {
//                 availableBySize[v.size]++;
//             }
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
//                     branch_name: user.branch_name,
//                     role: user.role
//                 },
//                 token: token,
//                 vault_stats: {
//                     total_available: totalAvailable,
//                     available_by_size: availableBySize
//                 }
//             }
//         });

//     } catch (error) {
//         console.error('Admin login error:', error);
//         return res.status(500).json({
//             success: 0,
//             message: 'Internal server error'
//         });
//     }
// };


// we are using this but now we have created the commonController

// const addUser = async (req, res) => {
//     const transaction = await User.sequelize.transaction();

//     try {

//         const {
//             first_name,
//             last_name,
//             phone_number,
//             iso_code,
//             full_address,
//             latitude,
//             longitude,
//             pincode,
//             aadhar_number,
//         } = req.body;

//         const created_by = req.user.id;
//         const branch_name = req.user.branch_name;

//         const role = 'user';
//         const existingUser = await User.findOne({
//             where: { phone_number },
//             transaction
//         });
//         if (existingUser) {
//             await transaction.rollback();
//             return res.status(409).json({
//                 success: 0,
//                 message: 'User with this phone number already exists'
//             });
//         }

//         const existingAadhar = await User.findOne({
//             where: { aadhar_number },
//             transaction
//         });

//         if (existingAadhar) {
//             await transaction.rollback();
//             return res.status(409).json({
//                 success: 0,
//                 message: 'User with this Aadhar number already exists'
//             });
//         }
//         if (!req.files || !req.files.aadhar_front_image || !req.files.aadhar_back_image || !req.files.signature_image) {
//             await transaction.rollback();
//             return res.status(400).json({
//                 success: 0,
//                 message: 'Please upload all required documents: Aadhar front, Aadhar back, and Signature'
//             });
//         }
//         const filePaths = extractFilePaths(req.files, ['aadhar_front_image', 'aadhar_back_image', 'signature_image']);

//         const newUser = await User.create({
//             first_name,
//             last_name,
//             phone_number,
//             iso_code,
//             full_address,
//             latitude,
//             longitude,
//             branch_name,
//             created_by,
//             pincode,
//             aadhar_number,
//             aadhar_front_image: filePaths.aadhar_front_image || null,
//             aadhar_back_image: filePaths.aadhar_back_image || null,
//             signature_image: filePaths.signature_image || null,
//             role,
//             is_otp_verified: false
//         }, { transaction });

//         const otpCode = crypto.randomInt(100000, 999999).toString();
//         const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

//         await Otp.create({
//             phone_number,
//             otp_code: otpCode,
//             expires_at: expiresAt,
//             user_id: newUser.id
//         }, { transaction });

//         await transaction.commit();

//         console.log(`OTP for ${phone_number}: ${otpCode}`);
//         const userResponse = {
//             id: newUser.id,
//             first_name: newUser.first_name,
//             last_name: newUser.last_name,
//             phone_number: newUser.phone_number,
//             iso_code: newUser.iso_code,
//             full_address: newUser.full_address,
//             latitude: newUser.latitude,
//             longitude: newUser.longitude,
//             pincode: newUser.pincode,
//             aadhar_number: newUser.aadhar_number,
//             aadhar_front_image: newUser.aadhar_front_image,
//             aadhar_back_image: newUser.aadhar_back_image,
//             signature_image: newUser.signature_image,
//             role: newUser.role,
//             is_otp_verified: newUser.is_otp_verified,
//             created_at: newUser.created_at,
//             branch_name: newUser.branch_name
//         };

//         return res.status(201).json({
//             success: 1,
//             message: 'User created successfully. OTP sent to phone number.',
//             data: userResponse
//         });

//     } catch (error) {
//         await transaction.rollback();
//         console.error('Add user error:', error);
//         return res.status(500).json({
//             success: 0,
//             message: 'Internal server error'
//         });
//     }
// };

// const updateUser = async (req, res) => {
//     const transaction = await User.sequelize.transaction();
//     try {
//         const { user_id, first_name, last_name, phone_number, iso_code, full_address, latitude, longitude, pincode, aadhar_number } = req.body;
//         if (!user_id) {
//             await transaction.rollback();
//             return res.status(400).json({
//                 success: 0,
//                 message: 'User ID is required'
//             });
//         }
//         const user = await User.findOne({ where: { id: user_id }, transaction });
//         if (!user) {
//             await transaction.rollback();
//             return res.status(404).json({
//                 success: 0,
//                 message: 'User not found'
//             });
//         }
//         if (req.user.role === 'admin') {
//             if (user.role === 'super_admin' || user.role === 'admin') {
//                 await transaction.rollback();
//                 return res.status(403).json({
//                     success: 0,
//                     message: 'Admins cannot update potentially privileged users (Admins or Super Admins)'
//                 });
//             }

//             if (user.branch_name !== req.user.branch_name) {
//                 await transaction.rollback();
//                 return res.status(403).json({
//                     success: 0,
//                     message: 'Admins can only manage users within their own branch'
//                 });
//             }
//         }
//         if (user.is_deleted || user.is_blocked) {
//             await transaction.rollback();
//             return res.status(403).json({
//                 success: 0,
//                 message: 'User cannot be updated'
//             });
//         }

//         if (phone_number && phone_number !== user.phone_number) {
//             const phoneExists = await User.findOne({
//                 where: { phone_number },
//                 transaction
//             });

//             if (phoneExists) {
//                 await transaction.rollback();
//                 return res.status(409).json({
//                     success: 0,
//                     message: 'Phone number already in use'
//                 });
//             }
//         }

//         if (aadhar_number && aadhar_number !== user.aadhar_number) {
//             const aadharExists = await User.findOne({
//                 where: { aadhar_number },
//                 transaction
//             });

//             if (aadharExists) {
//                 await transaction.rollback();
//                 return res.status(409).json({
//                     success: 0,
//                     message: 'Aadhaar number already in use'
//                 });
//             }
//         }
//         const updateData = {};

//         if (first_name !== undefined) updateData.first_name = first_name;
//         if (last_name !== undefined) updateData.last_name = last_name;
//         if (phone_number !== undefined) updateData.phone_number = phone_number;
//         if (iso_code !== undefined) updateData.iso_code = iso_code;
//         if (full_address !== undefined) updateData.full_address = full_address;
//         if (latitude !== undefined) updateData.latitude = latitude;
//         if (longitude !== undefined) updateData.longitude = longitude;
//         if (pincode !== undefined) updateData.pincode = pincode;
//         if (aadhar_number !== undefined) updateData.aadhar_number = aadhar_number;

//         // Handle image updates
//         const filePaths = extractFilePaths(req.files, ['aadhar_front_image', 'aadhar_back_image', 'signature_image']);

//         if (filePaths.aadhar_front_image) {
//             if (user.aadhar_front_image && fs.existsSync(user.aadhar_front_image)) {
//                 await fs.promises.unlink(user.aadhar_front_image);
//             }
//             updateData.aadhar_front_image = filePaths.aadhar_front_image;
//         }

//         if (filePaths.aadhar_back_image) {
//             if (user.aadhar_back_image && fs.existsSync(user.aadhar_back_image)) {
//                 await fs.promises.unlink(user.aadhar_back_image);
//             }
//             updateData.aadhar_back_image = filePaths.aadhar_back_image;
//         }

//         if (filePaths.signature_image) {
//             if (user.signature_image && fs.existsSync(user.signature_image)) {
//                 await fs.promises.unlink(user.signature_image);
//             }
//             updateData.signature_image = filePaths.signature_image;
//         }

//         if (Object.keys(updateData).length === 0) {
//             await transaction.rollback();
//             return res.status(400).json({
//                 success: 0,
//                 message: 'No fields provided for update'
//             });
//         }

//         await user.update(updateData, { transaction });

//         await transaction.commit();

//         return res.status(200).json({
//             success: 1,
//             message: 'User updated successfully'
//         });

//     } catch (error) {
//         await transaction.rollback();
//         console.error('Update user error:', error);

//         return res.status(500).json({
//             success: 0,
//             message: 'Internal server error'
//         });
//     }
// };

const getAllUsers = async (req, res) => {
    try {
        const branch_name = req.user.branch_name;

        if (!branch_name) {
            return res.status(400).json({
                success: 0,
                message: 'Admin does not belong to any branch'
            });
        }

        let { page, limit, search } = req.query;
        limit = Math.min(parseInt(limit) || 10, 100);
        page = parseInt(page) || 1;

        if (search && search.trim() !== '') {
            page = 1;
        }

        const offset = (page - 1) * limit;

        const whereClause = {
            role: 'user',
            is_deleted: false,
            branch_name: branch_name
        };

        if (search && search.trim() !== '') {
            whereClause[Op.or] = [
                { first_name: { [Op.like]: `%${search.trim()}%` } },
                { last_name: { [Op.like]: `%${search.trim()}%` } },
                { phone_number: { [Op.like]: `%${search.trim()}%` } },
                { aadhar_number: { [Op.like]: `%${search.trim()}%` } }
            ];
        }

        const { count, rows: users } = await User.findAndCountAll({
            where: whereClause,
            attributes: {
                exclude: ['password']
            },
            order: [['created_at', 'DESC']],
            limit,
            offset
        });

        return res.status(200).json({
            success: 1,
            message: 'Users fetched successfully',
            data: users,
            pagination: {
                page,
                limit,
                total: count
            }
        });

    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: 0,
            message: 'Internal server error'
        });
    }
};

const getUserVaults = async (req, res) => {
    try {
        const { user_id, page, limit, search } = req.query;
        const branch_name = req.user.branch_name;

        if (!user_id) {
            return res.status(400).json({
                success: 0,
                message: 'User ID is required'
            });
        }

        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({
                success: 0,
                message: 'User not found'
            });
        }

        // Branch Check
        if (user.branch_name !== branch_name) {
            return res.status(403).json({
                success: 0,
                message: 'Access denied: User belongs to another branch'
            });
        }

        let pageNumber = parseInt(page) || 1;
        let pageSize = parseInt(limit) || 10;

        if (search && search.trim() !== '') {
            pageNumber = 1;
        }

        const offset = (pageNumber - 1) * pageSize;

        const whereClause = {
            user_id
        };

        if (search && search.trim() !== '') {
            whereClause[Op.or] = [
                { vault_number: { [Op.like]: `%${search.trim()}%` } },
                { size: { [Op.like]: `%${search.trim()}%` } },
                { status: { [Op.like]: `%${search.trim()}%` } },
                { payment_status: { [Op.like]: `%${search.trim()}%` } }
            ];
        }

        // Fetch all matching vaults for summary (ignoring pagination)
        const allMatchingVaults = await Vault.findAll({
            where: whereClause,
            attributes: ['size', 'status', 'amount_due']
        });

        const { count, rows: vaults } = await Vault.findAndCountAll({
            where: whereClause,
            attributes: ['id', 'vault_number', 'size', 'status', 'assigned_at', 'payment_status', 'created_at', 'amount_due'],
            order: [['assigned_at', 'DESC']],
            limit: pageSize,
            offset
        });

        const totalAmountDue = allMatchingVaults.reduce((sum, vault) => {
            return sum + (parseFloat(vault.amount_due) || 0);
        }, 0);

        const vaultSummary = {
            total_matching_vaults: count,
            total_amount_due: totalAmountDue.toFixed(2),
            by_size: {
                small: allMatchingVaults.filter(v => v.size === 'small').length,
                medium: allMatchingVaults.filter(v => v.size === 'medium').length,
                large: allMatchingVaults.filter(v => v.size === 'large').length
            },
            statuses: {
                occupied: allMatchingVaults.filter(v => v.status === 'occupied').length,
                blocked: allMatchingVaults.filter(v => v.status === 'blocked').length
            }
        };

        return res.status(200).json({
            success: 1,
            data: {
                user_id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                phone_number: user.phone_number,
                vault_summary: vaultSummary,
                vaults: vaults
            },
            pagination: {
                page: pageNumber,
                limit: pageSize,
                total: count
            }
        });

    } catch (error) {
        console.error('Get user vaults error:', error);
        return res.status(500).json({
            success: 0,
            message: 'Internal server error'
        });
    }
};


const allotVault = async (req, res) => {
    const transaction = await User.sequelize.transaction();
    try {
        const { user_id, requests } = req.body;
        const requesterId = req.user.id;
        const requesterBranch = req.user.branch_name;
        const requestItems = requests;

        const user = await User.findByPk(user_id, { transaction });
        if (!user) {
            await transaction.rollback();
            return res.status(404).json({ success: 0, message: 'User not found' });
        }

        if (user.branch_name !== requesterBranch) {
            await transaction.rollback();
            return res.status(403).json({ success: 0, message: 'Admins can only allot vaults to users in their branch' });
        }

        if (!user.is_user_verified) {
            await transaction.rollback();
            return res.status(400).json({ success: 0, message: 'User is not verified yet. Please verify OTP first.' });
        }
        const vaultsToAssign = [];
        const pickedIds = [];

        for (const item of requestItems) {
            let { size, quantity } = item;
            quantity = quantity ? parseInt(quantity) : 1;

            const whereClause = {
                admin_user_id: requesterId,
                status: 'available',
                is_active: true
            };
            if (size) whereClause.size = size;
            if (pickedIds.length > 0) {
                whereClause.id = { [Op.notIn]: pickedIds };
            }

            const foundVaults = await Vault.findAll({
                where: whereClause,
                limit: quantity,
                transaction,
                lock: true
            });

            if (foundVaults.length < quantity) {
                await transaction.rollback();
                const found = foundVaults.length;
                return res.status(400).json({
                    success: 0,
                    message: `Insufficient availability. Requested ${quantity}${size ? ` '${size}'` : ''} vaults, but found ${found} available.`
                });
            }

            foundVaults.forEach(v => {
                vaultsToAssign.push(v);
                pickedIds.push(v.id);
            });
        }

        const assignedDate = new Date();
        const expiresDate = new Date(assignedDate);
        expiresDate.setMonth(expiresDate.getMonth() + 1);


        const pricings = await VaultPricing.findAll({ transaction });
        const priceMap = {};
        pricings.forEach(p => {
            priceMap[p.size] = parseFloat(p.price);
        });

        const vaultNumbers = [];

        for (const v of vaultsToAssign) {
            await v.update({
                status: 'occupied',
                user_id: user.id,
                assigned_at: assignedDate,
                expires_at: expiresDate,
                payment_status: 'paid',
                assigned_price: priceMap[v.size] || 0

            }, { transaction });
            vaultNumbers.push(v.vault_number);
        }

        await user.update({ is_vault_alloted: true }, { transaction });

        const allVaults = await Vault.findAll({
            where: { user_id: user.id },
            attributes: ['vault_number', 'size'],
            transaction
        });
        const totalVaults = allVaults.length;
        const allVaultNumbers = allVaults.map(v => v.vault_number);

        const sizeBreakdown = { small: 0, medium: 0, large: 0 };
        allVaults.forEach(v => {
            if (v.size && sizeBreakdown[v.size] !== undefined) {
                sizeBreakdown[v.size]++;
            }
        });

        await transaction.commit();

        return res.status(200).json({
            success: 1,
            message: `${vaultNumbers.length} Vaults allotted successfully. User now has ${totalVaults} vaults in total.`,
            data: {
                user_id: user.id,
                newly_allotted: vaultNumbers,
                total_vaults: totalVaults,
                size_breakdown: sizeBreakdown,
                all_vault_numbers: allVaultNumbers,
                is_vault_alloted: true
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Allot vault error:', error);
        return res.status(500).json({ success: 0, message: 'Internal server error' });
    }
};


const updateNomineeStatus = async (req, res) => {
    const transaction = await User.sequelize.transaction();
    try {
        const { nominee_id, status } = req.body;
        const adminId = req.user.id;

        const nominee = await Nominee.findOne({
            where: {
                id: nominee_id,
                admin_user_id: adminId
            },
            transaction
        });

        if (!nominee) {
            await transaction.rollback();
            return res.status(404).json({
                success: 0,
                message: 'Nominee not found or does not belong to your branch'
            });
        }

        if (nominee.status !== 'pending') {
            await transaction.rollback();
            return res.status(400).json({
                success: 0,
                message: `Nominee is already ${nominee.status}`
            });
        }


        const statusMap = {
            '1': 'approved',
            1: 'approved',
            '0': 'rejected',
            0: 'rejected'
        };

        const mappedStatus = statusMap[status];

        await nominee.update({
            status: mappedStatus,
            approved_by: adminId,
            approved_at: new Date()
        }, { transaction });

        await transaction.commit();

        return res.status(200).json({
            success: 1,
            message: `Nominee request ${mappedStatus} successfully`
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Update nominee status error:', error);
        return res.status(500).json({
            success: 0,
            message: 'Internal server error'
        });
    }
};


const setPricing = async (req, res) => {
    const transaction = await VaultPricing.sequelize.transaction();
    try {
        const { pricing } = req.body; // Expect array: [{ size: 'small', price: 100 }, ...]
        const adminId = req.user.id;

        if (!Array.isArray(pricing)) {
            return res.status(400).json({ success: 0, message: 'Pricing must be an array' });
        }

        const validSizes = ['small', 'medium', 'large'];

        for (const item of pricing) {
            if (!validSizes.includes(item.size)) {
                await transaction.rollback();
                return res.status(400).json({ success: 0, message: `Invalid size: ${item.size}` });
            }

            const existingPricing = await VaultPricing.findOne({
                where: {
                    admin_user_id: adminId,
                    size: item.size
                },
                transaction
            });

            if (existingPricing) {
                await existingPricing.update({
                    price: item.price,
                    updated_by: adminId
                }, { transaction });
            } else {
                await VaultPricing.create({
                    admin_user_id: adminId,
                    size: item.size,
                    price: item.price,
                    updated_by: adminId
                }, { transaction });
            }
        }

        await transaction.commit();

        return res.status(200).json({
            success: 1,
            message: 'Pricing updated successfully',
            data: pricing
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Set pricing error:', error);
        return res.status(500).json({ success: 0, message: 'Internal server error' });
    }
};


const addBranch = async (req, res) => {
    const transaction = await User.sequelize.transaction();
    try {
        const {
            branch_name,
            branch_address,
            branch_city,
            branch_state,
            branch_country,
            branch_pincode,
            branch_phone_number,
            branch_email,
            branch_password,
            iso_code
        } = req.body;

        const adminId = req.user.id;

        // Check if branch name exists
        const existingBranchName = await Branch.findOne({
            where: { branch_name },
            transaction
        });

        if (existingBranchName) {
            await transaction.rollback();
            return res.status(409).json({
                success: 0,
                message: 'Branch with this name already exists'
            });
        }

        // Check if branch email exists
        const existingBranchEmail = await Branch.findOne({
            where: { branch_email },
            transaction
        });

        if (existingBranchEmail) {
            await transaction.rollback();
            return res.status(409).json({
                success: 0,
                message: 'Branch with this email already exists'
            });
        }

        // Check if branch phone number exists
        const existingBranchPhone = await Branch.findOne({
            where: { branch_phone_number },
            transaction
        });

        if (existingBranchPhone) {
            await transaction.rollback();
            return res.status(409).json({
                success: 0,
                message: 'Branch with this phone number already exists'
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(branch_password, 10);

        const newBranch = await Branch.create({
            user_id: adminId, // The Admin owns this branch
            branch_owner_name: req.user.first_name + ' ' + req.user.last_name,
            branch_name,
            branch_address,
            branch_city,
            branch_state,
            branch_country,
            branch_iso_code: iso_code,
            branch_pincode,
            branch_phone_number,
            branch_email,
            branch_password: hashedPassword,
            branch_is_active: true
        }, { transaction });

        await transaction.commit();

        const branchResponse = newBranch.toJSON();
        delete branchResponse.branch_password;

        return res.status(201).json({
            success: 1,
            message: 'Branch created successfully',
            data: branchResponse
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Add branch error:', error);
        return res.status(500).json({ success: 0, message: 'Internal server error' });
    }
};


const updateBranch = async (req, res) => {
    const transaction = await User.sequelize.transaction();
    try {
        const {
            branch_id,
            branch_name,
            branch_address,
            branch_city,
            branch_state,
            branch_country,
            branch_pincode,
            branch_phone_number,
            branch_email,
            branch_is_active,
            iso_code
        } = req.body;

        const adminId = req.user.id;

        if (!branch_id) {
            await transaction.rollback();
            return res.status(400).json({ success: 0, message: 'Branch ID is required' });
        }

        const branch = await Branch.findOne({
            where: { id: branch_id, user_id: adminId },
            transaction
        });

        if (!branch) {
            await transaction.rollback();
            return res.status(404).json({ success: 0, message: 'Branch not found or permission denied' });
        }

        if (branch_name && branch_name !== branch.branch_name) {
            const existingBranch = await Branch.findOne({
                where: { branch_name, id: { [Op.ne]: branch_id } },
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

        if (branch_email && branch_email !== branch.branch_email) {
            const existingEmail = await Branch.findOne({
                where: { branch_email, id: { [Op.ne]: branch_id } },
                transaction
            });

            if (existingEmail) {
                await transaction.rollback();
                return res.status(409).json({
                    success: 0,
                    message: 'Branch with this email already exists'
                });
            }
        }

        if (branch_phone_number && branch_phone_number !== branch.branch_phone_number) {
            const existingPhone = await Branch.findOne({
                where: { branch_phone_number, id: { [Op.ne]: branch_id } },
                transaction
            });

            if (existingPhone) {
                await transaction.rollback();
                return res.status(409).json({
                    success: 0,
                    message: 'Branch with this phone number already exists'
                });
            }
        }

        const updateData = {};
        if (branch_name !== undefined) updateData.branch_name = branch_name;
        if (branch_address !== undefined) updateData.branch_address = branch_address;
        if (branch_city !== undefined) updateData.branch_city = branch_city;
        if (branch_state !== undefined) updateData.branch_state = branch_state;
        if (branch_country !== undefined) updateData.branch_country = branch_country;
        if (branch_pincode !== undefined) updateData.branch_pincode = branch_pincode;
        if (branch_phone_number !== undefined) updateData.branch_phone_number = branch_phone_number;
        if (branch_email !== undefined) updateData.branch_email = branch_email;
        if (branch_is_active !== undefined) updateData.branch_is_active = branch_is_active;
        if (iso_code !== undefined) updateData.branch_iso_code = iso_code;

        await branch.update(updateData, { transaction });

        await transaction.commit();

        return res.status(200).json({
            success: 1,
            message: 'Branch updated successfully',
            data: branch
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Update branch error:', error);
        return res.status(500).json({ success: 0, message: 'Internal server error' });
    }
};

const deleteBranch = async (req, res) => {
    const transaction = await User.sequelize.transaction();
    try {
        const { branch_id } = req.body;
        const adminId = req.user.id;

        if (!branch_id) {
            await transaction.rollback();
            return res.status(400).json({ success: 0, message: 'Branch ID is required' });
        }

        const branch = await Branch.findOne({
            where: {
                id: branch_id,
                user_id: adminId,
                branch_is_deleted: false
            },
            transaction
        });

        if (!branch) {
            await transaction.rollback();
            return res.status(404).json({ success: 0, message: 'Branch not found or already deleted' });
        }

        // Soft delete the branch
        await branch.update({
            branch_is_deleted: true,
            branch_is_active: false
        }, { transaction });

        // De-associate any managers assigned to this branch
        await User.update(
            {
                branch_id: null,
                branch_name: null
            },
            {
                where: {
                    branch_id: branch_id,
                    role: 'manager'
                },
                transaction
            }
        );

        await transaction.commit();

        return res.status(200).json({
            success: 1,
            message: 'Branch deleted successfully',
            data: {
                id: branch.id,
                branch_name: branch.branch_name,
                branch_is_deleted: true
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Delete branch error:', error);
        return res.status(500).json({ success: 0, message: 'Internal server error' });
    }
};

const configureBranchVaults = async (req, res) => {
    const transaction = await User.sequelize.transaction();
    try {
        const adminId = req.user.id;
        const { branch_id, vaults } = req.body;

        // Verify branch belongs to admin
        const branch = await Branch.findOne({
            where: { id: branch_id, user_id: adminId },
            transaction
        });

        if (!branch) {
            await transaction.rollback();
            return res.status(404).json({
                success: 0,
                message: 'Branch not found or you do not have permission to manage it'
            });
        }

        const results = {
            pricing_updated: [],
            vaults_created: [],
            total_vaults_created: 0
        };

        // Get last vault number for this admin (sort by vault_number to get the highest existing number)
        const lastVault = await Vault.findOne({
            where: { admin_user_id: adminId },
            order: [['vault_number', 'DESC']],
            transaction
        });

        let vaultCounter = 1;
        if (lastVault) {
            const match = lastVault.vault_number.match(/\d+$/);
            if (match) {
                vaultCounter = parseInt(match[0]) + 1;
            }
        }

        // Process each vault configuration
        for (const config of vaults) {
            const { size, price, quantity } = config;

            // Update or create pricing for this branch
            const [pricing, created] = await VaultPricing.findOrCreate({
                where: {
                    branch_id: branch_id,
                    size: size
                },
                defaults: {
                    admin_user_id: adminId,
                    branch_id: branch_id,
                    size: size,
                    price: price,
                    updated_by: adminId
                },
                transaction
            });

            if (!created && pricing.price !== price) {
                await pricing.update({
                    price: price,
                    updated_by: adminId
                }, { transaction });
            }

            results.pricing_updated.push({
                size: size,
                price: price,
                action: created ? 'created' : 'updated'
            });

            // Check current vault count for this branch and size
            const currentCount = await Vault.count({
                where: {
                    admin_user_id: adminId,
                    branch_id: branch_id,
                    size: size
                },
                transaction
            });

            // Create new vaults if needed
            if (quantity > currentCount) {
                const toCreate = quantity - currentCount;
                const createdVaults = [];

                for (let i = 0; i < toCreate; i++) {
                    const vaultNumber = `V${String(vaultCounter).padStart(4, '0')}`;

                    await Vault.create({
                        admin_user_id: adminId,
                        branch_id: branch_id,
                        vault_number: vaultNumber,
                        size: size,
                        status: 'available',
                        is_active: true
                    }, { transaction });

                    createdVaults.push(vaultNumber);
                    vaultCounter++;
                }

                results.vaults_created.push({
                    size: size,
                    count: toCreate,
                    vault_numbers: createdVaults
                });
                results.total_vaults_created += toCreate;
            }
        }

        await transaction.commit();

        return res.status(200).json({
            success: 1,
            message: `Branch configuration updated successfully for ${branch.branch_name}`,
            data: results
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Configure branch vaults error:', error);
        return res.status(500).json({
            success: 0,
            message: 'Internal server error'
        });
    }
};

const configureVaults = async (req, res) => {
    const transaction = await User.sequelize.transaction();
    try {
        const adminId = req.user.id;
        const { branch_id } = req.body; // Branch ID is now required

        if (!branch_id) {
            return res.status(400).json({ success: 0, message: 'Branch ID is required to configure vaults' });
        }

        // Verify Branch belongs to Admin
        const branch = await Branch.findOne({
            where: { id: branch_id, user_id: adminId }
        });

        if (!branch) {
            return res.status(404).json({ success: 0, message: 'Branch not found or does not belong to you' });
        }

        const config = [
            {
                size: 'small',
                total: parseInt(req.body.vault_small_total) || 0,
                maintenance: parseInt(req.body.vault_small_maintenance) || 0
            },
            {
                size: 'medium',
                total: parseInt(req.body.vault_medium_total) || 0,
                maintenance: parseInt(req.body.vault_medium_maintenance) || 0
            },
            {
                size: 'large',
                total: parseInt(req.body.vault_large_total) || 0,
                maintenance: parseInt(req.body.vault_large_maintenance) || 0
            }
        ];

        let createdCount = 0;
        let createdDetails = [];

        // Determine starting vault number for this admin (global sequence or per branch? Let's keep it per admin sequence for uniqueness safety, or per branch)
        // Let's stick to per-Admin sequence to avoid duplicate V-numbers for the same Admin
        const lastVault = await Vault.findOne({
            where: { admin_user_id: adminId },
            order: [['created_at', 'DESC']],
            transaction
        });

        // Extract number from last vault (e.g., V0050 -> 50)
        let vaultCounter = 1;
        if (lastVault) {
            const match = lastVault.vault_number.match(/\d+$/); // Extract numeric part
            if (match) {
                vaultCounter = parseInt(match[0]) + 1;
            }
        }

        for (const item of config) {
            // Check count for THIS branch only
            const currentCount = await Vault.count({
                where: {
                    admin_user_id: adminId,
                    branch_id: branch_id,
                    size: item.size
                },
                transaction
            });

            if (item.total > currentCount) {
                const toAdd = item.total - currentCount;
                for (let i = 0; i < toAdd; i++) {
                    const vaultNumber = `V${String(vaultCounter).padStart(4, '0')}`;

                    await Vault.create({
                        admin_user_id: adminId,
                        branch_id: branch_id, // Link to Branch
                        vault_number: vaultNumber,
                        size: item.size,
                        status: 'available'
                    }, { transaction });

                    createdDetails.push({ vault_number: vaultNumber, size: item.size });
                    createdCount++;
                    vaultCounter++;
                }
            }
        }

        await transaction.commit();

        return res.status(200).json({
            success: 1,
            message: `Configuration updated for ${branch.branch_name}. Created ${createdCount} new vaults.`,
            data: createdDetails
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Configure vaults error:', error);
        return res.status(500).json({ success: 0, message: 'Internal server error' });
    }
};

const getBranchVaultConfig = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { branch_id } = req.query;

        if (!branch_id) {
            return res.status(400).json({
                success: 0,
                message: "Branch ID is required"
            });
        }

        // Verify Branch belongs to Admin
        const branch = await Branch.findOne({
            where: { id: branch_id, user_id: adminId }
        });

        if (!branch) {
            return res.status(404).json({
                success: 0,
                message: "Branch not found or does not belong to you"
            });
        }

        const validSizes = ['small', 'medium', 'large'];
        const responseVaults = [];

        for (const size of validSizes) {
            // Get pricing
            const pricing = await VaultPricing.findOne({
                where: { branch_id, size }
            });

            // Get count
            const count = await Vault.count({
                where: { branch_id, size, admin_user_id: adminId }
            });

            responseVaults.push({
                size: size,
                price: pricing ? parseFloat(pricing.price) : 0,
                quantity: count
            });
        }

        return res.status(200).json({
            success: 1,
            message: "Branch vault configuration fetched successfully",
            data: {
                branch_id: parseInt(branch_id),
                vaults: responseVaults
            }
        });

    } catch (error) {
        console.error('Get branch vault config error:', error);
        return res.status(500).json({
            success: 0,
            message: "Internal server error"
        });
    }
};

const getBranches = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { search, page, limit } = req.query;

        let whereClause = {
            user_id: adminId,
            branch_is_deleted: false
        };

        if (search && search.trim() !== '') {
            whereClause[Op.or] = [
                { branch_name: { [Op.like]: `%${search}%` } },
                { branch_email: { [Op.like]: `%${search}%` } },
                { branch_phone_number: { [Op.like]: `%${search}%` } }
            ];
        }

        const pageNumber = parseInt(page) || 1;
        const pageSize = parseInt(limit) || 10;
        const offset = (pageNumber - 1) * pageSize;

        const { count, rows: branches } = await Branch.findAndCountAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            limit: pageSize,
            offset: offset
        });

        // Hide sensitive data like password if any
        const safeBranches = branches.map(b => {
            const json = b.toJSON();
            delete json.branch_password;
            return json;
        });

        return res.status(200).json({
            success: 1,
            message: "Branches fetched successfully",
            data: safeBranches,
            pagination: {
                total: count,
                page: pageNumber,
                limit: pageSize,
                total_pages: Math.ceil(count / pageSize)
            }
        });

    } catch (error) {
        console.error('Get branches error:', error);
        return res.status(500).json({
            success: 0,
            message: "Internal server error"
        });
    }
};


const getManagers = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { search, page, limit } = req.query;

        let whereClause = {
            created_by: adminId,
            role: 'manager',
            is_deleted: false
        };

        if (search && search.trim() !== '') {
            whereClause[Op.or] = [
                { first_name: { [Op.like]: `%${search}%` } },
                { last_name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { phone_number: { [Op.like]: `%${search}%` } }
            ];
        }

        const pageNumber = parseInt(page) || 1;
        const pageSize = parseInt(limit) || 10;
        const offset = (pageNumber - 1) * pageSize;

        const { count, rows: managers } = await User.findAndCountAll({
            where: whereClause,
            attributes: { exclude: ['password'] },
            order: [['created_at', 'DESC']],
            limit: pageSize,
            offset: offset
        });

        return res.status(200).json({
            success: 1,
            message: "Managers fetched successfully",
            data: managers,
            pagination: {
                total: count,
                page: pageNumber,
                limit: pageSize,
                total_pages: Math.ceil(count / pageSize)
            }
        });

    } catch (error) {
        console.error('Get managers error:', error);
        return res.status(500).json({
            success: 0,
            message: "Internal server error"
        });
    }
};

module.exports = {
    // addUser,
    // login,
    // updateUser,
    allotVault,
    getUserVaults,
    getAllUsers,
    updateNomineeStatus,
    setPricing,
    configureVaults,
    configureBranchVaults,
    addBranch,
    updateBranch,
    deleteBranch,
    getBranches,
    getManagers,
    getBranchVaultConfig
};