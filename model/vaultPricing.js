module.exports = (sequelize, DataTypes) => {
    const VaultPricing = sequelize.define(
        'VaultPricing',
        {
            size: {
                type: DataTypes.ENUM('small', 'medium', 'large'),
                allowNull: false,
                // unique: true, // Removed global unique constraint
            },
            price: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
            },
            admin_user_id: { // Added admin_user_id
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'tbl_users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            branch_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'tbl_branches',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                comment: 'Branch-specific pricing'
            },
            updated_by: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'tbl_users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
        },
        {
            tableName: 'tbl_vault_pricing',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            indexes: [
                {
                    unique: true,
                    fields: ['branch_id', 'size'], // Branch-specific pricing constraint
                },
            ],
        }
    );

    return VaultPricing;
};
