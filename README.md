# SplitFolio - Model Portfolio Stock Splitting & Order Management API

> A production-ready NestJS RESTful API service built for robo-advisors to automate managed investments, model portfolio allocation splitting, and order execution scheduling.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Pluggable Storage Drivers](#pluggable-storage-drivers)
- [Core Business Logic & Technical Walkthrough](#core-business-logic--technical-walkthrough)
  - [1. Pluggable Storage Abstraction Layer](#1-pluggable-storage-abstraction-layer)
  - [2. Ticker Deduplication & Post-Deduplication Weighting](#2-ticker-deduplication--post-deduplication-weighting)
  - [3. Trading Calendar & Non-Market Day Order Scheduling](#3-trading-calendar--non-market-day-order-scheduling)
  - [4. Truncated Floor Precision Math for Fractional Shares](#4-truncated-floor-precision-math-for-fractional-shares)
  - [5. Portfolio Completion Status & Transactional Weight Sync](#5-portfolio-completion-status--transactional-weight-sync)
  - [6. Edge Payload Mutual Exclusion (`portfolio` vs `portfolioId`)](#6-edge-payload-mutual-exclusion-portfolio-vs-portfolioid)
  - [7. Design Pattern Implementations](#7-design-pattern-implementations)
- [Tech Stack & Dependencies](#tech-stack--dependencies)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Database Setup & Migrations (Optional)](#database-setup--migrations-optional)
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

- **Pluggable Storage Abstraction**: Instantly switch between In-Memory Map storage (zero DB required) and PostgreSQL via `STORAGE_DRIVER` env variable.
- **Model Portfolio Order Splitting**: Supports `BUY` and `SELL` order types.
- **Flexible Portfolio Input**: Accepts either an inline `portfolio` array or a saved `portfolioId` from the database.
- **Strict Weightage Validation**: Enforces exact 100% total portfolio allocation weight checks and tracks portfolio completion status (`isComplete`).
- **Configurable Share Precision**: Global configuration for share quantity decimal precision (`SHARE_DECIMAL_PRECISION=3`) with per-request override options (up to 7 decimal places).
- **Default & Custom Pricing**: Default stock price of $100 per share (`DEFAULT_STOCK_PRICE=100`) while honoring custom market price overrides provided by partners.
- **Market Schedule Intelligence**: Automatically schedules orders placed outside market hours or on weekends for the next valid market trading day (Monday–Friday 09:00 UTC).
- **Transactional Consistency**: Handles batch stock upserts and portfolio updates atomically across both in-memory map operations and PostgreSQL transactions.
- **Console Performance Logging**: Instruments and logs request execution duration in milliseconds for every API invocation (`[POST] /api/orders/split 201 - 14ms`).
- **100% Test Coverage**: Fully covered by 18 Jest test suites (141 tests across statements, branches, functions, and lines).

---

## Pluggable Storage Drivers

SplitFolio features a **Pluggable Storage Abstraction Layer** allowing you to dynamically toggle the persistence driver via environment variables without touching any business logic:

1. **In-Memory Mode (Default)**:
   ```env
   STORAGE_DRIVER=inmemory
   ```
   - Operates 100% in-memory using JavaScript `Map` data structures.
   - **Zero external database dependencies required** (satisfies technical assessment requirement *"Data should not survive application restart"*).
   - Starts instantly out-of-the-box.

2. **PostgreSQL RDBMS Mode**:
   ```env
   STORAGE_DRIVER=postgres
   ```
   - Connects to a live PostgreSQL database via TypeORM.
   - Performs schema migrations (`npm run migration:run`) and enforces database foreign key constraints.

---

## Core Business Logic & Technical Walkthrough

This section provides a deep technical walkthrough of the core architectural patterns and business logic implemented across the application.

---

### 1. Pluggable Storage Abstraction Layer

#### **The Idea**
Production applications require persistent databases (e.g. PostgreSQL), whereas technical evaluation environments or microservices may require zero-dependency in-memory execution. The storage layer must be completely decoupled from core business services (`PortfolioService`, `OrderService`, `PortfolioStockService`).

#### **Code & Architecture Implementation**
1. **Abstract Interfaces**: Defined repository interfaces (`IPortfolioRepository`, `IPortfolioStockRepository`, `IOrderRepository`) under `src/storage/interfaces/`.
2. **Injection Tokens**: Defined string injection tokens in `src/storage/storage.constants.ts`:
   ```typescript
   export const PORTFOLIO_REPOSITORY = 'PORTFOLIO_REPOSITORY';
   export const PORTFOLIO_STOCK_REPOSITORY = 'PORTFOLIO_STOCK_REPOSITORY';
   export const ORDER_REPOSITORY = 'ORDER_REPOSITORY';
   ```
3. **Dynamic Binding in `StorageModule`**: In `src/storage/storage.module.ts`, NestJS inspects `STORAGE_DRIVER` at startup:
   ```typescript
   const driver = process.env.STORAGE_DRIVER || 'inmemory';
   const isPostgres = driver.toLowerCase() === 'postgres';

   const portfolioProvider = {
     provide: PORTFOLIO_REPOSITORY,
     useClass: isPostgres ? TypeOrmPortfolioRepository : MemoryPortfolioRepository,
   };
   ```
4. **Service Consumption**: Services inject the abstract token rather than a concrete ORM repository:
   ```typescript
   constructor(
     @Inject(PORTFOLIO_REPOSITORY)
     private readonly portfolioRepository: IPortfolioRepository,
   ) {}
   ```
   *Result*: Services execute identical business logic regardless of whether data lives in JavaScript `Map` memory or PostgreSQL tables.

---

### 2. Ticker Deduplication & Post-Deduplication Weighting

#### **The Idea**
If a user submits duplicate stock tickers in a single payload (e.g. `AAPL` listed twice in `POST /api/portfolios/:id/stocks/batch` or `POST /api/orders/split`), the system must **deduplicate the array by taking the last occurrence of each ticker**. Crucially, cumulative allocation weightage must be calculated **only AFTER deduplication** to avoid false validation rejections.

#### **Code & Architecture Implementation**
Implemented in `PortfolioService` and `PortfolioStockService`:

```typescript
private deduplicatePortfolioInputs(
  stocks: PortfolioStockInput[],
): PortfolioStockInput[] {
  if (!stocks || !Array.isArray(stocks)) return [];
  const stockMap = new Map<string, PortfolioStockInput>();
  for (const s of stocks) {
    if (s && s.ticker) {
      stockMap.set(s.ticker.trim().toUpperCase(), s);
    }
  }
  return Array.from(stockMap.values());
}
```

#### **Execution Sequence**:
1. **Step 1 (Deduplicate)**: Input array passes through `deduplicatePortfolioInputs()`. If `AAPL` is passed twice with `40%` and `100%`, `Map.set()` overwrites `40%` with `100%`.
2. **Step 2 (Validate Weightage)**: `validatePortfolioAllocations()` sums percentages on the **deduplicated list**:
   ```typescript
   const deduplicatedStocks = this.deduplicatePortfolioInputs(stocks);
   this.validatePortfolioAllocations(deduplicatedStocks); // Sums 100% -> Valid!
   ```
3. **Step 3 (Order Split / Save)**: Splitting or database persistence executes cleanly with unique tickers only.

---

### 3. Trading Calendar & Non-Market Day Order Scheduling

#### **The Idea**
Stock markets operate Monday through Friday between 09:00 and 16:00 UTC schedule. When orders are submitted:
- **During Market Hours**: Order status is set to `EXECUTED`.
- **Outside Market Hours or Non-Market Days (Weekends / Evenings)**: Order status is set to `SCHEDULED` and assigned an execution timestamp for the **next valid market trading day at 09:00 UTC**.

#### **Code & Architecture Implementation**
Handled in `MarketService` (`src/modules/market/market.service.ts`):

1. **Market Hours Checking**:
   ```typescript
   isMarketOpen(date: Date = new Date()): boolean {
     const day = date.getUTCDay();
     if (day === 0 || day === 6) return false; // Sunday or Saturday

     const hour = date.getUTCHours();
     return hour >= 9 && hour < 16;
   }
   ```
2. **Next Market Execution Date Selection**:
   ```typescript
   getNextMarketExecutionDate(fromDate: Date = new Date()): Date {
     const executionDate = new Date(fromDate);
     executionDate.setUTCHours(9, 0, 0, 0); // Target 09:00 UTC

     // If called after today's market opening hour, start checking from tomorrow
     if (fromDate.getUTCHours() >= 9) {
       executionDate.setUTCDate(executionDate.getUTCDate() + 1);
     }

     // Roll forward past weekends
     while (executionDate.getUTCDay() === 0 || executionDate.getUTCDay() === 6) {
       executionDate.setUTCDate(executionDate.getUTCDate() + 1);
     }

     return executionDate;
   }
   ```
   *Behavior Example*: If an order is submitted on **Friday at 8 PM UTC** or **Saturday at 2 PM UTC**, `getNextMarketExecutionDate()` automatically rolls forward past Sunday to **Monday at 09:00 UTC**, setting `status = "SCHEDULED"`.

---

### 4. Truncated Floor Precision Math for Fractional Shares

#### **The Idea**
When dividing allocated dollar amounts by share prices (e.g. `$5,000 / $185.50 = 26.954177...` shares), standard floating-point rounding (`Math.round`) could round **up** fractional shares, causing total capital spent to exceed the user's requested `totalAmount`. Fractional share quantities must be **truncated (floored)** to the designated decimal precision.

#### **Code & Architecture Implementation**
Implemented in `PortfolioStockService.calculateStockSplit()` (`src/modules/portfolio-stock/portfolio-stock.service.ts`):

```typescript
calculateStockSplit(
  ticker: string,
  allocationPercentage: number,
  totalAmount: number,
  customMarketPrice?: number | null,
  precisionOverride?: number,
): CalculatedStockSplit {
  const pricePerShare = this.resolveStockPrice(ticker, customMarketPrice);
  const allocatedAmount = Number(
    (totalAmount * (allocationPercentage / 100)).toFixed(2),
  );

  const precision = precisionOverride ?? this.configService.shareDecimalPrecision;

  // Truncated floor precision formula:
  const rawShares = allocatedAmount / pricePerShare;
  const factor = Math.pow(10, precision);
  const shareQuantity = Math.floor(rawShares * factor) / factor;

  return {
    ticker: ticker.trim().toUpperCase(),
    allocationPercentage,
    pricePerShare,
    allocatedAmount,
    shareQuantity,
    precision,
  };
}
```

---

### 5. Portfolio Completion Status & Transactional Weight Sync

#### **The Idea**
A model portfolio cannot be used for `portfolioId` order execution unless its cumulative stock allocation percentage equals **exactly 100%** (`isComplete = true`). Whenever stocks are added, updated, or removed individually or via batch upsert, `allocatedWeight` and `isComplete` must be recalculated atomically.

#### **Code & Architecture Implementation**
Implemented in `syncPortfolioWeightAndStatus()`:

```typescript
async syncPortfolioWeightAndStatus(
  portfolioId: string,
  customPortfolioRepo?: IPortfolioRepository,
): Promise<PortfolioEntity> {
  const repo = customPortfolioRepo || this.portfolioRepository;
  const portfolio = await repo.findOne({ where: { id: portfolioId }, relations: ['stocks'] });

  const stocks = portfolio.stocks || [];
  const totalWeight = Number(
    stocks.reduce((sum, s) => sum + Number(s.allocationPercentage), 0).toFixed(2),
  );

  portfolio.allocatedWeight = totalWeight;
  portfolio.isComplete = Math.abs(totalWeight - 100) <= 0.01;

  return repo.save(portfolio);
}
```
In PostgreSQL mode (`STORAGE_DRIVER=postgres`), batch upserts wrap stock saves and status sync within a database transaction (`dataSource.transaction(...)`), guaranteeing all changes roll back if any stock fails validation.

---

### 6. Edge Payload Mutual Exclusion (`portfolio` vs `portfolioId`)

#### **The Idea**
The order execution endpoint (`POST /api/orders/split`) requires either an inline `portfolio` array OR a saved `portfolioId`, but must reject requests containing **both** or **neither** at the edge before hitting controller logic.

#### **Code & Architecture Implementation**
Custom `class-validator` decorator `@IsEitherPortfolioOrPortfolioId()` in `src/modules/order/dto/create-order.dto.ts`:

```typescript
@ValidateIf((o) => !o.portfolioId)
@IsArray()
@ValidateNested({ each: true })
@Type(() => StockAllocationDto)
portfolio?: StockAllocationDto[];

@ValidateIf((o) => !o.portfolio)
@IsString()
@IsNotEmpty()
portfolioId?: string;

@IsEitherPortfolioOrPortfolioId({
  message: 'Provide either "portfolio" or "portfolioId", but not both.',
})
validationCheck?: boolean;
```
If an invalid payload is sent, NestJS's global `ValidationPipe` immediately rejects it with `400 Bad Request`.

---

### 7. Design Pattern Implementations

#### **A. Strategy Pattern for Stock Price Resolution (`IPriceResolutionStrategy`)**
- **The Idea**: Decouple stock price resolution logic from services so live market feeds (e.g. Alpaca, Polygon.io) can be plugged in without mutating core service code.
- **Implementation**: Defined `IPriceResolutionStrategy` interface (`src/modules/market/strategies/price-resolution.strategy.interface.ts`) and concrete `DefaultPriceResolutionStrategy`. Injected via dynamic provider token `PRICE_RESOLUTION_STRATEGY` into `MarketService`.

#### **B. Strategy Pattern for Exchange Market Schedules (`IMarketScheduleStrategy`)**
- **The Idea**: Decouple market operating schedule and execution date calculations from `MarketService` to support multi-exchange schedules (e.g. 24x7 Crypto, 24x5 Forex, or standard equities).
- **Implementation**: Defined `IMarketScheduleStrategy` interface (`src/modules/market/strategies/market-schedule.strategy.interface.ts`) and concrete `StandardEquitiesMarketScheduleStrategy`. Injected via dynamic provider token `MARKET_SCHEDULE_STRATEGY` into `MarketService`.

#### **C. Factory & Builder Patterns for Order Creation (`OrderBuilder` & `OrderFactory`)**
- **The Idea**: Encapsulate step-by-step construction of complex `OrderEntity` instances and their child `OrderItemEntity[]` items using a fluent builder interface and factory wrapper.
- **Implementation**:
  - `OrderBuilder` (`src/modules/order/builders/order.builder.ts`) provides fluent methods (`setOrderType()`, `setTotalAmount()`, `addItems()`, `build()`).
  - `OrderFactory` (`src/modules/order/factories/order.factory.ts`) encapsulates entity construction and is injected directly into `OrderService`.

#### **D. Chain of Responsibility / Pipeline Pattern for Portfolio Processing (`PortfolioProcessingPipeline`)**
- **The Idea**: Encapsulate portfolio input transformation and validation steps into an extensible, sequential pipeline.
- **Implementation**: Defined `IPortfolioStep` interface (`src/modules/portfolio/pipeline/portfolio-step.interface.ts`), `NormalizeTickerStep`, and `DeduplicateStockStep`. `PortfolioProcessingPipeline` chains these steps sequentially before validation and order splitting.

---

## Tech Stack & Dependencies

- **Framework**: [NestJS](https://nestjs.com/) (v11)
- **Language**: TypeScript (v5)
- **Storage / ORM**: Pluggable In-Memory Repository Driver & PostgreSQL / [TypeORM](https://typeorm.io/) (v0.3)
- **DTO Validation & Transformation**: `class-validator` & `class-transformer`
- **Health Checks**: `@nestjs/terminus`
- **Testing**: Jest (v29)
- **API Documentation / Postman**: Exported Postman collection included (`split-folio.postman_collection.json`)

---

## Getting Started

### Prerequisites

- **Node.js**: v18 or later
- **npm**: v9 or later

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
APP_NAME=split-folio

# Storage Driver Selection: inmemory (default, zero DB required) | postgres
STORAGE_DRIVER=inmemory

# Application Logic Defaults
DEFAULT_STOCK_PRICE=100
SHARE_DECIMAL_PRECISION=3

# Database Configuration (Required only when STORAGE_DRIVER=postgres)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres
POSTGRES_SCHEMA=split_folio
```

### Database Setup & Migrations (Optional)

If running in `STORAGE_DRIVER=postgres` mode:

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

Merges existing portfolio stock records with new incoming stocks (overriding existing allocations by ticker), validates total weight $\le 100\%$, batch inserts/updates, and syncs `allocatedWeight` and `isComplete`.

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
  "info": { "storage": { "status": "up", "driver": "inmemory" } },
  "error": {},
  "details": { "storage": { "status": "up", "driver": "inmemory" } }
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
│   ├── health/                      # Terminus storage health check
│   ├── market/                      # Trading day calculation & market open logic
│   ├── order/                       # Split order creation & historic order querying
│   ├── portfolio/                   # Model portfolio CRUD & weight management
│   └── portfolio-stock/             # Stock allocation CRUD & transactional batch upsert
├── shared/
│   └── services/
│       └── config.service.ts        # App configuration & default settings
├── storage/                         # Pluggable Storage Abstraction Layer
│   ├── interfaces/                  # Abstract repository interfaces
│   ├── memory/                      # In-Memory JavaScript Map repository implementation
│   ├── typeorm/                     # PostgreSQL TypeORM repository implementation
│   ├── storage.constants.ts         # Injection tokens (PORTFOLIO_REPOSITORY, etc.)
│   └── storage.module.ts            # Global storage module selecting driver via env
├── main.ts                          # Application entry point
└── snake-naming.strategy.ts         # TypeORM snake_case database naming strategy
```

---

## License

This project is submitted as part of the technical challenge assessment.
