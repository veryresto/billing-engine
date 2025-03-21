const { DataTypes } = require("sequelize");
const sequelize = require("../database");
const Transaction = require("./Transaction");
const Schedule = require("./Schedule");

const TransactionSchedule = sequelize.define("TransactionSchedule", {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    transactionId: { type: DataTypes.UUID, allowNull: false, references: { model: "Transactions", key: "id" } },
    paymentId: { type: DataTypes.UUID, allowNull: false, references: { model: "Schedules", key: "id" } },
});


Transaction.hasMany(TransactionSchedule, { foreignKey: "transactionId" });
TransactionSchedule.belongsTo(Transaction, { foreignKey: "transactionId" });

Schedule.hasMany(TransactionSchedule, { foreignKey: "paymentId" });
TransactionSchedule.belongsTo(Schedule, { foreignKey: "paymentId" });

module.exports = TransactionSchedule;
