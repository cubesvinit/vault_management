module.exports = (sequelize, DataTypes) => {
    const Nominee = sequelize.define(
        'Nominee',
        {
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'tbl_users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },

            admin_user_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'tbl_users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                comment: 'Admin user managing this branch',
            },

            nominated_by: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'tbl_users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },

            first_name: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },
            last_name: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },

            aadhar_number: {
                type: DataTypes.STRING(20),
                allowNull: true,
            },

            aadhar_front_image: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            aadhar_back_image: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            signature_image: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            relation: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },

            country_code: {
                type: DataTypes.STRING(10),
                allowNull: true,
            },
            iso_code: {
                type: DataTypes.STRING(10),
                allowNull: true,
            },

            phone_number: {
                type: DataTypes.STRING(20),
                allowNull: true,
            },

            address: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            pincode: {
                type: DataTypes.STRING(20),
                allowNull: true,
            },

            status: {
                type: DataTypes.ENUM('pending', 'approved', 'rejected'),
                defaultValue: 'pending',
            },

            approved_by: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'tbl_users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },

            approved_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: 'tbl_nominees',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        }
    );

    return Nominee;
};
