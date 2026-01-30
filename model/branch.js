module.exports = (sequelize, DataTypes) => {
    const Branch = sequelize.define(
        'Branch',
        {

            user_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                comment: 'User ID'
            },
            branch_name: {
                type: DataTypes.STRING(150),
                allowNull: true,
                unique: true,
                comment: 'Branch name'
            },
            branch_address: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: 'Branch address'
            },
            branch_city: {
                type: DataTypes.STRING(150),
                allowNull: true,
                comment: 'Branch city'
            },
            branch_state: {
                type: DataTypes.STRING(150),
                allowNull: true,
                comment: 'Branch state'
            },
            branch_country: {
                type: DataTypes.STRING(150),
                allowNull: true,
                comment: 'Branch country'
            },
            branch_iso_code: {
                type: DataTypes.STRING(10),
                allowNull: true,
                comment: 'ISO code'
            },
            branch_pincode: {
                type: DataTypes.STRING(150),
                allowNull: true,
                comment: 'Branch pincode'
            },
            branch_phone_number: {
                type: DataTypes.STRING(150),
                allowNull: true,
                unique: true,
                comment: 'Branch phone number'
            },
            branch_email: {
                type: DataTypes.STRING(150),
                allowNull: true,
                unique: true,
                comment: 'Branch email'
            },
            branch_password: {
                type: DataTypes.STRING(150),
                allowNull: true,
                comment: 'Branch password'
            },
            branch_is_active: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
                comment: 'Branch is active'
            },
            branch_is_deleted: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                comment: 'Branch is deleted'
            },
        },
        {
            tableName: 'tbl_branches',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    );

    return Branch;
};