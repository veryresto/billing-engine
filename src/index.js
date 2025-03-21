const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();
app.use(express.json());

// Mock database
let loans = {};

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
const getMissedPayments = (loan) => {
    const today = new Date().toISOString().split("T")[0]; // Current date in YYYY-MM-DD format
    return loan.schedule.filter(payment => !payment.paid && payment.dueDate <= today);
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
app.post("/loan", (req, res) => {
    const { borrowerId, amount, weeks, interestRate, startDate } = req.body;
    if (loans[borrowerId]) return res.status(400).json({ error: "Loan already exists" });

    const loanStartDate = startDate ? new Date(startDate) : new Date();
    loans[borrowerId] = {
        amount,
        outstanding: amount + (amount * interestRate),
        weeks,
        interestRate,
        schedule: generateSchedule(amount, weeks, interestRate, loanStartDate),
        missedPayments: 0,
        payments: [] // Store payment transactions
    };

    res.json({ message: "Loan created successfully", loan: loans[borrowerId] });
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
app.get("/loan/:borrowerId/outstanding", (req, res) => {
    const loan = loans[req.params.borrowerId];
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
app.get("/loan/:borrowerId/delinquent", (req, res) => {
    const loan = loans[req.params.borrowerId];
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    loan.missedPayments = getMissedPayments(loan).length;
    res.json({ delinquent: loan.missedPayments >= 2, missedPayments: getMissedPayments(loan) });
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
app.post("/loan/:borrowerId/pay", (req, res) => {
    const { borrowerId } = req.params;
    const loan = loans[borrowerId];
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    let now = new Date().toISOString().split("T")[0];

    // Find due but unpaid payments (including missed payments)
    let duePayments = loan.schedule.filter(payment => !payment.paid && payment.dueDate <= now);
    if (duePayments.length === 0) return res.status(400).json({ error: "No due payments" });

    const totalDueAmount = duePayments.reduce((sum, p) => sum + p.amount, 0);
    const { amount } = req.body;

    if (Math.abs(amount - totalDueAmount) > 0.01) {
        return res.status(400).json({ error: "Must pay exact amount of due payments: " + totalDueAmount });
    }

    // Mark payments as paid and record payment transaction
    let coveredWeeks = [];
    duePayments.forEach(payment => {
        payment.paid = true;
        coveredWeeks.push(payment.week);
    });

    // Save payment record
    loan.payments.push({
        amount,
        date: now,
        coveredWeeks
    });

    // Update loan balance & missed payments
    loan.outstanding -= amount;
    loan.missedPayments = getMissedPayments(loan).length;

    res.json({
        message: "Payment successful",
        payment: { amount, date: now, coveredWeeks }
    });
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
app.get("/loan/:borrowerId/schedule", (req, res) => {
    const loan = loans[req.params.borrowerId];
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    res.json(loan.schedule);
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
app.get("/loan/:borrowerId/payments", (req, res) => {
    const loan = loans[req.params.borrowerId];
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    res.json({ payments: loan.payments });
});

// Only start the server if this script is run directly (prevents issues in tests)
if (require.main === module) {
    app.listen(3000, () => console.log("Loan billing engine running on port 3000"));
}

module.exports = app;
