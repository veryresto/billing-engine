const { DataTypes } = require("sequelize");
const sequelize = require("../database");
const Transaction = require("./Transaction");
const Payment = require("./Payment");

const TransactionPayment = sequelize.define("TransactionPayment", {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    transactionId: { type: DataTypes.UUID, allowNull: false, references: { model: "Transactions", key: "id" } },
    paymentId: { type: DataTypes.UUID, allowNull: false, references: { model: "Payments", key: "id" } },
});


Transaction.hasMany(TransactionPayment, { foreignKey: "transactionId" });
TransactionPayment.belongsTo(Transaction, { foreignKey: "transactionId" });

Payment.hasMany(TransactionPayment, { foreignKey: "paymentId" });
TransactionPayment.belongsTo(Payment, { foreignKey: "paymentId" });

module.exports = TransactionPayment;
