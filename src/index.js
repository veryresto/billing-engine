const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json());

// Mock database
let loans = {};

// Real database
const { Loan, Schedule, Transaction, TransactionSchedule } = require("./models");
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
const generateSchedule = async (loanId, amount, weeks, interestRate, startDate) => {
    const totalAmount = amount + (amount * interestRate);
    const weeklyPayment = parseFloat((totalAmount / weeks).toFixed(2));
    let schedule = [];
    let currentDate = new Date(startDate);

    for (let i = 1; i <= weeks; i++) {
        schedule.push({
            loanId,
            amount: weeklyPayment,
            dueDate: new Date(currentDate).toISOString().split("T")[0],
            paid: false,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        currentDate.setDate(currentDate.getDate() + 7); // Move to next week
    }

    // Bulk insert payments
    await Schedule.bulkCreate(schedule);
};

// Helper to get missed payments
const getMissedPayments = async (loanId) => {
    const today = new Date().toISOString().split("T")[0];

    return await Schedule.findAll({
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

        // Check if borrower already has a loan
        const existingLoan = await Loan.findOne({ where: { borrowerId } });
        if (existingLoan) {
            return res.status(400).json({ error: "Borrower already has an active loan" });
        }


        const loanStartDate = startDate ? new Date(startDate) : new Date();
        const totalAmount = amount + (amount * interestRate);
        const weeklyPayment = parseFloat((totalAmount / weeks).toFixed(2));

        const loan = await Loan.create({
            id: uuidv4(),
            borrowerId,
            amount,
            outstanding: totalAmount,
            weeks,
            interestRate,
            startDate: loanStartDate,
        });

        let currentDate = new Date(loanStartDate);
        let paymentSchedules = [];

        for (let i = 1; i <= weeks; i++) {
            paymentSchedules.push({
                id: uuidv4(),
                loanId: loan.id,
                week: i,
                amount: weeklyPayment,
                dueDate: new Date(currentDate),
                paid: false,
            });
            currentDate.setDate(currentDate.getDate() + 7); // Move to next week
        }

        await Schedule.bulkCreate(paymentSchedules);

        res.status(201).json({ message: "Loan created successfully", loan });
    } catch (error) {
        res.status(500).json({ error: "Error creating loan", details: error.message });
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
        const { borrowerId } = req.params;
        const loan = await Loan.findOne({ where: { borrowerId } });

        if (!loan) return res.status(404).json({ error: "Loan not found" });

        const today = new Date();
        const missedPayments = await Schedule.findAll({
            where: { loanId: loan.id, paid: false, dueDate: { [Op.lt]: today } },
        });

        res.json({ delinquent: missedPayments.length >= 2, missedPayments });
    } catch (error) {
        res.status(500).json({ error: "Error fetching delinquent status", details: error.message });
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

        const today = new Date();
        const duePayments = await Schedule.findAll({
            where: { loanId: loan.id, paid: false, dueDate: { [Op.lte]: today } },
            order: [["dueDate", "ASC"]],
        });

        if (duePayments.length === 0)
            return res.status(400).json({ error: "No overdue payments available" });

        const totalDueAmount = duePayments.reduce((sum, p) => sum + p.amount, 0);
        if (Math.abs(amount - totalDueAmount) > 0.01)
            return res.status(400).json({ error: "Must pay exact amount of due payments: " + totalDueAmount });

        // Mark payments as paid
        for (const payment of duePayments) {
            await payment.update({ paid: true });
        }

        // Record the transaction
        const transaction = await Transaction.create({
            id: uuidv4(),
            loanId: loan.id,
            borrowerId,
            amountPaid: amount,
            paymentDate: today,
        });

        // Link payments to the transaction
        for (const payment of duePayments) {
            await TransactionSchedule.create({
                id: uuidv4(),
                transactionId: transaction.id,
                paymentId: payment.id,
            });
        }

        // Update outstanding balance
        loan.outstanding -= amount;
        await loan.save();

        res.json({ message: "Payment successful", transaction });
    } catch (error) {
        res.status(500).json({ error: "Error processing payment", details: error.message });
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
        const { borrowerId } = req.params;
        const loan = await Loan.findOne({ where: { borrowerId } });

        if (!loan) return res.status(404).json({ error: "Loan not found" });

        const schedule = await Schedule.findAll({
            where: { loanId: loan.id },
            order: [["week", "ASC"]],
        });

        res.json(schedule);
    } catch (error) {
        res.status(500).json({ error: "Error fetching schedule", details: error.message });
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
    try {
        const { borrowerId } = req.params;
        const loan = await Loan.findOne({ where: { borrowerId } });

        if (!loan) return res.status(404).json({ error: "Loan not found" });

        const transactions = await Transaction.findAll({
            where: { loanId: loan.id },
            include: [{ model: TransactionSchedule, include: [Schedule] }],
            order: [["paymentDate", "ASC"]],
        });

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: "Error fetching payments", details: error.message });
    }
});



// Only start the server if this script is run directly (prevents issues in tests)
if (require.main === module) {
    app.listen(3000, () => console.log("Loan billing engine running on port 3000"));
}

module.exports = app;
