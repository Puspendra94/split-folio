# Ionixx Technical Challenge - Candidate Answers

This document provides detailed answers to the evaluation questions outlined in the **Ionixx Backend Developer Technical Challenge** specification.

---

## 1. What was your approach (thought process) to tackling this project?

### **A. Domain Modeling & Architecture**
My approach started with analyzing the business domain for managed investments (model portfolios) and automated order execution. I broke down the core requirements into distinct functional domains:
1. **Portfolio Domain**: Manages model portfolios and stock allocations (`PortfolioEntity`, `PortfolioStockEntity`).
2. **Order Execution Domain**: Manages order splitting, share quantity calculations, and historic order logs (`OrderEntity`, `OrderItemEntity`).
3. **Market Calendar Domain**: Handles trading day schedules and market open status (`MarketService`).
4. **Configuration Domain**: Manages system defaults such as default stock pricing ($100) and share quantity decimal precision (`ApiConfigService`).

I selected **NestJS with TypeScript** to establish a clean, modular, layer-separated architecture (Controllers $\rightarrow$ Services $\rightarrow$ Repositories $\rightarrow$ Entities/DTOs).

### **B. Defensive Validation & Financial Accuracy**
In financial order management systems, data integrity and mathematical accuracy are paramount:
- **Allocation Cap Enforcement**: Built strict checks ensuring that cumulative stock allocation percentages in a portfolio cannot exceed 100%.
- **Precision Floor Math**: Implemented share quantity calculations using truncated floor math (`Math.floor(rawQuantity * 10^precision) / 10^precision`) to ensure fractional shares never result in over-allocation of the user's investment capital.
- **DTO Layer Request Parsing**: Moved request payload mutual-exclusion checks (`portfolio` vs `portfolioId`) up to custom `class-validator` DTO decorators so invalid requests are rejected at the edge before hitting core business logic.

---

## 2. What assumptions did you make?

1. **Default Stock Price**: As specified in the prompt, stock prices default to **$100 per share** if omitted. However, if a partner passes a positive `customMarketPrice` for any stock, the custom market price takes priority.
2. **Share Quantity Truncation**: Fractional share quantities are floored (truncated) to the configured decimal precision rather than rounded up. This guarantees that the total dollar amount needed to place order items never exceeds the user's specified `totalAmount`.
3. **Market Trading Schedule**:
   - Trading hours are assumed to be **Monday through Friday** (09:30 to 16:00 EST / 09:00 UTC schedule).
   - If an order is submitted during open market hours, its status is set to `EXECUTED`.
   - If an order is submitted outside trading hours or over the weekend (Saturday/Sunday), its status is set to `SCHEDULED` and assigned an execution timestamp for the next trading day at 09:00 UTC.
4. **Portfolio Completion Status (`isComplete`)**: A saved model portfolio is marked `isComplete = true` only when its cumulative stock allocation percentage equals **100%**. Orders submitted via `portfolioId` require `isComplete = true`.

---

## 3. What challenges did you face when creating your solution?

### **Challenge 1: Transactional Consistency in Batch Stock Upserts**
- **Problem**: When a user batch upserts stock allocations (`POST /api/portfolios/:id/stocks/batch`), multiple database writes occur sequentially. If an error or constraint failure happens midway (e.g., on the 3rd stock out of 5), the portfolio could be left in an inconsistent, partially updated state where `allocatedWeight` and `isComplete` mismatch the actual stocks in the database.
- **Solution**: Wrapped the entire batch upsert operation and portfolio status recalculation inside an atomic TypeORM database transaction (`this.dataSource.transaction(...)`). If any error occurs, PostgreSQL automatically rolls back all changes cleanly.

### **Challenge 2: Request Body Mutual Exclusion (`portfolio` vs `portfolioId`)**
- **Problem**: The order split endpoint needed to accept either an inline `portfolio` array OR a saved `portfolioId`, but reject payloads containing both or neither.
- **Solution**: Created a custom `class-validator` decorator `@IsEitherPortfolioOrPortfolioId()` combined with conditional `@ValidateIf` rules. This offloads input validation completely to NestJS's `ValidationPipe` before execution reaches the controller or service.

### **Challenge 3: In-Memory Relation Stale Caching**
- **Problem**: During batch upserts, newly inserted stock entities were saved to the database, but TypeORM's pre-loaded in-memory relation array on the portfolio entity remained stale.
- **Solution**: Refactored `syncPortfolioWeightAndStatus` to re-query the portfolio entity with fresh relations inside the active transaction before returning the final response payload.

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

### **D. Pluggable Storage Abstraction**
1. **Repository Abstraction Pattern**: Define an abstract storage interface (`IPortfolioRepository`, `IOrderRepository`) so the persistence layer can be dynamically swapped via environment configuration (`STORAGE_DRIVER=inmemory|postgres|redis`).

---

## 5. If you’ve used LLMs to solve the challenge, describe how and where you’ve used it and how did it help you in tackling the challenge? Provide specific examples and details.

LLMs were utilized as an agentic pair-programmer throughout the development lifecycle:

1. **Scaffolding Modular Architecture**: Used LLM capability to generate initial NestJS module boilerplate, TypeORM configuration (`cli-rdbms.ts`), and PostgreSQL naming strategy (`snake-naming.strategy.ts`).
2. **Automated Unit Testing & 100% Coverage**: Utilized LLM code generation to construct comprehensive Jest unit tests covering edge cases in DTO validation, custom class-validator constraints, precision floor scaling, and market calendar weekend logic. This achieved **100% statement and line coverage** across all 16 test suites.
3. **TypeORM Migration Generation**: Assisted in drafting and executing TypeORM database migration scripts (`AddAllocatedWeightAndIsActiveForOrderToPortfolio` and `RenameIsActiveForOrderToIsCompleteInPortfolio`) to ensure database schema changes were safely version-controlled.
4. **Postman Collection Structuring**: Generated the full Postman Collection JSON (`split-folio.postman_collection.json`) complete with test assertion scripts and collection variables (`baseUrl`, `portfolioId`, `stockId`, `orderId`) for rapid API testing.
