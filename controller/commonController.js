const { User, Device, Nominee, Vault, Sequelize, sequelize, Otp, Branch } = require("../config/db");
const fs = require("fs").promises;
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { Op } = Sequelize;
const { normalizePhoneNumber } = require("../helper/phoneHelper");
const { extractFilePaths, extractFiles } = require("../helper/fileUploadHelper");
const { generateToken } = require("../helper/tokenHelper");




const login = async (req, res) => {
    try {
        const { email, password, device_id, device_type } = req.body;

        let role;

        if (req.baseUrl.includes('/super-admin')) {
            role = 'super_admin';
        } else if (req.baseUrl.includes('/admin')) {
            role = 'admin';
        } else if (req.baseUrl.includes('/user')) {
            role = 'user';
        }

        // 🛑 Safety check (VERY important)
        if (!role) {
            return res.status(400).json({
                success: 0,
                message: 'Invalid login route'
            });
        }

        const user = await User.findOne({
            where: {
                email,
                role,
                is_deleted: false,
                is_blocked: false
            }
        });

        if (!user) {
            return res.status(401).json({
                success: 0,
                message: 'Invalid credentials'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: 0,
                message: 'Invalid credentials'
            });
        }

        await user.update({ last_login_at: new Date() });

        const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role
        };

        if (user.role === 'admin') {
            tokenPayload.branch_name = user.branch_name;
        }

        const token = generateToken(tokenPayload, '24h');

        const { saveToken } = require("../helper/tokenHelper");
        await saveToken(user.id, device_id || 'unknown', device_type || 'web', token);

        const response = {
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role
            },
            token
        };

        // 🔥 Admin-only data
        if (user.role === 'admin') {
            const vaults = await Vault.findAll({
                where: {
                    admin_user_id: user.id,
                    status: 'available',
                    is_active: true
                },
                attributes: ['size']
            });

            const stats = { small: 0, medium: 0, large: 0 };
            vaults.forEach(v => stats[v.size]++);

            response.vault_stats = {
                total_available: vaults.length,
                available_by_size: stats
            };
        }

        return res.status(200).json({
            success: 1,
            message: 'Login successful',
            data: response
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: 0,
            message: 'Internal server error'
        });
    }
};



const verifyOtp = async (req, res) => {
    try {
        let { phone_number, otp_code, is_login } = req.body;

        phone_number = String(phone_number);
        otp_code = String(otp_code);

        const otpRecord = await Otp.findOne({
            where: {
                phone_number,
                is_used: false,
            },
            order: [["created_at", "DESC"]],
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: 0,
                message: "Invalid OTP",
            });
        }
        if (new Date() > otpRecord.expires_at) {
            return res.status(400).json({
                success: 0,
                message: "OTP has expired",
            });
        }

        if (otpRecord.otp_code !== otp_code) {
            return res.status(400).json({
                success: 0,
                message: "Invalid OTP",
            });
        }
        await otpRecord.update({ is_used: true });

        const user = await User.findOne({ where: { phone_number } });
        let responseData = {};

        if (user) {
            await user.update({
                is_otp_verified: true,
                is_user_verified: true,
                last_login_at: new Date(),
            });

            if (is_login) {
                if (user.is_deleted || user.is_blocked) {
                    return res.status(401).json({
                        success: 0,
                        message: "User account is not active",
                    });
                }

                const token = generateToken(
                    {
                        id: user.id,
                        email: user.email,
                        phone_number: user.phone_number,
                        role: user.role,
                    },
                    "30d",
                );

                // Save token to DB
                const { device_id, device_type } = req.body;

                const { saveToken } = require("../helper/tokenHelper");
                await saveToken(user.id, device_id || 'unknown', device_type || 'web', token);

                responseData = {
                    user: {
                        id: user.id,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        phone_number: user.phone_number,
                        role: user.role,
                    },
                    token: token,
                };
            }
        }

        return res.status(200).json({
            success: 1,
            message: is_login
                ? "Login successful"
                : "OTP verified successfully. User is now verified.",
            data: is_login ? responseData : undefined,
        });
    } catch (error) {
        console.error("Verify OTP error:", error);
        return res.status(500).json({
            success: 0,
            message: "Internal server error",
        });
    }
};

const addNominee = async (req, res) => {
    const transaction = await User.sequelize.transaction();
    try {
        const {
            first_name,
            last_name,
            relation,
            phone_number,
            iso_code,
            address,
            pincode,
            aadhar_number,
        } = req.body;

        const requesterRole = req.user.role;
        let userId;
        let status;
        let nominatedBy = req.user.id;
        let approvedBy = null;
        let approvedAt = null;

        if (requesterRole === "super_admin") {
            userId = req.body.user_id;
            if (!userId) {
                await transaction.rollback();
                return res
                    .status(400)
                    .json({ success: 0, message: "User ID is required" });
            }
            status = "approved";
            approvedBy = req.user.id;
            approvedAt = new Date();
        } else {
            // Role is 'user'
            userId = req.user.id;
            status = "pending";
        }

        const user = await User.findByPk(userId);
        if (!user) {
            await transaction.rollback();
            return res.status(404).json({ success: 0, message: "User not found" });
        }

        const branchAdmin = await User.findOne({
            where: {
                branch_name: user.branch_name,
                role: "admin",
            },
        });

        if (!branchAdmin) {
            await transaction.rollback();
            return res.status(404).json({
                success: 0,
                message: "Branch admin not found for this user",
            });
        }

        const nomineeCount = await Nominee.count({
            where: { user_id: userId },
            transaction,
        });

        if (nomineeCount >= 5) {
            await transaction.rollback();
            return res.status(400).json({
                success: 0,
                message: "Maximum limit of 5 nominees reached for this user",
            });
        }

        const { message } = normalizePhoneNumber(phone_number, iso_code);
        if (status == 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: 0,
                message: message,
            });
        }

        const existingNominee = await Nominee.findOne({
            where: {
                user_id: userId,
                [Op.or]: [
                    { aadhar_number: aadhar_number },
                    { phone_number: phone_number },
                ],
            },
        });

        if (existingNominee) {
            await transaction.rollback();
            let message = "Nominee with this details already exists";
            if (existingNominee.aadhar_number === aadhar_number) {
                message = "Nominee with this Aadhar number already exists";
            } else if (existingNominee.phone_number === phone_number) {
                message = "Nominee with this Phone number already exists";
            }
            return res.status(400).json({
                success: 0,
                message,
            });
        }

        if (!req.files || !req.files.aadhar_front_image || !req.files.aadhar_back_image || !req.files.signature_image) {
            await transaction.rollback();
            return res.status(400).json({
                success: 0,
                message: 'Please upload all required documents: Aadhar front, Aadhar back, and Signature'
            });
        }

        const filePaths = extractFiles(req.files, [
            "aadhar_front_image",
            "aadhar_back_image",
            "signature_image",
        ]);

        const newNominee = await Nominee.create(
            {
                user_id: userId,
                admin_user_id: branchAdmin.id,
                nominated_by: nominatedBy,
                first_name,
                last_name,
                relation,
                phone_number,
                iso_code,
                address,
                pincode,
                aadhar_number,
                aadhar_front_image: filePaths.aadhar_front_image,
                aadhar_back_image: filePaths.aadhar_back_image,
                signature_image: filePaths.signature_image,
                approved_by: approvedBy,
                approved_at: approvedAt,
            },
            { transaction },
        );

        await transaction.commit();

        const responseData = newNominee.toJSON();
        delete responseData.admin_user_id;
        responseData.branch_name = user.branch_name;

        return res.status(201).json({
            success: 1,
            message:
                requesterRole === "super_admin"
                    ? "Nominee added successfully by Super Admin"
                    : "Nominee added successfully",
            data: responseData,
        });
    } catch (error) {
        await transaction.rollback();
        console.error("Add nominee error:", error);
        return res.status(500).json({
            success: 0,
            message: "Internal server error",
        });
    }
};

const toggleBlockStatus = async (req, res) => {
    const transaction = await User.sequelize.transaction();
    try {
        const { user_id, is_blocked, reason } = req.body;
        const requesterId = req.user.id;
        const requesterRole = req.user.role;
        const requesterBranch = req.user.branch_name;

        if (parseInt(user_id) === requesterId) {
            await transaction.rollback();
            return res.status(403).json({
                success: 0,
                message: "You cannot block or unblock yourself",
            });
        }

        const targetUser = await User.findByPk(user_id, { transaction });
        if (!targetUser) {
            await transaction.rollback();
            return res.status(404).json({
                success: 0,
                message: "User not found",
            });
        }

        if (requesterRole === "admin") {
            if (targetUser.role === "super_admin" || targetUser.role === "admin") {
                await transaction.rollback();
                return res.status(403).json({
                    success: 0,
                    message:
                        "Admins cannot block potentially privileged users (Admins or Super Admins)",
                });
            }

            if (targetUser.branch_name !== requesterBranch) {
                await transaction.rollback();
                return res.status(403).json({
                    success: 0,
                    message: "Admins can only manage users within their own branch",
                });
            }
        }

        const updateData = {
            is_blocked: is_blocked,
            blocked_reason: is_blocked ? reason : null,
            blocked_at: is_blocked ? new Date() : null,
            blocked_by: is_blocked ? requesterId : null,
        };

        if (!is_blocked) {
            updateData.blocked_reason = null;
            updateData.blocked_at = null;
            updateData.blocked_by = null;
        }

        await targetUser.update(updateData, { transaction });

        await transaction.commit();

        return res.status(200).json({
            success: 1,
            message: `User ${is_blocked ? "blocked" : "unblocked"} successfully`,
            data: {
                id: targetUser.id,
                is_blocked: targetUser.is_blocked,
                blocked_at: targetUser.blocked_at,
            },
        });
    } catch (error) {
        await transaction.rollback();
        console.error("Toggle block status error:", error);
        return res.status(500).json({
            success: 0,
            message: "Internal server error",
        });
    }
};

const deleteUser = async (req, res) => {
    const transaction = await User.sequelize.transaction();
    try {
        const { user_id, deleted_reason } = req.body;
        const requesterId = req.user.id;
        const requesterRole = req.user.role;
        const requesterBranch = req.user.branch_name;

        if (parseInt(user_id) === requesterId) {
            await transaction.rollback();
            return res.status(403).json({
                success: 0,
                message: "You cannot delete yourself",
            });
        }

        const targetUser = await User.findByPk(user_id, { transaction });
        if (!targetUser) {
            await transaction.rollback();
            return res.status(404).json({
                success: 0,
                message: "User not found",
            });
        }

        if (targetUser.is_deleted) {
            await transaction.rollback();
            return res.status(400).json({
                success: 0,
                message: "User is already deleted",
            });
        }

        if (requesterRole === "admin") {
            if (targetUser.role === "super_admin" || targetUser.role === "admin") {
                await transaction.rollback();
                return res.status(403).json({
                    success: 0,
                    message:
                        "Admins cannot delete potentially privileged users (Admins or Super Admins)",
                });
            }

            if (targetUser.branch_name !== requesterBranch && targetUser.created_by !== requesterId) {
                await transaction.rollback();
                return res.status(403).json({
                    success: 0,
                    message: "Admins can only delete users within their own branch or managers they created",
                });
            }
        }

        // Delete user documents
        if (targetUser.aadhar_front_image) {
            try {
                await fs.unlink(targetUser.aadhar_front_image);
            } catch (e) {
                console.error("Error deleting aadhar_front_image:", e);
            }
        }
        if (targetUser.aadhar_back_image) {
            try {
                await fs.unlink(targetUser.aadhar_back_image);
            } catch (e) {
                console.error("Error deleting aadhar_back_image:", e);
            }
        }
        if (targetUser.signature_image) {
            try {
                await fs.unlink(targetUser.signature_image);
            } catch (e) {
                console.error("Error deleting signature_image:", e);
            }
        }

        await targetUser.update(
            {
                is_deleted: true,
                deleted_reason: deleted_reason || "Deleted by admin",
                status: "inactive",
                updated_at: new Date(),
            },
            { transaction },
        );

        await transaction.commit();

        return res.status(200).json({
            success: 1,
            message: "User deleted successfully",
            data: {
                id: targetUser.id,
                is_deleted: true,
                deleted_at: new Date(),
            },
        });
    } catch (error) {
        await transaction.rollback();
        console.error("Delete user error:", error);
        res.status(500).json({
            success: 0,
            message: "Internal server error",
        });
    }
};

const logout = async (req, res) => {
    try {
        if (req.activeToken) {
            await req.activeToken.destroy();
        }

        return res.status(200).json({
            success: 1,
            message: "Logged out successfully",
        });
    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({
            success: 0,
            message: "Internal server error",
        });
    }
};

const getMe = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findByPk(userId, {
            attributes: { exclude: ["password"] },
        });

        if (!user) {
            return res.status(404).json({
                success: 0,
                message: "User not found",
            });
        }

        if (user.is_deleted || user.is_blocked) {
            return res.status(401).json({
                success: 0,
                message: "User account is not active",
            });
        }

        if (user.role === "admin") {
            const vaults = await Vault.findAll({
                where: {
                    admin_user_id: userId,
                    is_active: true,
                },
                attributes: ["size", "status"],
            });

            const vaultStats = {
                total_inventory: vaults.length,
                inventory_by_size: {
                    small: vaults.filter((v) => v.size === "small").length,
                    medium: vaults.filter((v) => v.size === "medium").length,
                    large: vaults.filter((v) => v.size === "large").length,
                },
                available_by_size: {
                    small: vaults.filter(
                        (v) => v.size === "small" && v.status === "available",
                    ).length,
                    medium: vaults.filter(
                        (v) => v.size === "medium" && v.status === "available",
                    ).length,
                    large: vaults.filter(
                        (v) => v.size === "large" && v.status === "available",
                    ).length,
                },
                statuses: {
                    occupied: vaults.filter((v) => v.status === "occupied").length,
                    blocked: vaults.filter((v) => v.status === "blocked").length,
                    available: vaults.filter((v) => v.status === "available").length,
                },
            };

            return res.status(200).json({
                success: 1,
                data: {
                    ...user.toJSON(),
                    vault_stats: vaultStats,
                },
            });
        } else {
            return res.status(200).json({
                success: 1,
                data: user,
            });
        }
    } catch (error) {
        console.error("Get Me error:", error);
        return res.status(500).json({
            success: 0,
            message: "Internal server error",
        });
    }
};

const deleteNominee = async (req, res) => {
    const transaction = await User.sequelize.transaction();
    try {
        const { id } = req.query;
        const userId = req.user.id;

        if (!id) {
            await transaction.rollback();
            return res.status(400).json({
                success: 0,
                message: "Nominee ID is required",
            });
        }

        const nominee = await Nominee.findOne({
            where: {
                id,
                user_id: userId,
            },
        });

        if (!nominee) {
            await transaction.rollback();
            return res.status(404).json({
                success: 0,
                message: "Nominee not found",
            });
        }

        // Delete associated files
        if (nominee.aadhar_front_image) {
            try {
                await fs.unlink(nominee.aadhar_front_image);
            } catch (e) {
                console.error("Error deleting file:", e);
            }
        }
        if (nominee.aadhar_back_image) {
            try {
                await fs.unlink(nominee.aadhar_back_image);
            } catch (e) {
                console.error("Error deleting file:", e);
            }
        }

        await nominee.destroy({ transaction });
        await transaction.commit();

        return res.status(200).json({
            success: 1,
            message: "Nominee deleted successfully",
        });
    } catch (error) {
        await transaction.rollback();
        console.error("Delete nominee error:", error);
        return res.status(500).json({
            success: 0,
            message: "Internal server error",
        });
    }
};

const getNominees = async (req, res) => {
    try {
        const requesterId = req.user.id;
        const requesterRole = req.user.role;
        let { status, page, limit, search } = req.query;

        limit = Math.min(parseInt(limit) || 10, 100);
        page = parseInt(page) || 1;
        if (search && search.trim() !== "") {
            page = 1;
        }

        const offset = (page - 1) * limit;

        let whereClause = {};
        let includeOptions = [];
        let orderOptions = [["created_at", "DESC"]];

        if (requesterRole === "admin") {
            // Admin sees nominees assigned to their branch (admin_user_id)
            whereClause.admin_user_id = requesterId;
            if (status) {
                whereClause.status = status;
            }
            includeOptions.push({
                model: User,
                as: "user",
                attributes: ["id", "first_name", "last_name", "phone_number"],
            });
            orderOptions = [["created_at", "ASC"]]; // Admin usually processes oldest first
        } else {
            // User sees their OWN nominees
            whereClause.user_id = requesterId;
        }

        // Search Logic
        if (search && search.trim() !== "") {
            const searchClause = {
                [Op.or]: [
                    { first_name: { [Op.like]: `%${search.trim()}%` } },
                    { last_name: { [Op.like]: `%${search.trim()}%` } },
                    { phone_number: { [Op.like]: `%${search.trim()}%` } },
                    { relation: { [Op.like]: `%${search.trim()}%` } },
                    { aadhar_number: { [Op.like]: `%${search.trim()}%` } },
                ],
            };
            // Combine existing whereClause with searchClause
            whereClause = { ...whereClause, ...searchClause };
        }

        const { count, rows: nominees } = await Nominee.findAndCountAll({
            where: whereClause,
            include: includeOptions,
            order: orderOptions,
            limit,
            offset,
            distinct: true, // Important for correct count with includes
        });

        let responseData = nominees;

        // Special formatting for Users (Customer)
        if (requesterRole === "user") {
            const user = await User.findByPk(requesterId);
            responseData = nominees.map((nominee) => {
                const data = nominee.toJSON();
                delete data.admin_user_id;
                data.branch_name = user ? user.branch_name : null;
                return data;
            });
        }

        return res.status(200).json({
            success: 1,
            message: "Nominees fetched successfully",
            data: responseData,
            pagination: {
                total_records: count,
                total_pages: Math.ceil(count / limit),
                current_page: page,
                limit,
            },
        });
    } catch (error) {
        console.error("Get nominees error:", error);
        return res.status(500).json({
            success: 0,
            message: "Internal server error",
        });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const requesterRole = req.user.role;
        const requesterBranch = req.user.branch_name;

        let { branch_name, status, page, limit, search } = req.query;
        limit = Math.min(parseInt(limit) || 10, 100);
        page = parseInt(page) || 1;
        if (search && search.trim() !== "") {
            page = 1;
        }

        const offset = (page - 1) * limit;
        let whereClause = {
            role: "user",
            is_deleted: false,
        };

        if (requesterRole === "admin") {
            if (!requesterBranch) {
                return res.status(403).json({
                    success: 0,
                    message: "Admin branch not configured",
                });
            }
            whereClause.branch_name = requesterBranch;
        } else if (requesterRole === "super_admin" && branch_name) {
            whereClause.branch_name = branch_name;
        }
        if (status) {
            whereClause.status = status;
        }
        if (search && search.trim() !== "") {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } },
            ];
        }

        const { count, rows } = await User.findAndCountAll({
            where: whereClause,
            attributes: { exclude: ["password"] },
            order: [["created_at", "DESC"]],
            limit,
            offset,
        });

        return res.status(200).json({
            success: 1,
            message: "Users fetched successfully",
            pagination: {
                total_records: count,
                total_pages: Math.ceil(count / limit),
                current_page: page,
                limit,
            },
            search: search || null,
            data: rows,
        });
    } catch (error) {
        console.error("Get all users error:", error);
        return res.status(500).json({
            success: 0,
            message: "Internal server error",
        });
    }
};

const getUserById = async (req, res) => {
    try {
        const { id, user_id } = req.query;
        const targetId = id || user_id;
        const requesterRole = req.user.role;
        const requesterBranch = req.user.branch_name;

        if (!targetId) {
            return res
                .status(400)
                .json({ success: 0, message: "User ID is required" });
        }

        const user = await User.findByPk(targetId, {
            attributes: { exclude: ["password"] },
        });

        if (!user) {
            return res.status(404).json({ success: 0, message: "User not found" });
        }

        if (requesterRole === "admin" && user.branch_name !== requesterBranch) {
            return res.status(403).json({
                success: 0,
                message: "Permission denied. User belongs to another branch.",
            });
        }

        return res.status(200).json({
            success: 1,
            data: user,
        });
    } catch (error) {
        console.error("Get user by ID error:", error);
        return res
            .status(500)
            .json({ success: 0, message: "Internal server error" });
    }
};

// old add user we used this only for the super admin
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

//         const requesterRole = req.user.role;
//         let branch_name = req.user.branch_name;

//         if (requesterRole === "super_admin") {
//             branch_name = req.body.branch_name;
//             if (!branch_name) {
//                 await transaction.rollback();
//                 return res
//                     .status(400)
//                     .json({ success: 0, message: "Branch name is required" });
//             }
//         }

//         // Validate Branch existence if needed (Super Admin case)
//         if (requesterRole === "super_admin") {
//             const branchAdmin = await User.findOne({
//                 where: { branch_name, role: "admin", is_deleted: false },
//                 transaction,
//             });
//             if (!branchAdmin) {
//                 await transaction.rollback();
//                 return res
//                     .status(404)
//                     .json({ success: 0, message: "Branch not found" });
//             }
//         }

//         const { status, message } = normalizePhoneNumber(phone_number, iso_code);
//         if (status == 0) {
//             await transaction.rollback();
//             return res.status(400).json({ success: 0, message: message });
//         }

//         const existingUser = await User.findOne({
//             where: {
//                 [Op.or]: [{ phone_number: phone_number }, { aadhar_number }],
//                 is_deleted: false,
//             },
//             transaction,
//         });

//         if (existingUser) {
//             await transaction.rollback();
//             const field =
//                 existingUser.phone_number === phone_number
//                     ? "phone number"
//                     : "Aadhar number";
//             return res.status(409).json({
//                 success: 0,
//                 message: `User with this ${field} already exists`,
//             });
//         }

//         const fileNames = [
//             "aadhar_front_image",
//             "aadhar_back_image",
//             "signature_image",
//         ];
//         const filePaths = extractFilePaths(req.files, fileNames);

//         // Verification logic
//         const isSuperAdmin = requesterRole === "super_admin";

//         const newUser = await User.create(
//             {
//                 first_name,
//                 last_name,
//                 phone_number,
//                 iso_code,
//                 full_address,
//                 latitude,
//                 longitude,
//                 branch_name,
//                 pincode,
//                 aadhar_number,
//                 aadhar_front_image: filePaths.aadhar_front_image || null,
//                 aadhar_back_image: filePaths.aadhar_back_image || null,
//                 signature_image: filePaths.signature_image || null,
//                 role: "user",
//                 created_by: req.user.id,
//                 is_user_verified: isSuperAdmin,
//                 is_otp_verified: isSuperAdmin,
//             },
//             { transaction },
//         );

//         if (!isSuperAdmin) {
//             const otpCode = crypto.randomInt(100000, 999999).toString();
//             const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

//             await Otp.create(
//                 {
//                     phone_number: normalizedPhone,
//                     otp_code: otpCode,
//                     expires_at: expiresAt,
//                     user_id: newUser.id,
//                 },
//                 { transaction },
//             );

//             console.log(`[USER ADDED] OTP for ${normalizedPhone}: ${otpCode}`);
//         }

//         await transaction.commit();

//         const userResponse = newUser.toJSON();
//         delete userResponse.password;

//         return res.status(201).json({
//             success: 1,
//             message: isSuperAdmin
//                 ? "User created successfully"
//                 : "User created successfully. OTP sent.",
//             data: userResponse,
//         });
//     } catch (error) {
//         await transaction.rollback();
//         console.error("Add user error:", error);
//         return res
//             .status(500)
//             .json({ success: 0, message: "Internal server error" });
//     }
// };

// const updateUser = async (req, res) => {
//     const transaction = await User.sequelize.transaction();
//     try {
//         const {
//             user_id,
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

//         const requesterRole = req.user.role;
//         const requesterBranch = req.user.branch_name;

//         if (!user_id) {
//             await transaction.rollback();
//             return res
//                 .status(400)
//                 .json({ success: 0, message: "User ID is required" });
//         }

//         const user = await User.findByPk(user_id, { transaction });
//         if (!user) {
//             await transaction.rollback();
//             return res.status(404).json({ success: 0, message: "User not found" });
//         }

//         // Permissions
//         if (requesterRole === "admin") {
//             if (user.role !== "user" || user.branch_name !== requesterBranch) {
//                 await transaction.rollback();
//                 return res.status(403).json({
//                     success: 0,
//                     message:
//                         "Permission denied. You can only update users in your branch.",
//                 });
//             }
//         }

//         if (user.is_deleted) {
//             await transaction.rollback();
//             return res
//                 .status(400)
//                 .json({ success: 0, message: "Cannot update deleted user" });
//         }

//         const updateData = {};
//         if (first_name !== undefined) updateData.first_name = first_name;
//         if (last_name !== undefined) updateData.last_name = last_name;
//         if (full_address !== undefined) updateData.full_address = full_address;
//         if (latitude !== undefined) updateData.latitude = latitude;
//         if (longitude !== undefined) updateData.longitude = longitude;
//         if (pincode !== undefined) updateData.pincode = pincode;

//         if (phone_number && iso_code && phone_number !== user.phone_number) {
//             const { normalizedPhone, error } = normalizePhoneNumber(
//                 phone_number,
//                 iso_code,
//             );
//             if (error) {
//                 await transaction.rollback();
//                 return res
//                     .status(400)
//                     .json({ success: 0, message: "Invalid phone number format" });
//             }
//             const phoneExists = await User.findOne({
//                 where: { phone_number: normalizedPhone, is_deleted: false },
//                 transaction,
//             });
//             if (phoneExists) {
//                 await transaction.rollback();
//                 return res
//                     .status(409)
//                     .json({ success: 0, message: "Phone number already in use" });
//             }
//             updateData.phone_number = normalizedPhone;
//             updateData.iso_code = iso_code;
//         }

//         if (aadhar_number && aadhar_number !== user.aadhar_number) {
//             const aadharExists = await User.findOne({
//                 where: { aadhar_number, is_deleted: false },
//                 transaction,
//             });
//             if (aadharExists) {
//                 await transaction.rollback();
//                 return res
//                     .status(409)
//                     .json({ success: 0, message: "Aadhar number already in use" });
//             }
//             updateData.aadhar_number = aadhar_number;
//         }

//         // Images
//         const fileNames = [
//             "aadhar_front_image",
//             "aadhar_back_image",
//             "signature_image",
//         ];
//         const filePaths = extractFilePaths(req.files, fileNames);

//         for (const field of fileNames) {
//             if (filePaths[field]) {
//                 if (user[field]) {
//                     try {
//                         await fs.unlink(user[field]);
//                     } catch (e) {
//                         console.error(`Error deleting old ${field}:`, e);
//                     }
//                 }
//                 updateData[field] = filePaths[field];
//             }
//         }

//         if (Object.keys(updateData).length === 0) {
//             await transaction.rollback();
//             return res
//                 .status(400)
//                 .json({ success: 0, message: "No fields provided for update" });
//         }

//         await user.update(updateData, { transaction });
//         await transaction.commit();

//         const userResponse = user.toJSON();
//         delete userResponse.password;

//         return res.status(200).json({
//             success: 1,
//             message: "User updated successfully",
//             data: userResponse,
//         });
//     } catch (error) {
//         await transaction.rollback();
//         console.error("Update user error:", error);
//         return res
//             .status(500)
//             .json({ success: 0, message: "Internal server error" });
//     }
// };



const addUser = async (req, res) => {
    const transaction = await User.sequelize.transaction();

    try {
        const {
            first_name,
            last_name,
            phone_number,
            iso_code,
            full_address,
            latitude,
            longitude,
            pincode,
            aadhar_number,
            role: requestedRole,
            branch_id: bodyBranchId
        } = req.body;

        const requesterRole = req.user.role;
        const requesterId = req.user.id;
        const role = requestedRole || 'user'; // Default to 'user' if not specified

        // Validate role
        if (!['user', 'manager'].includes(role)) {
            await transaction.rollback();
            return res.status(400).json({
                success: 0,
                message: 'Role must be either user or manager'
            });
        }

        // Only admins can create managers
        if (role === 'manager' && requesterRole !== 'admin') {
            await transaction.rollback();
            return res.status(403).json({
                success: 0,
                message: 'Only admins can add managers'
            });
        }

        let branch_name;
        let branch_id;

        // Branch assignment logic
        if (role === 'manager') {
            // Manager-specific branch logic
            let finalBranchId;
            let finalBranchName;

            if (bodyBranchId) {
                // Find specific branch owned by this admin
                const targetBranch = await Branch.findOne({
                    where: { id: bodyBranchId, user_id: requesterId },
                    transaction
                });

                if (!targetBranch) {
                    await transaction.rollback();
                    return res.status(404).json({
                        success: 0,
                        message: 'Selected branch not found or access denied'
                    });
                }
                finalBranchId = targetBranch.id;
                finalBranchName = targetBranch.branch_name;
            } else {
                // Fallback to admin's primary branch if available
                let adminBranchName = req.user.branch_name;
                if (adminBranchName) {
                    const adminBranch = await Branch.findOne({
                        where: { branch_name: adminBranchName },
                        transaction
                    });

                    if (adminBranch) {
                        finalBranchId = adminBranch.id;
                        finalBranchName = adminBranch.branch_name;
                    }
                }
                // If no branch found, allow creation with null branch (can be assigned later)
            }

            branch_id = finalBranchId || null;
            branch_name = finalBranchName || null;
        } else {
            // User-specific branch logic (existing logic)
            branch_name = req.user.branch_name;

            // Super admin can choose branch
            if (requesterRole === 'super_admin') {
                branch_name = req.body.branch_name;
                if (!branch_name) {
                    await transaction.rollback();
                    return res.status(400).json({
                        success: 0,
                        message: 'Branch name is required'
                    });
                }

                const branchAdmin = await User.findOne({
                    where: { branch_name, role: 'admin', is_deleted: false },
                    transaction
                });

                if (!branchAdmin) {
                    await transaction.rollback();
                    return res.status(404).json({
                        success: 0,
                        message: 'Branch not found'
                    });
                }
            }
        }

        // Normalize phone
        const {
            status,
            message,
        } = normalizePhoneNumber(phone_number, iso_code);

        if (status === 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: 0,
                message
            });
        }

        // Check existing user
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { phone_number },
                    { aadhar_number }
                ],
                is_deleted: false
            },
            transaction
        });

        if (existingUser) {
            await transaction.rollback();
            const field =
                existingUser.phone_number === phone_number
                    ? 'phone number'
                    : 'Aadhar number';

            return res.status(409).json({
                success: 0,
                message: `User with this ${field} already exists`
            });
        }

        // Check if branch already has a manager (only for managers with assigned branch)
        if (role === 'manager' && branch_id) {
            const existingManager = await User.findOne({
                where: {
                    branch_id: branch_id,
                    role: 'manager',
                    is_deleted: false
                },
                transaction
            });

            if (existingManager) {
                await transaction.rollback();
                return res.status(409).json({
                    success: 0,
                    message: 'This branch already has a manager assigned'
                });
            }
        }

        // File uploads
        const fileNames = [
            'aadhar_front_image',
            'aadhar_back_image',
            'signature_image'
        ];
        const filePaths = extractFiles(req.files, fileNames);

        // Images are required for users, optional for managers
        if (role === 'user') {
            if (!filePaths.aadhar_front_image ||
                !filePaths.aadhar_back_image ||
                !filePaths.signature_image) {
                await transaction.rollback();
                return res.status(400).json({
                    success: 0,
                    message: 'Please upload all required documents'
                });
            }
        }

        const isSuperAdmin = requesterRole === 'super_admin';
        const isManager = role === 'manager';

        const newUser = await User.create({
            first_name,
            last_name,
            phone_number,
            iso_code,
            full_address,
            latitude,
            longitude,
            branch_name,
            branch_id,
            pincode,
            aadhar_number,
            aadhar_front_image: filePaths.aadhar_front_image || null,
            aadhar_back_image: filePaths.aadhar_back_image || null,
            signature_image: filePaths.signature_image || null,
            role: role,
            created_by: requesterId,
            is_user_verified: isSuperAdmin || isManager,
            is_otp_verified: isSuperAdmin || isManager
        }, { transaction });

        // OTP only for users (not managers, not super admin created)
        if (role === 'user' && !isSuperAdmin) {
            const otpCode = crypto.randomInt(100000, 999999).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

            await Otp.create({
                phone_number,
                otp_code: otpCode,
                expires_at: expiresAt,
                user_id: newUser.id
            }, { transaction });

            console.log(`[USER ADDED] OTP for ${phone_number}: ${otpCode}`);
        }

        await transaction.commit();

        const userResponse = newUser.toJSON();
        delete userResponse.password;

        return res.status(201).json({
            success: 1,
            message: role === 'manager'
                ? 'Manager created successfully'
                : (isSuperAdmin ? 'User created successfully' : 'User created successfully. OTP sent.'),
            data: userResponse
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Add user error:', error);
        return res.status(500).json({
            success: 0,
            message: 'Internal server error'
        });
    }
};

const updateUser = async (req, res) => {
    const transaction = await User.sequelize.transaction();
    try {
        const {
            user_id,
            first_name,
            last_name,
            phone_number,
            iso_code,
            full_address,
            latitude,
            longitude,
            pincode,
            aadhar_number,
            branch_id: bodyBranchId
        } = req.body;

        const requesterRole = req.user.role;
        const requesterId = req.user.id;
        const requesterBranch = req.user.branch_name;

        if (!user_id) {
            await transaction.rollback();
            return res.status(400).json({
                success: 0,
                message: "User ID is required",
            });
        }

        const user = await User.findByPk(user_id, { transaction });
        if (!user) {
            await transaction.rollback();
            return res.status(404).json({
                success: 0,
                message: "User not found",
            });
        }

        /* ===================== PERMISSIONS ===================== */

        if (requesterRole === "admin") {
            // Admin cannot touch admin / super admin
            if (user.role === "admin" || user.role === "super_admin") {
                await transaction.rollback();
                return res.status(403).json({
                    success: 0,
                    message:
                        "Admins cannot update Admins or Super Admins",
                });
            }

            // Admin can manage users in their primary branch OR any branch they own
            const managedBranch = await Branch.findOne({
                where: {
                    [Op.or]: [
                        { branch_name: user.branch_name, user_id: requesterId }, // they own the user's branch
                        { id: user.branch_id, user_id: requesterId } // they own the user's branch ID
                    ]
                },
                transaction
            });

            if (!managedBranch && user.branch_name !== requesterBranch) {
                await transaction.rollback();
                return res.status(403).json({
                    success: 0,
                    message:
                        "You do not have permission to manage this user",
                });
            }
        }

        /* ===================== USER STATE ===================== */

        if (user.is_deleted || user.is_blocked) {
            await transaction.rollback();
            return res.status(403).json({
                success: 0,
                message: "User cannot be updated",
            });
        }

        /* ===================== UPDATE DATA ===================== */

        const updateData = {};

        if (first_name !== undefined) updateData.first_name = first_name;
        if (last_name !== undefined) updateData.last_name = last_name;
        if (full_address !== undefined) updateData.full_address = full_address;
        if (latitude !== undefined) updateData.latitude = latitude;
        if (longitude !== undefined) updateData.longitude = longitude;
        if (pincode !== undefined) updateData.pincode = pincode;

        /* ===================== EMAIL ===================== */
        const { email } = req.body;
        if (email && email !== user.email) {
            const emailExists = await User.findOne({
                where: { email: email, is_deleted: false },
                transaction
            });

            if (emailExists && emailExists.id !== user.id) {
                await transaction.rollback();
                return res.status(409).json({
                    success: 0,
                    message: "Email already in use"
                });
            }
            updateData.email = email;
        }

        /* ===================== PHONE ===================== */

        if (phone_number && iso_code && phone_number !== user.phone_number) {
            // const {
            //     status,
            //     normalizedPhone,
            // } = normalizePhoneNumber(phone_number, iso_code);

            if (!iso_code) {
                await transaction.rollback();
                return res.status(400).json({
                    success: 0,
                    message: "ISO code is required",
                });
            }

            if (iso_code === 0) {
                await transaction.rollback();
                return res.status(400).json({
                    success: 0,
                    message: "Invalid ISO code",
                });
            }

            const phoneExists = await User.findOne({
                where: {
                    phone_number: phone_number,
                    is_deleted: false,
                },
                transaction,
            });

            if (phoneExists && phoneExists.id !== user.id) {
                await transaction.rollback();
                return res.status(409).json({
                    success: 0,
                    message: "Phone number already in use",
                });
            }

            updateData.phone_number = phone_number;
            updateData.iso_code = iso_code;
        }

        /* ===================== AADHAR ===================== */

        if (aadhar_number && aadhar_number !== user.aadhar_number) {
            const aadharExists = await User.findOne({
                where: {
                    aadhar_number,
                    is_deleted: false,
                },
                transaction,
            });

            if (aadharExists && aadharExists.id !== user.id) {
                await transaction.rollback();
                return res.status(409).json({
                    success: 0,
                    message: "Aadhar number already in use",
                });
            }

            updateData.aadhar_number = aadhar_number;
        }

        /* ===================== IMAGES ===================== */

        const fileNames = [
            "aadhar_front_image",
            "aadhar_back_image",
            "signature_image",
        ];

        // const filePaths = extractFilePaths(req.files, fileNames);
        const filePaths = extractFiles(req.files, fileNames);

        for (const field of fileNames) {
            if (filePaths[field]) {
                if (user[field]) {
                    try {
                        await fs.promises.unlink(user[field]);
                    } catch (err) {
                        console.error(`Failed to delete old ${field}`, err);
                    }
                }
                updateData[field] = filePaths[field];
            }
        }

        /* ===================== BRANCH REASSIGNMENT ===================== */
        /* ===================== BRANCH REASSIGNMENT ===================== */
        // Check if branch_id is strictly provided (including null/0 for de-assignment)
        if (req.body.hasOwnProperty('branch_id')) {
            const newBranchId = req.body.branch_id;

            // De-assignment logic (0, null, '0', '')
            if (newBranchId === 0 || newBranchId === null || newBranchId === '0' || newBranchId === '') {
                if (user.role === 'manager') {
                    updateData.branch_id = null;
                    updateData.branch_name = null;
                }
            }
            // Assignment / Re-assignment logic
            else if (newBranchId && Number(newBranchId) !== user.branch_id) {
                const targetId = Number(newBranchId);

                if (requesterRole === 'admin') {
                    // Admin can only reassign to branches they own
                    const targetBranch = await Branch.findOne({
                        where: { id: targetId, user_id: requesterId },
                        transaction
                    });

                    if (!targetBranch) {
                        await transaction.rollback();
                        return res.status(403).json({
                            success: 0,
                            message: "Selected branch not found or access denied"
                        });
                    }

                    // Check if target branch already has a manager (only for manager role)
                    if (user.role === 'manager') {
                        const existingManager = await User.findOne({
                            where: {
                                branch_id: targetId,
                                role: 'manager',
                                is_deleted: false,
                                id: { [Op.ne]: user.id } // Exclude current user
                            },
                            transaction
                        });

                        if (existingManager) {
                            await transaction.rollback();
                            return res.status(409).json({
                                success: 0,
                                message: 'This branch already has a manager assigned'
                            });
                        }
                    }

                    updateData.branch_id = targetBranch.id;
                    updateData.branch_name = targetBranch.branch_name;
                } else if (requesterRole === 'super_admin') {
                    const targetBranch = await Branch.findByPk(targetId, { transaction });
                    if (!targetBranch) {
                        await transaction.rollback();
                        return res.status(404).json({
                            success: 0,
                            message: "Branch not found"
                        });
                    }

                    // Check if target branch already has a manager (only for manager role)
                    // Check if target branch already has a manager (only for manager role)
                    if (user.role === 'manager') {
                        const existingManager = await User.findOne({
                            where: {
                                branch_id: targetId,
                                role: 'manager',
                                is_deleted: false,
                                id: { [Op.ne]: user.id } // Exclude current user
                            },
                            transaction
                        });

                        if (existingManager) {
                            await transaction.rollback();
                            return res.status(409).json({
                                success: 0,
                                message: 'This branch already has a manager assigned'
                            });
                        }
                    }

                    updateData.branch_id = targetBranch.id;
                    updateData.branch_name = targetBranch.branch_name;
                }
            }
        }

        if (Object.keys(updateData).length === 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: 0,
                message: "No fields provided for update",
            });
        }

        /* ===================== SAVE ===================== */

        await user.update(updateData, { transaction });
        await transaction.commit();

        const userResponse = user.toJSON();
        delete userResponse.password;

        return res.status(200).json({
            success: 1,
            message: "User updated successfully",
            data: userResponse,
        });
    } catch (error) {
        await transaction.rollback();
        console.error("Update user error:", error);
        return res.status(500).json({
            success: 0,
            message: "Internal server error",
        });
    }
};




const getUserVaults = async (req, res) => {
    try {
        const { user_id } = req.query;
        const requesterId = req.user.id;
        const requesterRole = req.user.role;
        const requesterBranch = req.user.branch_name;

        // Determine target user ID
        const targetUserId = requesterRole === "user" ? requesterId : user_id;

        if (!targetUserId) {
            return res
                .status(400)
                .json({ success: 0, message: "User ID is required" });
        }

        const user = await User.findByPk(targetUserId, {
            attributes: [
                "id",
                "first_name",
                "last_name",
                "email",
                "phone_number",
                "branch_name",
            ],
        });

        if (!user) {
            return res.status(404).json({ success: 0, message: "User not found" });
        }

        // Access Control
        if (requesterRole === "admin" && user.branch_name !== requesterBranch) {
            return res.status(403).json({
                success: 0,
                message: "Access denied: User belongs to another branch",
            });
        }

        const vaults = await Vault.findAll({
            where: { user_id: targetUserId, is_active: true },
            attributes: [
                "id",
                "vault_number",
                "size",
                "status",
                "assigned_at",
                "expires_at",
                "payment_status",
                "amount_due",
            ],
            order: [["assigned_at", "DESC"]],
        });

        const totalAmountDue = vaults.reduce(
            (sum, vault) => sum + (parseFloat(vault.amount_due) || 0),
            0,
        );

        const vaultSummary = {
            total_vaults: vaults.length,
            total_amount_due: totalAmountDue.toFixed(2),
            by_size: {
                small: vaults.filter((v) => v.size === "small").length,
                medium: vaults.filter((v) => v.size === "medium").length,
                large: vaults.filter((v) => v.size === "large").length,
            },
            statuses: {
                occupied: vaults.filter((v) => v.status === "occupied").length,
                blocked: vaults.filter((v) => v.status === "blocked").length,
            },
        };

        return res.status(200).json({
            success: 1,
            data: {
                user_id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                phone_number: user.phone_number,
                branch_name: user.branch_name,
                vault_summary: vaultSummary,
                vaults: vaults,
            },
        });
    } catch (error) {
        console.error("Get user vaults error:", error);
        return res
            .status(500)
            .json({ success: 0, message: "Internal server error" });
    }
};

// const changePassword = async (req, res) => {
//     try {
//         const result = await sequelize.transaction(async (t) => {
//             const { old_password, new_password, confirm_password } = req.body;
//             const userId = req.user.id;

//             // 1. Strict Input Validation (Explicit Mismatch Check)
//             if (new_password !== confirm_password) {
//                 // Throwing error triggers automatic rollback
//                 const error = new Error('New password and confirm password do not match');
//                 error.statusCode = 400;
//                 throw error;
//             }

//             // 2. Strict Input Validation (Same as Old Check)
//             if (String(new_password) === String(old_password)) { // Ensure string comparison
//                 const error = new Error('New password cannot be the same as the old password');
//                 error.statusCode = 400;
//                 throw error;
//             }

//             const user = await User.findByPk(userId, { transaction: t });
//             if (!user) {
//                 const error = new Error('User not found');
//                 error.statusCode = 404;
//                 throw error;
//             }

//             const isMatch = await bcrypt.compare(old_password, user.password);
//             if (!isMatch) {
//                 const error = new Error('Incorrect old password');
//                 error.statusCode = 400;
//                 throw error;
//             }

//             const hashedPassword = await bcrypt.hash(new_password, 10);

//             console.log(`[ChangePassword] Checks passed. Updating password for User ${userId}.`);

//             await user.update({
//                 password: hashedPassword
//             }, { transaction: t });

//             return { success: true };
//         });

//         return res.status(200).json({
//             success: 1,
//             message: 'Password changed successfully'
//         });

//     } catch (error) {
//         // If error has a statusCode, it's our functional error (validation etc)
//         if (error.statusCode) {
//             return res.status(error.statusCode).json({
//                 success: 0,
//                 message: error.message
//             });
//         }

//         console.error('Change password error:', error);
//         return res.status(500).json({
//             success: 0,
//             message: 'Internal server error'
//         });
//     }
// };

const changePassword = async (req, res) => {
    try {
        console.log('🔥 changePassword controller HIT');

        const { old_password, new_password, confirm_password } = req.body;
        const userId = req.user.id;
        const userRole = req.user.role;

        // ✅ Role safety
        if (!['admin', 'super_admin'].includes(userRole)) {
            return res.status(403).json({
                success: 0,
                message: 'Unauthorized role'
            });
        }

        // ✅ Basic validation
        if (!new_password) {
            return res.status(400).json({
                success: 0,
                message: 'New password is required'
            });
        }

        if (confirm_password && new_password !== confirm_password) {
            return res.status(400).json({
                success: 0,
                message: 'New password and confirm password do not match'
            });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: 0,
                message: 'User not found'
            });
        }

        // 🔒 Extra safety: role from DB must match token
        if (user.role !== userRole) {
            return res.status(403).json({
                success: 0,
                message: 'Role mismatch detected'
            });
        }

        const isOldPasswordValid = await bcrypt.compare(
            old_password,
            user.password
        );

        if (!isOldPasswordValid) {
            return res.status(400).json({
                success: 0,
                message: 'Old password is incorrect'
            });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        console.log('🔥 ABOUT TO UPDATE PASSWORD');
        await user.update({ password: hashedPassword });
        console.log('🔥 PASSWORD UPDATED');

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


const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({
            where: {
                email: email,
                role: 'admin',
                is_deleted: false,
                is_blocked: false
            }
        });

        if (!user) {
            return res.status(404).json({
                success: 0,
                message: 'Admin with this email not found'
            });
        }

        const phone_number = user.phone_number;
        if (!phone_number) {
            return res.status(400).json({
                success: 0,
                message: 'User does not have a phone number linked for OTP verification'
            });
        }

        // Generate OTP
        const otpCode = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await Otp.create({
            phone_number: phone_number,
            otp_code: otpCode,
            expires_at: expiresAt,
            user_id: user.id
        });

        // In a real scenario, we would send this OTP via SMS/Email
        // For now, we return it in the response for testing purposes (or log it)
        console.log(`[Forgot Password] OTP for ${email} (${phone_number}): ${otpCode}`);

        return res.status(200).json({
            success: 1,
            message: 'OTP sent to your registered phone number / email',
            // data: { otp: otpCode } // Optional: Remove in production
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).json({
            success: 0,
            message: 'Internal server error'
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, otp, new_password } = req.body;

        const user = await User.findOne({
            where: {
                email: email,
                role: 'admin',
                is_deleted: false,
                is_blocked: false
            }
        });

        if (!user) {
            return res.status(404).json({
                success: 0,
                message: 'User not found'
            });
        }

        const phone_number = user.phone_number;

        const otpRecord = await Otp.findOne({
            where: {
                phone_number: phone_number,
                otp_code: otp,
                is_used: false
            },
            order: [['created_at', 'DESC']]
        });

        if (!otpRecord) {
            return res.status(400).json({
                success: 0,
                message: 'Invalid OTP'
            });
        }

        if (new Date() > otpRecord.expires_at) {
            return res.status(400).json({
                success: 0,
                message: 'OTP has expired'
            });
        }

        // OTP Valid. Reset Password.
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await user.update({ password: hashedPassword });
        await otpRecord.update({ is_used: true });

        return res.status(200).json({
            success: 1,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json({
            success: 0,
            message: 'Internal server error'
        });
    }
};

module.exports = {
    toggleBlockStatus,
    deleteUser,
    logout,
    getMe,
    deleteNominee,
    addNominee,
    getNominees,
    getAllUsers,
    getUserById,
    addUser,
    updateUser,
    getUserVaults,
    verifyOtp,
    login,
    changePassword,
    forgotPassword,
    resetPassword
};
