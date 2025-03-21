const sequelize = require("./database");
const Loan = require("./models/Loan");
const Schedule = require("./models/Schedule");
const Transaction = require("./models/Transaction");
const TransactionSchedule = require("./models/TransactionSchedule");

sequelize.sync({ force: true }) // WARNING: This will DROP existing tables before recreating them
    .then(() => {
        console.log("✅ Database synced successfully.");
        process.exit(0); // Exit the script successfully
    })
    .catch(err => {
        console.error("❌ Database sync error:", err);
        process.exit(1); // Exit with an error code
    });
