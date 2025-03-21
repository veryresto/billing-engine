require("dotenv").config()
const { Sequelize } = require("sequelize");

// Initialize PostgreSQL connection
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: process.env.DB_DIALECT || "postgres",
        dialectOptions: {
            ssl: {
                require: true,   // Enforce SSL
                rejectUnauthorized: false, // Set to false if using self-signed certs
            },
        },
        logging: false, // Disable logging if not needed
    }
);

// Test connection
sequelize.authenticate()
    .then(() => console.log("✅ Database connected"))
    .catch(err => console.error("❌ Database connection error:", err));

module.exports = sequelize;
