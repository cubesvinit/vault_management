module.exports = (sequelize, DataTypes) => {
    const Otp = sequelize.define(
        'Otp',
        {
            phone_number: {
                type: DataTypes.STRING(20),
                allowNull: false,
            },
            otp_code: {
                type: DataTypes.STRING(6),
                allowNull: false,
            },
            expires_at: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            is_used: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: true, // For user verification
            },
        },
        {
            tableName: 'tbl_otps',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        }
    );

    return Otp;
};