module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define(
        'User',
        {
            email: {
                type: DataTypes.STRING(150),
                allowNull: true,
                validate: {
                    isEmail: true,
                },
            },
            branch_name: {
                type: DataTypes.STRING(150),
                allowNull: true,
                comment: 'Branch name for admin users',
            },
            created_by: {
                type: DataTypes.INTEGER,
                allowNull: true,
                comment: 'Super admin user ID who created this user',
            },
            password: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: 'Password for the user',
            },
            iso_code: {
                type: DataTypes.STRING(3),
                allowNull: true,
                comment: 'ISO code of the country',
            },

            country_code: {
                type: DataTypes.STRING(10),
                allowNull: true,
                comment: 'Country code of the country',
            },

            phone_number: {
                type: DataTypes.STRING(20),
                allowNull: false,
                comment: 'Phone number of the user',
            },

            first_name: {
                type: DataTypes.STRING(100),
                allowNull: true,
                comment: 'First name of the user',
            },

            last_name: {
                type: DataTypes.STRING(100),
                allowNull: true,
                comment: 'Last name of the user',
            },

            full_address: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: 'Full address of the user',
            },

            latitude: {
                type: DataTypes.DECIMAL(10, 7),
                allowNull: true,
                comment: 'Latitude of the user',
            },

            longitude: {
                type: DataTypes.DECIMAL(10, 7),
                allowNull: true,
                comment: 'Longitude of the user',
            },

            aadhar_number: {
                type: DataTypes.STRING(20),
                allowNull: true,
                comment: 'Aadhar number of the user',
            },

            aadhar_front_image: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: 'Aadhar front image of the user',
            },
            aadhar_back_image: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: 'Aadhar back image of the user',
            },
            signature_image: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: 'Signature image of the user',
            },
            is_user_verified: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                comment: 'User verification status',
            },
            is_otp_verified: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                comment: 'OTP verification status',
            },
            is_vault_alloted: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                comment: 'Vault allocation status',
            },
            is_deleted: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                comment: 'Soft delete status',
            },
            deleted_reason: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: 'Reason for soft delete',
            },
            is_blocked: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                comment: 'Block status',
            },
            blocked_reason: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: 'Reason for block',
            },
            blocked_at: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: 'Block timestamp',
            },
            blocked_by: {
                type: DataTypes.INTEGER,
                allowNull: true,
                comment: 'Blocker user ID',
            },
            role: {
                type: DataTypes.ENUM('user', 'manager', 'admin', 'super_admin'),
                defaultValue: 'user',
                comment: 'User role',
            },
            branch_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                comment: 'Branch ID for managers or staff',
            },

            last_login_at: {
                type: DataTypes.DATE,
                allowNull: true,
                comment: 'Last login timestamp',
            },
            pincode: {
                type: DataTypes.STRING(20),
                allowNull: true,
                comment: 'Pincode of the user',
            },
        },
        {
            tableName: 'tbl_users',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    );

    return User;
};
