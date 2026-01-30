module.exports = (sequelize, DataTypes) => {
    const Device = sequelize.define(
        'Device',
        {
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'tbl_users',
                    key: 'id',
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
            },

            device_id: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            device_type: {
                type: DataTypes.ENUM('android', 'ios', 'web'),
                allowNull: true,
            },

            device_token: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
        },
        {
            tableName: 'tbl_token',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        }
    );

    return Device;
};