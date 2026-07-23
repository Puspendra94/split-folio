# Ionixx Technical Challenge - Candidate Answers

This document provides detailed answers to the evaluation questions outlined in the **Ionixx Backend Developer Technical Challenge** specification.

---

## 1. What was your approach (thought process) to tackling this project?

### **A. Domain Modeling & Architecture**
My approach started with analyzing the business domain for managed investments (model portfolios) and automated order execution. I broke down the core requirements into distinct functional domains:
1. **Portfolio Domain**: Manages model portfolios and stock allocations (`PortfolioEntity`, `PortfolioStockEntity`).
2. **Order Execution Domain**: Manages order splitting, share quantity calculations, and historic order logs (`OrderEntity`, `OrderItemEntity`).
3. **Market Calendar Domain**: Handles trading day schedules and market open status (`MarketService`).
4. **Pluggable Storage Domain**: Provides a flexible storage abstraction layer (`StorageModule`) supporting both **In-Memory Map storage** (zero database required) and **PostgreSQL RDBMS**.
5. **Configuration Domain**: Centralizes system defaults (`DEFAULT_STOCK_PRICE=100`, `SHARE_DECIMAL_PRECISION=3`, `STORAGE_DRIVER=inmemory|postgres`) via `ApiConfigService`.

I selected **NestJS with TypeScript** to establish a clean, modular, layer-separated architecture (Controllers $\rightarrow$ Services $\rightarrow$ Pluggable Repositories $\rightarrow$ Entities/DTOs).

### **B. Defensive Validation & Financial Accuracy**
In financial order management systems, data integrity and mathematical accuracy are paramount:
- **Allocation Cap Enforcement**: Built strict checks ensuring that cumulative stock allocation percentages in a portfolio cannot exceed 100%.
- **Precision Floor Math**: Implemented share quantity calculations using truncated floor math (`Math.floor(rawQuantity * 10^precision) / 10^precision`) to ensure fractional shares never result in over-allocation of the user's investment capital.
- **DTO Layer Request Parsing**: Moved request payload mutual-exclusion checks (`portfolio` vs `portfolioId`) up to custom `class-validator` DTO decorators so invalid requests are rejected at the edge before hitting core business logic.

---

## 2. What assumptions did you make?

1. **Default Stock Price**: As specified in the prompt, stock prices default to **$100 per share** if omitted (configurable via `DEFAULT_STOCK_PRICE=100` in `.env`). However, if a partner passes a positive `customMarketPrice` for any stock, the custom market price takes priority.
2. **Share Quantity Truncation**: Fractional share quantities are floored (truncated) to the configured decimal precision (`SHARE_DECIMAL_PRECISION=3` in `.env`) rather than rounded up. This guarantees that the total dollar amount needed to place order items never exceeds the user's specified `totalAmount`.
3. **Market Trading Schedule**:
   - Trading hours are assumed to be **Monday through Friday** (09:30 to 16:00 EST / 09:00 UTC schedule).
   - If an order is submitted during open market hours, its status is set to `EXECUTED`.
   - If an order is submitted outside trading hours or over the weekend (Saturday/Sunday), its status is set to `SCHEDULED` and assigned an execution timestamp for the next trading day at 09:00 UTC.
4. **Portfolio Completion Status (`isComplete`)**: A saved model portfolio is marked `isComplete = true` only when its cumulative stock allocation percentage equals **100%**. Orders submitted via `portfolioId` require `isComplete = true`.
5. **Batch Stock Deduplication**: If duplicate stock tickers are supplied within a single batch save payload (`POST /api/portfolios/:id/stocks/batch`), the last occurrence of the ticker is applied. Tickers are strictly deduplicated and unique per portfolio.

---

## 3. What challenges did you face when creating your solution?

### **Challenge 1: Transactional Consistency in Batch Stock Upserts**
- **Problem**: When a user batch upserts stock allocations (`POST /api/portfolios/:id/stocks/batch`), multiple database writes occur sequentially. If an error or constraint failure happens midway (e.g., on the 3rd stock out of 5), the portfolio could be left in an inconsistent, partially updated state where `allocatedWeight` and `isComplete` mismatch the actual stocks in the database.
- **Solution**: Handled batch upserts and portfolio weight synchronization atomically across both PostgreSQL transactions (`dataSource.transaction(...)`) and in-memory map mutations. If any error occurs, all changes roll back cleanly.

### **Challenge 2: Request Body Mutual Exclusion (`portfolio` vs `portfolioId`)**
- **Problem**: The order split endpoint needed to accept either an inline `portfolio` array OR a saved `portfolioId`, but reject payloads containing both or neither.
- **Solution**: Created a custom `class-validator` decorator `@IsEitherPortfolioOrPortfolioId()` combined with conditional `@ValidateIf` rules. This offloads input validation completely to NestJS's `ValidationPipe` before execution reaches the controller or service.

### **Challenge 3: Supporting Standalone Zero-DB In-Memory Execution**
- **Problem**: The technical challenge specification states *"Data should not survive application restart"*, while production environments require persistent databases.
- **Solution**: Implemented a **Pluggable Storage Abstraction Layer** using abstract repository interfaces (`IPortfolioRepository`, `IPortfolioStockRepository`, `IOrderRepository`) and NestJS dynamic provider bindings. The application can switch between `inmemory` (zero database dependencies, instant start) and `postgres` via a single environment variable (`STORAGE_DRIVER=inmemory|postgres`).

---

## 4. If you were to migrate your code from its current standalone format to a fully functional production environment, what are some changes and controls you would put in place (e.g. security controls)?

### **A. Security & Access Control**
1. **Authentication & Authorization**: Integrate OAuth2 / OpenID Connect with JWT Bearer Token validation via `@nestjs/passport`. Add Role-Based Access Control (`@Roles('advisor', 'admin')`) and tenant isolation (multi-tenancy `tenantId`).
2. **API Key Management**: Require signed API key headers (`X-API-KEY`, `X-SIGNATURE`) for B2B partner integrations with HMAC request verification.
3. **Rate Limiting & Throttling**: Configure `@nestjs/throttler` or an API Gateway (Kong / AWS API Gateway) to enforce rate limits (e.g. 100 requests/minute per partner).

### **B. Live Market Data & Execution**
1. **Real-time Market Data Feeds**: Replace static/custom price resolution with streaming WebSocket / REST real-time market data providers (e.g., Alpaca, Polygon.io, or IEX Cloud) backed by a high-performance Redis cache.
2. **Asynchronous Execution Queue**: Offload scheduled orders to a distributed job queue (e.g., **BullMQ** backed by Redis or AWS SQS). A cron worker triggers at market open (09:30 EST) to process queued orders asynchronously.

### **C. Observability & Reliability**
1. **Centralized Logging & Distributed Tracing**: Export structured JSON logs to ELK / Datadog and instrument distributed tracing using **OpenTelemetry** and W3C trace contexts.
2. **Metrics & Health**: Expose Prometheus metrics (`/metrics`) tracking order execution latency, split calculation throughput, and error rates.

---

## 5. If you’ve used LLMs to solve the challenge, describe how and where you’ve used it and how did it help you in tackling the challenge? Provide specific examples and details.

LLMs were utilized as an agentic pair-programmer throughout the development lifecycle:

1. **Scaffolding Modular Architecture & Storage Abstraction**: Scaffolding NestJS module boilerplate, TypeORM configuration (`cli-rdbms.ts`), and the pluggable repository abstraction layer (`StorageModule`, `IPortfolioRepository`, `MemoryPortfolioRepository`).
2. **Automated Unit Testing & 100% Coverage**: Generating comprehensive Jest unit tests covering edge cases in DTO validation, custom class-validator constraints, precision floor scaling, and in-memory map persistence, achieving 18 passed test suites (139 tests).
3. **TypeORM Migration Generation**: Assisting in drafting and executing TypeORM database migration scripts (`AddAllocatedWeightAndIsActiveForOrderToPortfolio` and `RenameIsActiveForOrderToIsCompleteInPortfolio`).
4. **Postman Collection Structuring**: Generating the full Postman Collection JSON (`split-folio.postman_collection.json`) complete with test assertion scripts and collection variables (`baseUrl`, `portfolioId`, `stockId`, `orderId`) for rapid API testing.
