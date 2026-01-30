module.exports = (sequelize, DataTypes) => {
    const Vault = sequelize.define(
        'Vault',
        {
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'tbl_users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            admin_user_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'tbl_users',
                    key: 'id',
                },
                comment: 'Admin user who manages this vault',
            },
            branch_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'tbl_branches',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                comment: 'Branch where this vault is located',
            },
            vault_number: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },
            size: {
                type: DataTypes.ENUM('small', 'medium', 'large'),
                allowNull: false,
            },
            status: {
                type: DataTypes.ENUM('available', 'occupied', 'blocked'),
                defaultValue: 'available',
            },
            is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
                comment: 'true = active, false = physically removed/disabled'
            },
            assigned_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            amount_due: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
            },
            assigned_price: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                comment: 'Monthly price fixed at the time of assignment'
            },

            expires_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
            payment_status: {
                type: DataTypes.ENUM('pending', 'paid'),
                defaultValue: 'pending',
            },


        },
        {
            tableName: 'tbl_vaults',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            indexes: [
                {
                    unique: true,
                    fields: ['admin_user_id', 'vault_number'],
                },
            ],
        }
    );

    return Vault;
};
