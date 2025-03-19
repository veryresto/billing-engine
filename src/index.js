console.log('hai dunia');

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
    
    for (let i = 1; i <= weeks; i++) {
        let dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + (i - 1) * 7); // Each payment is due 7 days apart

        schedule.push({
            week: i,
            amount: weeklyPayment,
            paid: false,
            dueDate: dueDate.toISOString().split('T')[0] // Store date as YYYY-MM-DD
        });
    }
    return schedule;
};


// Create Loan
app.post("/loan", (req, res) => {
    const { borrowerId, amount, weeks, interestRate, startDate } = req.body;
    if (loans[borrowerId]) return res.status(400).json({ error: "Loan already exists" });

    const loanStartDate = startDate ? new Date(startDate) : new Date(); // Default to today if not provided
    loans[borrowerId] = {
        amount,
        outstanding: amount + (amount * interestRate),
        weeks,
        interestRate,
        startDate: loanStartDate.toISOString().split('T')[0], // Store loan start date
        schedule: generateSchedule(amount, weeks, interestRate, loanStartDate),
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
const getMissedPayments = (loan) => {
    const today = new Date().toISOString().split('T')[0]; // Current date in YYYY-MM-DD format
    return loan.schedule.filter(payment => !payment.paid && payment.dueDate < today);
};

// Check if Borrower is Delinquent (Updated)
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
    res.json({ message: "Payment successful" });
});

// Get Loan Schedule
app.get("/loan/:borrowerId/schedule", (req, res) => {
    const loan = loans[req.params.borrowerId];
    if (!loan) return res.status(404).json({ error: "Loan not found" });
    res.json(loan.schedule);
});

app.listen(3000, () => console.log("Loan billing engine running on port 3000"));
