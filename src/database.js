const { Sequelize } = require("sequelize");

// Initialize PostgreSQL connection
const sequelize = new Sequelize("billing01-db", "postgres", "yourPassword", {
    host: "localhost",
    dialect: "postgres",
    logging: false, // Set true to debug SQL queries
});

// Test connection
sequelize.authenticate()
    .then(() => console.log("✅ Database connected"))
    .catch(err => console.error("❌ Database connection error:", err));

module.exports = sequelize;
