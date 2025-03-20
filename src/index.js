const express = require("express");
const app = express();
app.use(express.json());

// Mock database
let loans = {};

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

// Get Outstanding Balance
app.get("/loan/:borrowerId/outstanding", (req, res) => {
    const loan = loans[req.params.borrowerId];
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    res.json({ outstanding: loan.outstanding });
});

// Helper function to count missed payments correctly
const getMissedPayments = (loan) => {
    const today = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format
    return loan.schedule.filter(payment => !payment.paid && payment.dueDate < today);
};

// Check if Borrower is Delinquent
app.get("/loan/:borrowerId/delinquent", (req, res) => {
    const loan = loans[req.params.borrowerId];
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    loan.missedPayments = getMissedPayments(loan).length;
    res.json({ delinquent: loan.missedPayments >= 2, missedPayments: getMissedPayments(loan) });
});

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
    loan.missedPayments = loan.schedule.filter(payment => !payment.paid && payment.dueDate < now).length;

    res.json({
        message: "Payment successful",
        payment: { amount, date: now, coveredWeeks },
        loan
    });
});

// Get Loan Schedule
app.get("/loan/:borrowerId/schedule", (req, res) => {
    const loan = loans[req.params.borrowerId];
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    res.json(loan.schedule);
});

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
