const { DataTypes } = require("sequelize");
const sequelize = require("../database");

const Loan = sequelize.define("Loan", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    borrowerId: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    outstanding: { type: DataTypes.FLOAT, allowNull: false },
    weeks: { type: DataTypes.INTEGER, allowNull: false },
    interestRate: { type: DataTypes.FLOAT, allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false }
});

module.exports = Loan;
