console.log('hai dunia');

const express = require("express");
const app = express();
app.use(express.json());

// Mock database
let loans = {};

// Utility function to generate loan schedule
const generateSchedule = (amount, weeks, interestRate) => {
    const totalAmount = amount + (amount * interestRate);
    const weeklyPayment = parseFloat((totalAmount / weeks).toFixed(2));
    let schedule = [];
    for (let i = 1; i <= weeks; i++) {
        schedule.push({ week: i, amount: weeklyPayment, paid: false });
    }
    return schedule;
};

// Create Loan
app.post("/loan", (req, res) => {
    const { borrowerId, amount, weeks, interestRate } = req.body;
    if (loans[borrowerId]) return res.status(400).json({ error: "Loan already exists" });
    loans[borrowerId] = {
        amount,
        outstanding: amount + (amount * interestRate),
        weeks,
        interestRate,
        schedule: generateSchedule(amount, weeks, interestRate),
        missedPayments: 0
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
const countMissedPayments = (loan) => {
    const currentWeek = loan.schedule.findIndex(payment => !payment.paid); // First unpaid week
    return loan.schedule.slice(0, currentWeek).filter(payment => !payment.paid).length;
};


// Check if Borrower is Delinquent
app.get("/loan/:borrowerId/delinquent", (req, res) => {
    const loan = loans[req.params.borrowerId];
    if (!loan) return res.status(404).json({ error: "Loan not found" });
    res.json({ delinquent: "missed: " + loan.missedPayments   });
});

// Make Payment
app.post("/loan/:borrowerId/pay", (req, res) => {
    const { borrowerId } = req.params;
    const loan = loans[borrowerId];
    if (!loan) return res.status(404).json({ error: "Loan not found" });
    
    let nextDue = loan.schedule.find(payment => !payment.paid);
    if (!nextDue) return res.status(400).json({ error: "Loan fully paid" });
    
    const { amount } = req.body;
    console.log(amount, nextDue.amount);
    // if (amount !== nextDue.amount) return res.status(400).json({ error: `Must pay exact amount ${amount} ${nextDue.amount}` });
    if (Math.abs(amount - nextDue.amount) > 0.01) {
        return res.status(400).json({ error: "Must pay exact amount" });
    }
    
    
    nextDue.paid = true;
    loan.outstanding -= amount;
    loan.missedPayments = loan.schedule.filter(payment => !payment.paid).length;
    res.json({ message: "Payment successful", loan });
});

// Get Loan Schedule
app.get("/loan/:borrowerId/schedule", (req, res) => {
    const loan = loans[req.params.borrowerId];
    if (!loan) return res.status(404).json({ error: "Loan not found" });
    res.json(loan.schedule);
});

app.listen(3000, () => console.log("Loan billing engine running on port 3000"));
