const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();
app.use(express.json());

// Mock database
let loans = {};

// Real database
const Loan = require("./models/Loan");
const Payment = require("./models/Payment");
const { Op } = require("sequelize"); 

// Swagger Configuration
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Loan Billing API",
            version: "1.0.0",
            description: "API for managing loan payments, tracking outstanding balances, and delinquency status",
        },
    },
    apis: ["./src/index.js"], // Path to API documentation
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Utility function to generate loan schedule
const generateSchedule = (amount, weeks, interestRate, startDate) => {
    const totalAmount = amount + (amount * interestRate);
    const weeklyPayment = parseFloat((totalAmount / weeks).toFixed(2));
    let schedule = [];
    let currentDate = new Date(startDate);

    for (let i = 1; i <= weeks; i++) {
        schedule.push({
            week: i,
            amount: weeklyPayment,
            paid: false,
            dueDate: new Date(currentDate).toISOString().split("T")[0] // Set due date
        });
        currentDate.setDate(currentDate.getDate() + 7); // Move to next week
    }
    return schedule;
};

// Helper to get missed payments
const getMissedPayments = async (loanId) => {
    const today = new Date().toISOString().split("T")[0];

    return await Payment.findAll({
        where: {
            loanId: loanId,
            paid: false,
            dueDate: { [Op.lte]: today }, // Find payments due today or earlier
        },
    });
};

/**
 * @swagger
 * /loan:
 *   post:
 *     summary: Create a new loan
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               borrowerId:
 *                 default: user123
 *                 type: string
 *               amount:
 *                 default: 500
 *                 type: number
 *               weeks:
 *                 default: 50
 *                 type: integer
 *               interestRate:
 *                 default: 0.1
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Loan created successfully
 *       400:
 *         description: Loan already exists
 */
// Create Loan
app.post("/loan", async (req, res) => {
    try {
        const { borrowerId, amount, weeks, interestRate, startDate } = req.body;

        const existingLoan = await Loan.findOne({ where: { borrowerId } });
        if (existingLoan) return res.status(400).json({ error: "Loan already exists" });

        const newLoan = await Loan.create({
            borrowerId, amount,
            outstanding: amount + (amount * interestRate),
            weeks, interestRate, startDate
        });

        res.json({ message: "Loan created successfully", loan: newLoan });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /loan/{borrowerId}/outstanding:
 *   get:
 *     summary: Get outstanding balance for a borrower
 *     parameters:
 *       - in: path
 *         name: borrowerId
 *         required: true
 *         schema:
 *           default: user123
 *           type: string
 *     responses:
 *       200:
 *         description: Outstanding balance retrieved
 *       404:
 *         description: Loan not found
 */
// Get Outstanding Balance
app.get("/loan/:borrowerId/outstanding", async (req, res) => {
    const loan = await Loan.findOne({ where: { borrowerId: req.params.borrowerId } });
    if (!loan) return res.status(404).json({ error: "Loan not found" });
    res.json({ outstanding: loan.outstanding });
});

/**
 * @swagger
 * /loan/{borrowerId}/delinquent:
 *   get:
 *     summary: Check if borrower is delinquent
 *     parameters:
 *       - in: path
 *         name: borrowerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Borrower delinquency status
 *       404:
 *         description: Loan not found
 */
// Check if Borrower is Delinquent
app.get("/loan/:borrowerId/delinquent", async (req, res) => {
    try {
        const loan = await Loan.findOne({
            where: { borrowerId: req.params.borrowerId },
        });

        if (!loan) {
            return res.status(404).json({ error: "Loan not found" });
        }

        const missedPayments = await getMissedPayments(loan.id);
        res.json({ delinquent: missedPayments.length >= 2, missedPayments });
    } catch (error) {
        console.error("Error fetching delinquent status:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


/**
 * @swagger
 * /loan/{borrowerId}/pay:
 *   post:
 *     summary: Make a payment
 *     parameters:
 *       - in: path
 *         name: borrowerId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Payment successful
 *       400:
 *         description: Payment error (e.g. incorrect amount)
 *       404:
 *         description: Loan not found
 */
// Make Payment
app.post("/loan/:borrowerId/pay", async (req, res) => {
    try {
        const { borrowerId } = req.params;
        const { amount } = req.body;

        const loan = await Loan.findOne({ where: { borrowerId } });
        if (!loan) return res.status(404).json({ error: "Loan not found" });

        if (loan.outstanding < amount) return res.status(400).json({ error: "Overpayment not allowed" });

        await Payment.create({ loanId: loan.id, amount });

        loan.outstanding -= amount;
        await loan.save();

        res.json({ message: "Payment successful", loan });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /loan/{borrowerId}/schedule:
 *   get:
 *     summary: Get loan payment schedule
 *     parameters:
 *       - in: path
 *         name: borrowerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Loan schedule retrieved
 *       404:
 *         description: Loan not found
 */
// Get Loan Schedule
app.get("/loan/:borrowerId/schedule", async (req, res) => {
    try {
        const loan = await Loan.findOne({
            where: { borrowerId: req.params.borrowerId },
        });

        if (!loan) {
            return res.status(404).json({ error: "Loan not found" });
        }

        const schedule = await Payment.findAll({
            where: { loanId: loan.id },
            order: [["dueDate", "ASC"]], // Order payments by due date
        });

        res.json(schedule);
    } catch (error) {
        console.error("Error fetching loan schedule:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});


/**
 * @swagger
 * /loan/{borrowerId}/payments:
 *   get:
 *     summary: Get all payments made for a loan
 *     parameters:
 *       - in: path
 *         name: borrowerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of payments retrieved
 *       404:
 *         description: Loan not found
 */
// Get Payment History
app.get("/loan/:borrowerId/payments", async (req, res) => {
    const loan = await Loan.findOne({ where: { borrowerId: req.params.borrowerId } });
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    const payments = await Payment.findAll({ where: { loanId: loan.id } });
    res.json(payments);
});


// Only start the server if this script is run directly (prevents issues in tests)
if (require.main === module) {
    app.listen(3000, () => console.log("Loan billing engine running on port 3000"));
}

module.exports = app;
