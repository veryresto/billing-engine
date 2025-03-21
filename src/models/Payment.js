const { DataTypes } = require("sequelize");
const sequelize = require("../database");
const Loan = require("./Loan");

const Payment = sequelize.define("Payment", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    loanId: { type: DataTypes.UUID, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    dueDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    paid: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false},
}, { timestamps: true });

Payment.belongsTo(Loan, { foreignKey: "loanId", onDelete: "CASCADE" });
Loan.hasMany(Payment, { foreignKey: "loanId" });

module.exports = Payment;
