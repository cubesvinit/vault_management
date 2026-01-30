
module.exports = (sequelize, DataTypes) => {
    const BranchVisit = sequelize.define('tbl_branch_visits', {
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'tbl_users',
                key: 'id'
            }
        },
        nominee_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_nominees', key: 'id' }
        },
        admin_user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'tbl_users',
                key: 'id'
            },
            comment: 'Admin user managing this branch'
        },
        vault_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'tbl_vaults', key: 'id' }
        },
        checkin_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        checkout_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        visitor_type: {
            type: DataTypes.ENUM('user', 'nominee'),
            allowNull: false
        }
    }, {
        tableName: 'tbl_branch_visits',
        timestamps: false
    });

    return BranchVisit;
};
