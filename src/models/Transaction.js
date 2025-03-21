const { DataTypes } = require("sequelize");
const sequelize = require("../database");
const Loan = require("./Loan");

const Transaction = sequelize.define("Transaction", {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    loanId: { type: DataTypes.UUID, allowNull: false, references: { model: "Loans", key: "id" } },
    borrowerId: { type: DataTypes.STRING, allowNull: false },
    amountPaid: { type: DataTypes.FLOAT, allowNull: false },
    paymentDate: { type: DataTypes.DATE, allowNull: false },
});


Loan.hasMany(Transaction, { foreignKey: "loanId" });
Transaction.belongsTo(Loan, { foreignKey: "loanId" });

module.exports = Transaction;
