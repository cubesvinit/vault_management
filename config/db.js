const Sequelize = require('sequelize');
const { sequelize } = require('./database');

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require('../model/user')(sequelize, Sequelize.DataTypes);
db.Device = require('../model/token')(sequelize, Sequelize.DataTypes);
db.Otp = require('../model/otp')(sequelize, Sequelize.DataTypes);
db.BranchVisit = require('../model/branchVisit')(sequelize, Sequelize.DataTypes);
db.Branch = require('../model/branch')(sequelize, Sequelize.DataTypes);
db.Vault = require('../model/vault')(sequelize, Sequelize.DataTypes);
db.VaultPricing = require('../model/vaultPricing')(sequelize, Sequelize.DataTypes);
db.Nominee = require('../model/nominee')(sequelize, Sequelize.DataTypes);

// Define associations
// User associations
db.User.hasMany(db.Vault, { foreignKey: 'user_id', as: 'vaults' });
db.User.hasMany(db.Vault, { foreignKey: 'admin_user_id', as: 'managed_vaults' });
db.User.hasMany(db.BranchVisit, { foreignKey: 'user_id', as: 'visits' });
db.User.hasMany(db.BranchVisit, { foreignKey: 'admin_user_id', as: 'branch_visits' });
db.User.hasMany(db.Nominee, { foreignKey: 'user_id', as: 'nominees' });
db.User.hasMany(db.Nominee, { foreignKey: 'admin_user_id', as: 'branch_nominees' });
db.User.hasMany(db.Nominee, { foreignKey: 'nominated_by', as: 'nominated_users' });
db.User.hasMany(db.Nominee, { foreignKey: 'approved_by', as: 'approved_nominees' });
db.User.hasMany(db.Device, { foreignKey: 'user_id' });
db.User.hasMany(db.Otp, { foreignKey: 'user_id' });
db.User.hasMany(db.VaultPricing, { foreignKey: 'updated_by' });

// Branch associations
db.Branch.belongsTo(db.User, { foreignKey: 'user_id', as: 'owner' }); // Admin owns Branch
db.User.hasMany(db.Branch, { foreignKey: 'user_id', as: 'owned_branches' });
db.Branch.hasMany(db.Vault, { foreignKey: 'branch_id', as: 'vaults' }); // Branch has many Vaults (Boxes)
// db.Branch.hasMany(db.User, { foreignKey: 'branch_id', as: 'staff' }); // Managers belong to Branch (If we add branch_id to User)

// Vault associations
db.Vault.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });
db.Vault.belongsTo(db.User, { foreignKey: 'admin_user_id', as: 'admin' });
db.Vault.belongsTo(db.Branch, { foreignKey: 'branch_id', as: 'branch' }); // Vault belongs to a Branch

// Nominee associations
db.Nominee.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });
db.Nominee.belongsTo(db.User, { foreignKey: 'admin_user_id', as: 'admin' });
db.Nominee.belongsTo(db.User, { foreignKey: 'nominated_by', as: 'nominator' });
db.Nominee.belongsTo(db.User, { foreignKey: 'approved_by', as: 'approver' });

// BranchVisit associations
db.BranchVisit.belongsTo(db.User, { foreignKey: 'user_id', as: 'user' });
db.BranchVisit.belongsTo(db.User, { foreignKey: 'admin_user_id', as: 'admin' });
db.BranchVisit.belongsTo(db.Nominee, { foreignKey: 'nominee_id' });

// Device associations
db.Device.belongsTo(db.User, { foreignKey: 'user_id' });

// Otp associations
db.Otp.belongsTo(db.User, { foreignKey: 'user_id' });

// VaultPricing associations
db.VaultPricing.belongsTo(db.User, { foreignKey: 'updated_by', as: 'updater' });

module.exports = db;
