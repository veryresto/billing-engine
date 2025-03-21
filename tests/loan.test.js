const request = require("supertest");
const app = require("../src/index");

describe("Loan Billing API - Scenario 1 - Started 6 days ago", () => {
    let testLoan = {
        borrowerId: "user123",
        amount: 500,
        weeks: 50,
        interestRate: 0.1, // 10% per annum
        startDate: new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().split("T")[0] //  6 days ago
    };

    test("POST /loan - a loan should be created", async () => {
        const response = await request(app)
            .post(`/loan`)
            .send(testLoan);

        expect(response.status).toBe(200);
    });

    test("GET /loan/:borrowerId/outstanding - should return the outstanding amount", async () => {
        const response = await request(app).get(`/loan/${testLoan.borrowerId}/outstanding`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("outstanding");
        expect(response.body.outstanding).toBeCloseTo(550, 2);
    });

    test("GET /loan/:borrowerId/schedule - should return loan schedule", async () => {
        const response = await request(app).get(`/loan/${testLoan.borrowerId}/schedule`);
        expect(response.status).toBe(200);
        expect(response.body.length).toBe(50);
        expect(response.body[0]).toHaveProperty("week");
        expect(response.body[0]).toHaveProperty("amount");
    });

    test("GET /loan/:borrowerId/delinquent - should return false for a new loan", async () => {
        const response = await request(app).get(`/loan/${testLoan.borrowerId}/delinquent`);
        expect(response.status).toBe(200);
        expect(response.body.delinquent).toBe(false);
    });

    test("POST /loan/:borrowerId/pay - should make a correct payment", async () => {
        const response = await request(app)
            .post(`/loan/${testLoan.borrowerId}/pay`)
            .send({ amount: 11 });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("message", "Payment successful");
    });

    test("GET /loan/:borrowerId/outstanding - should return new outstanding amount after payment", async () => {
        const response = await request(app).get(`/loan/${testLoan.borrowerId}/outstanding`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("outstanding");
        expect(response.body.outstanding).toBeCloseTo(539, 2);
    });

    test("GET /loan/:borrowerId/payments - should return payment history", async () => {
        const response = await request(app).get(`/loan/${testLoan.borrowerId}/payments`);
        expect(response.status).toBe(200);
        expect(response.body.payments.length).toBe(1);
        expect(response.body.payments[0]).toHaveProperty("amount", 11);
    });
});
