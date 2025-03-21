const { DataTypes } = require("sequelize");
const sequelize = require("../database");
const Loan = require("./Loan");

const Schedule = sequelize.define("Schedule", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    loanId: { type: DataTypes.UUID, allowNull: false, references: { model: Loan, key: "id" } },
    week: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    dueDate: { type: DataTypes.DATEONLY, allowNull: false },
    paid: { type: DataTypes.BOOLEAN, defaultValue: false }
});

Loan.hasMany(Schedule, { foreignKey: "loanId" });
Schedule.belongsTo(Loan, { foreignKey: "loanId" });

module.exports = Schedule;
