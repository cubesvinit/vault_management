const crypto = require('crypto');
const { User, Otp, Nominee, Sequelize } = require('../config/db');
const { Op } = Sequelize;
const { normalizePhoneNumber } = require('../helper/phoneHelper');

const sendLoginOtp = async (req, res) => {
    const transaction = await User.sequelize.transaction();
    try {
        const { phone_number, iso_code } = req.body;

        const { status, message } = normalizePhoneNumber(phone_number, iso_code);

        if (status == 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: 0,
                message: message,
            });
        }

        // Use the RAW phone number for lookup as requested
        const user = await User.findOne({
            where: {
                phone_number: phone_number,
                role: 'user',
                is_deleted: false,
                is_blocked: false
            },
            transaction
        });

        if (!user) {
            await transaction.rollback();
            return res.status(404).json({
                success: 0,
                message: 'User not found or inactive'
            });
        }

        const otpCode = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await Otp.update(
            { is_used: true },
            {
                where: { phone_number: phone_number, is_used: false },
                transaction
            }
        );

        await Otp.create({
            phone_number: phone_number,
            otp_code: otpCode,
            expires_at: expiresAt,
            user_id: user.id
        }, { transaction });

        await transaction.commit();

        // Simulate sending OTP (In production, integrate SMS gateway)
        console.log(`[LOGIN OTP] For ${phone_number}: ${otpCode}`);

        return res.status(200).json({
            success: 1,
            message: 'OTP sent successfully',
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Send login OTP error:', error);
        return res.status(500).json({
            success: 0,
            message: 'Internal server error'
        });
    }
};




// const addNominee = async (req, res) => {
//     const transaction = await User.sequelize.transaction();
//     try {
//         const { first_name, last_name, relation, phone_number, iso_code, country_code, address, pincode, aadhar_number } = req.body;
//         const userId = req.user.id;


//         const user = await User.findByPk(userId);
//         if (!user) {
//             await transaction.rollback();
//             return res.status(404).json({
//                 success: 0,
//                 message: 'User not found'
//             });
//         }

//         const branchAdmin = await User.findOne({
//             where: {
//                 branch_name: user.branch_name,
//                 role: 'admin'
//             }
//         });

//         if (!branchAdmin) {
//             await transaction.rollback();
//             return res.status(404).json({
//                 success: 0,
//                 message: 'Branch admin not found for this user'
//             });
//         }

//         const nomineeCount = await Nominee.count({
//             where: { user_id: userId },
//             transaction
//         });

//         if (nomineeCount >= 5) {
//             await transaction.rollback();
//             return res.status(400).json({
//                 success: 0,
//                 message: 'Maximum limit of 5 nominees reached'
//             });
//         }
//         if (!req.files || !req.files.aadhar_front_image || !req.files.aadhar_back_image) {
//             await transaction.rollback();
//             return res.status(400).json({
//                 success: 0,
//                 message: 'Please upload both Aadhar front and back images'
//             });
//         }
//         const filePaths = extractFilePaths(req.files, ['aadhar_front_image', 'aadhar_back_image']);

//         const newNominee = await Nominee.create({
//             user_id: userId,
//             admin_user_id: branchAdmin.id,
//             first_name,
//             last_name,
//             relation,
//             phone_number,
//             iso_code,
//             country_code,
//             address,
//             pincode,
//             aadhar_number,
//             aadhar_front_image: filePaths.aadhar_front_image,
//             aadhar_back_image: filePaths.aadhar_back_image,
//             status: 'pending'
//         }, { transaction });

//         await transaction.commit();

//         res.status(201).json({
//             success: 1,
//             message: 'Nominee added successfully and is pending approval',
//             data: newNominee
//         });

//     } catch (error) {
//         await transaction.rollback();
//         console.error('Add nominee error:', error);
//         res.status(500).json({
//             success: 0,
//             message: 'Internal server error'
//         });
//     }
// };

// const getNominees = async (req, res) => {
//     try {
//         const userId = req.user.id;

//         const nominees = await Nominee.findAll({
//             where: { user_id: userId },
//             order: [['created_at', 'DESC']]
//         });

//         res.json({
//             success: 1,
//             message: 'Nominees fetched successfully',
//             data: nominees
//         });

//     } catch (error) {
//         console.error('Get nominees error:', error);
//         res.status(500).json({
//             success: 0,
//             message: 'Internal server error'
//         });
//     }
// };

// const deleteNominee = async (req, res) => {
//     try {
//         const { id } = req.query;
//         const userId = req.user.id;

//         if (!id) {
//             return res.status(400).json({
//                 success: 0,
//                 message: 'Nominee ID is required'
//             });
//         }

//         const nominee = await Nominee.findOne({
//             where: {
//                 id,
//                 user_id: userId
//             }
//         });

//         if (!nominee) {
//             return res.status(404).json({
//                 success: 0,
//                 message: 'Nominee not found or does not belong to you'
//             });
//         }

//         await nominee.destroy();

//         res.json({
//             success: 1,
//             message: 'Nominee deleted successfully'
//         });

//     } catch (error) {
//         console.error('Delete nominee error:', error);
//         res.status(500).json({
//             success: 0,
//             message: 'Internal server error'
//         });
//     }
// };

module.exports = {
    sendLoginOtp,
    // addNominee,
    // getNominees,
    // deleteNominee
};

