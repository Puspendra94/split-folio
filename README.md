# SplitFolio - Model Portfolio Stock Splitting & Order Management API

> A production-ready NestJS RESTful API service built for robo-advisors to automate managed investments, model portfolio allocation splitting, and order execution scheduling.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack & Dependencies](#tech-stack--dependencies)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Database Setup & Migrations](#database-setup--migrations)
  - [Running the Application](#running-the-application)
  - [Running Tests & Coverage](#running-tests--coverage)
- [API Documentation & Examples](#api-documentation--examples)
  - [1. Order Management (`/api/orders`)](#1-order-management-apiorders)
  - [2. Model Portfolio Management (`/api/portfolios`)](#2-model-portfolio-management-apiportfolios)
  - [3. Portfolio Stock CRUD & Batch Upsert (`/api/portfolios/:id/stocks`)](#3-portfolio-stock-crud--batch-upsert)
  - [4. Health Check (`/api/health`)](#4-health-check-apihealth)
- [Performance Console Logging](#performance-console-logging)
- [Project Structure](#project-structure)

---

## Overview

**SplitFolio** allows wealth management platforms and robo-advisors to:
1. Pass a total investment amount ($) alongside a model portfolio breakdown (or `portfolioId`).
2. Calculate exact dollar allocations and fractional share quantities for each stock based on specified percentage weightages.
3. Automatically determine when orders should execute based on the stock market schedule (Monday through Friday).
4. Persist and query historic split orders.
5. Dynamically override stock market prices and customize decimal precision for fractional shares (from 1 up to 7 decimal places).

---

## Key Features

- **Model Portfolio Order Splitting**: Supports `BUY` and `SELL` order types.
- **Flexible Portfolio Input**: Accepts either an inline `portfolio` array or a saved `portfolioId` from the database.
- **Strict Weightage Validation**: Enforces exact 100% total portfolio allocation weight checks and tracks portfolio completion status (`isComplete`).
- **Configurable Share Precision**: Global configuration for share quantity decimal precision (default: 3 decimal places) with per-request override options (up to 7 decimal places).
- **Market Schedule Intelligence**: Automatically schedules orders placed outside market hours or on weekends for the next valid market trading day (Monday–Friday 09:00 UTC).
- **Custom Price Overrides**: Defaults stock prices to $100 per share while honoring custom market price overrides provided by partners.
- **Atomic Database Transactions**: Wraps batch stock upserts and portfolio updates in TypeORM transactions to prevent inconsistent state.
- **Console Performance Logging**: Instruments and logs request execution duration in milliseconds for every API invocation (`[POST] /api/orders/split 201 - 14ms`).
- **100% Test Coverage**: Fully covered by 16 Jest test suites (107 tests) with 100% statement and line coverage.

---

## Tech Stack & Dependencies

- **Framework**: [NestJS](https://nestjs.com/) (v11)
- **Language**: TypeScript (v5)
- **Database / ORM**: PostgreSQL (v14+) & [TypeORM](https://typeorm.io/) (v0.3)
- **DTO Validation & Transformation**: `class-validator` & `class-transformer`
- **Health Checks**: `@nestjs/terminus`
- **Testing**: Jest (v29)
- **API Documentation / Postman**: Exported Postman collection included (`split-folio.postman_collection.json`)

---

## Getting Started

### Prerequisites

- **Node.js**: v18 or later
- **npm**: v9 or later
- **PostgreSQL**: Running instance (v14+)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/split-folio.git
cd split-folio

# Install project dependencies
npm install
```

### Environment Configuration

Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

Default `.env` configuration:
```env
PORT=3001
NODE_ENV=development

# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=split_folio

# Application Logic Defaults
DEFAULT_STOCK_PRICE=100
SHARE_DECIMAL_PRECISION=3
```

### Database Setup & Migrations

Create the database schema and run database migrations:

```bash
# Create database schema
npm run schema:create

# Run TypeORM migrations
npm run migration:run
```

### Running the Application

```bash
# Development mode (with hot reload)
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The server will start at `http://localhost:3001/api`.

### Running Tests & Coverage

```bash
# Run unit tests
npm run test

# Run test coverage report
npm run test:cov
```

---

## API Documentation & Examples

### 1. Order Management (`/api/orders`)

#### **Split Order (`POST /api/orders/split`)**

Accepts an order request using either an inline `portfolio` array OR a saved `portfolioId`.

##### **Example A: Using Inline Portfolio (BUY Order)**
```bash
curl -X POST http://localhost:3001/api/orders/split \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "BUY",
    "totalAmount": 10000,
    "portfolio": [
      { "ticker": "AAPL", "allocationPercentage": 50 },
      { "ticker": "TSLA", "allocationPercentage": 30 },
      { "ticker": "GOOGL", "allocationPercentage": 20 }
    ],
    "precision": 3
  }'
```

**Response (`201 Created`):**
```json
{
  "id": "e987c654-321a-4b5c-6d7e-890123456789",
  "orderType": "BUY",
  "totalAmount": 10000,
  "scheduledExecutionDate": "2026-07-24T09:00:00.000Z",
  "status": "EXECUTED",
  "items": [
    {
      "id": "item-1",
      "ticker": "AAPL",
      "allocationPercentage": 50,
      "pricePerShare": 100,
      "allocatedAmount": 5000,
      "shareQuantity": 50
    },
    {
      "id": "item-2",
      "ticker": "TSLA",
      "allocationPercentage": 30,
      "pricePerShare": 100,
      "allocatedAmount": 3000,
      "shareQuantity": 30
    },
    {
      "id": "item-3",
      "ticker": "GOOGL",
      "allocationPercentage": 20,
      "pricePerShare": 100,
      "allocatedAmount": 2000,
      "shareQuantity": 20
    }
  ],
  "createdAt": "2026-07-23T10:00:00.000Z"
}
```

##### **Example B: Using Saved Portfolio ID (`portfolioId`)**
```bash
curl -X POST http://localhost:3001/api/orders/split \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "BUY",
    "totalAmount": 5000,
    "portfolioId": "bf543d76-7da4-4eb4-a317-6e3e7c9e69ef"
  }'
```

##### **Example C: Custom Market Price & 4 Decimal Precision (SELL Order)**
```bash
curl -X POST http://localhost:3001/api/orders/split \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "SELL",
    "totalAmount": 5000,
    "portfolio": [
      { "ticker": "AAPL", "allocationPercentage": 60, "customMarketPrice": 185.50 },
      { "ticker": "TSLA", "allocationPercentage": 40, "customMarketPrice": 240.00 }
    ],
    "precision": 4
  }'
```

---

#### **Get Historic Orders (`GET /api/orders`)**

```bash
curl -X GET http://localhost:3001/api/orders
```

---

### 2. Model Portfolio Management (`/api/portfolios`)

#### **Create Model Portfolio (`POST /api/portfolios`)**

```bash
curl -X POST http://localhost:3001/api/portfolios \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Growth Model Portfolio",
    "stocks": [
      { "ticker": "AAPL", "allocationPercentage": 60 },
      { "ticker": "TSLA", "allocationPercentage": 40 }
    ]
  }'
```

**Response (`201 Created`):**
```json
{
  "id": "bf543d76-7da4-4eb4-a317-6e3e7c9e69ef",
  "name": "Tech Growth Model Portfolio",
  "allocatedWeight": 100,
  "isComplete": true,
  "stocks": [
    { "id": "stock-1", "ticker": "AAPL", "allocationPercentage": 60, "customMarketPrice": null },
    { "id": "stock-2", "ticker": "TSLA", "allocationPercentage": 40, "customMarketPrice": null }
  ],
  "createdAt": "2026-07-23T10:00:00.000Z"
}
```

#### **Get All Portfolios (`GET /api/portfolios`)**
```bash
curl -X GET http://localhost:3001/api/portfolios
```

---

### 3. Portfolio Stock CRUD & Batch Upsert

#### **Batch Upsert Stocks (`POST /api/portfolios/:id/stocks/batch`)**

Merges existing portfolio stock records with new incoming stocks (overriding existing allocations by ticker), validates total weight $\le 100\%$, batch inserts/updates within a transaction, and syncs `allocatedWeight` and `isComplete`.

```bash
curl -X POST http://localhost:3001/api/portfolios/bf543d76-7da4-4eb4-a317-6e3e7c9e69ef/stocks/batch \
  -H "Content-Type: application/json" \
  -d '{
    "stocks": [
      { "ticker": "AAPL", "allocationPercentage": 50 },
      { "ticker": "TSLA", "allocationPercentage": 30 },
      { "ticker": "GOOGL", "allocationPercentage": 20 }
    ]
  }'
```

---

### 4. Health Check (`/api/health`)

```bash
curl -X GET http://localhost:3001/api/health
```

**Response (`200 OK`):**
```json
{
  "status": "ok",
  "info": { "database": { "status": "up" } },
  "error": {},
  "details": { "database": { "status": "up" } }
}
```

---

## Performance Console Logging

All HTTP requests are intercepted by `LoggingInterceptor` to instrument and log response execution times in milliseconds directly to the console:

```log
[Nest] 85102  - 07/23/2026, 10:15:30 AM     LOG [HTTP] [POST] /api/orders/split 201 - 12ms
[Nest] 85102  - 07/23/2026, 10:16:05 AM     LOG [HTTP] [GET] /api/orders 200 - 4ms
```

---

## Project Structure

```
src/
├── common/
│   ├── abstract.entity.ts           # Base TypeORM entity (id, createdAt, updatedAt)
│   └── constants/
│       └── order-type.enum.ts       # BUY / SELL enum
├── config/
│   ├── cli-rdbms.ts                 # TypeORM CLI migration data source
│   ├── create-schema.ts             # Auto-creates database schema if missing
│   └── rdbms.ts                     # TypeORM database configuration
├── filters/
│   └── http-exception.filter.ts     # Global REST exception filter
├── interceptors/
│   └── logging.interceptor.ts       # Console performance response time interceptor
├── migrations/                      # Version-controlled database migrations
├── modules/
│   ├── health/                      # Terminus database health check
│   ├── market/                      # Trading day calculation & market open logic
│   ├── order/                       # Split order creation & historic order querying
│   ├── portfolio/                   # Model portfolio CRUD & weight management
│   └── portfolio-stock/             # Stock allocation CRUD & transactional batch upsert
├── shared/
│   └── services/
│       └── config.service.ts        # App configuration & default settings
├── main.ts                          # Application entry point
└── snake-naming.strategy.ts         # TypeORM snake_case database naming strategy
```

---

## License

This project is submitted as part of the technical challenge assessment.
