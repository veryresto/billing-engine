# Loan Billing API  

A **Node.js + Express** API for managing loans, payment schedules, and borrower transactions. The API supports loan creation, payment tracking, delinquency detection, and more. It uses **PostgreSQL + Sequelize** as the database.  



## Assumptions  

1. **Borrower can only have 1 loan at a time.**  
2. **Borrower can only pay the due amount and cannot pay future payments.**  


## Database Schema  

The database consists of the following tables:  

- **Loan** → Stores loan details (one per borrower).  
- **Schedule** → Stores the payment schedule for each loan.  
- **Transaction** → Records actual payments made by the borrower.  
- **TransactionSchedule** → Links transactions to scheduled payments.  

### Demo Database
Demo database can be accessed using this connection string. It is a read-replica database from [billing-demo.veryresto.com/swagger](https://billing-demo.veryresto.com/swagger)
```
postgresql://neondb_owner:npg_cj7NeVbJiRo4@ep-odd-sound-a1c4nnz2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

### Entity Relationship Diagram (ERD)  

```mermaid
erDiagram
    Loan ||--|{ Schedule : has
    Loan ||--|{ Transaction : has
    Transaction ||--|{ TransactionSchedule : links
    Schedule ||--|{ TransactionSchedule : is_paid_by

    Loan {
        STRING id
        STRING borrowerId
        DECIMAL amount
        DECIMAL outstanding
        DATE startDate
    }

    Schedule {
        STRING id
        STRING loanId
        DATE dueDate
        DECIMAL amount
        BOOLEAN paid
    }

    Transaction {
        STRING id
        STRING loanId
        STRING borrowerId
        DECIMAL amountPaid
        DATE paymentDate
    }

    TransactionSchedule {
        STRING id
        STRING transactionId
        STRING scheduleId
    }
```

## API Endpoints
Demo available at [billing-demo.veryresto.com/swagger](https://billing-demo.veryresto.com/swagger)
| Method  | Endpoint                        | Description                                      |
|---------|---------------------------------|--------------------------------------------------|
| **POST** | `/loan`                        | Create a loan for a borrower                    |
| **GET**  | `/loan/:borrowerId/schedule`   | Get payment schedule of a borrower              |
| **GET**  | `/loan/:borrowerId/delinquent` | Check if borrower is delinquent                 |
| **POST** | `/loan/:borrowerId/pay`        | Make a loan payment                             |
| **GET**  | `/loan/:borrowerId/payments`   | Get all actual payments made by the borrower    |

## How to Run in Local
1. Clone the repository
```
git clone https://github.com/veryresto/billing-engine.git
cd billing
```

2. Setup database postgresql
Assuming the database is ready, adjust .env accordingly.
```
cp .env-example .env
```
3. Install dependencies
```
npm install
```
4. Run database migrations
```
node src/migrate.js
```
5. Start the server
```
npm run start
```

Try it!

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/veryresto/billing-engine)