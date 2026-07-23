# SplitFolio — System Architecture & Design Rationale

This document outlines the architectural decisions, domain constraints, engineering trade-offs, and production roadmap for **SplitFolio** — an automated portfolio management and fractional share order execution engine built with NestJS and TypeScript.

> 💡 **For a deep code and architectural walkthrough of core business logic and design patterns (Pluggable Storage Abstraction, Strategy Pattern for Price Resolution & Market Schedules, Order Builder & Factory Patterns, Portfolio Processing Pipeline, Ticker Deduplication, Fractional Share Math, and Request Validation), see the [README.md Technical Walkthrough](README.md#core-business-logic--technical-walkthrough).**

---

## 1. System Architecture & Design Philosophy

### **A. Domain Modeling & Architecture**
The system architecture isolates core financial business capabilities into distinct, decoupled domain modules:
1. **Portfolio Domain**: Manages model portfolios and stock allocations (`PortfolioEntity`, `PortfolioStockEntity`).
2. **Order Execution Domain**: Manages order splitting, share quantity calculations, and historic order logs (`OrderEntity`, `OrderItemEntity`).
3. **Market Calendar Domain**: Handles trading day schedules and market open status (`MarketService`).
4. **Pluggable Storage Domain**: Provides a flexible storage abstraction layer (`StorageModule`) supporting both **In-Memory Map storage** (zero external dependencies required) and **PostgreSQL RDBMS**.
5. **Configuration Domain**: Centralizes system defaults (`DEFAULT_STOCK_PRICE=100`, `SHARE_DECIMAL_PRECISION=3`, `STORAGE_DRIVER=inmemory|postgres`) via `ApiConfigService`.

Built with **NestJS & TypeScript** to enforce a clean, modular, layer-separated architecture (Controllers $\rightarrow$ Services $\rightarrow$ Pluggable Repositories $\rightarrow$ Entities/DTOs).

### **B. Defensive Validation & Financial Accuracy**
In financial order management systems, data integrity and mathematical accuracy are paramount:
- **Allocation Cap Enforcement**: Strict checks ensuring cumulative stock allocation percentages in a portfolio cannot exceed 100%.
- **Precision Floor Math**: Share quantity calculations use truncated floor math (`Math.floor(rawQuantity * 10^precision) / 10^precision`) to guarantee fractional shares never result in over-allocating user investment capital.
- **DTO Layer Request Parsing**: Payload mutual-exclusion checks (`portfolio` vs `portfolioId`) are handled at the DTO layer using custom `class-validator` decorators, rejecting invalid requests at the edge before hitting core business logic.

---

## 2. Key Domain Assumptions & Business Rules

1. **Default Stock Price**: Stock prices default to **$100 per share** if omitted (configurable via `DEFAULT_STOCK_PRICE=100` in `.env`). However, if a caller passes a positive `customMarketPrice` for any stock, the custom market price takes priority.
2. **Share Quantity Truncation**: Fractional share quantities are floored (truncated) to the configured decimal precision (`SHARE_DECIMAL_PRECISION=3` in `.env`) rather than rounded up. This guarantees that the total dollar amount needed to place order items never exceeds the user's specified `totalAmount`.
3. **Market Trading Schedule**:
   - Trading hours are configured for **Monday through Friday** (09:00 to 16:00 UTC schedule).
   - If an order is submitted during open market hours, its status is set to `EXECUTED`.
   - If an order is submitted outside trading hours or over the weekend (Saturday/Sunday), its status is set to `SCHEDULED` and assigned an execution timestamp for the next trading day at 09:00 UTC.
4. **Portfolio Completion Status (`isComplete`)**: A saved model portfolio is marked `isComplete = true` only when its cumulative stock allocation percentage equals **100%**. Orders submitted via `portfolioId` require `isComplete = true`.
5. **Ticker Deduplication Across Batch Saves and Order Splits**: If duplicate stock tickers are supplied in portfolio management payloads (`POST /api/portfolios/:id/stocks/batch`, `POST /api/portfolios`) OR inline order split payloads (`POST /api/orders/split`), deduplication strictly keeps the last value supplied for each ticker. Crucially, total allocation weightage is calculated only AFTER ticker deduplication has been applied.
6. **Timezone Handling**: System calculations operate strictly on standard **UTC timezone**.

---

## 3. Engineering Challenges & Solutions

### **Challenge 1: Transactional Consistency in Batch Stock Upserts**
- **Problem**: When batch upserting stock allocations (`POST /api/portfolios/:id/stocks/batch`), multiple database writes occur sequentially. If an error or constraint failure happens midway, the portfolio could be left in an inconsistent, partially updated state.
- **Solution**: Batch upserts and portfolio weight synchronization are executed atomically across both PostgreSQL transactions (`dataSource.transaction(...)`) and in-memory map mutations. If any error occurs, all changes roll back cleanly.

### **Challenge 2: Request Body Mutual Exclusion (`portfolio` vs `portfolioId`)**
- **Problem**: The order split endpoint accepts either an inline `portfolio` array OR a saved `portfolioId`, but must reject payloads containing both or neither.
- **Solution**: Created a custom `class-validator` decorator `@IsEitherPortfolioOrPortfolioId()` combined with conditional `@ValidateIf` rules. This offloads input validation completely to NestJS's `ValidationPipe` before execution reaches controller or service code.

### **Challenge 3: Supporting Zero-DB Standalone Execution & Database Persistence**
- **Problem**: Applications often need to run in lightweight standalone/testing environments (zero database dependencies) while supporting production relational databases in deployment.
- **Solution**: Implemented a **Pluggable Storage Abstraction Layer** using abstract repository interfaces (`IPortfolioRepository`, `IPortfolioStockRepository`, `IOrderRepository`) and NestJS dynamic provider bindings. The application switches between `inmemory` (zero DB required) and `postgres` via a single environment variable (`STORAGE_DRIVER=inmemory|postgres`).

---

## 4. Production Deployment & Security Roadmap

### **A. Security & Access Control**
1. **Authentication & Authorization**: Integrate OAuth2 / OpenID Connect with JWT Bearer Token validation via `@nestjs/passport`. Add Role-Based Access Control (`@Roles('advisor', 'admin')`) and tenant isolation (multi-tenancy `tenantId`).
2. **API Key Management**: Require signed API key headers (`X-API-KEY`, `X-SIGNATURE`) for B2B partner integrations with HMAC request verification.
3. **Rate Limiting & Throttling**: Configure `@nestjs/throttler` or an API Gateway (Kong / AWS API Gateway) to enforce rate limits (e.g. 100 requests/minute per partner).

### **B. Live Market Data & Execution**
1. **Real-time Market Data Feeds**: Replace static/custom price resolution with streaming WebSocket / REST real-time market data providers (e.g., Alpaca, Polygon.io, or IEX Cloud) backed by a high-performance Redis cache.
2. **Asynchronous Execution Queue**: Offload scheduled orders to a distributed job queue (e.g., **BullMQ** backed by Redis or AWS SQS). A cron worker triggers at market open (09:30 EST) to process queued orders asynchronously.
3. **Observer / Event-Driven Architecture**: Implement an Observer / Event-Driven Pattern using `@nestjs/event-emitter` or a message broker (e.g., RabbitMQ, Kafka, or AWS SNS/SQS) to emit `OrderCreatedEvent` upon order completion. Downstream services (e.g., client notifications, rebalancing analytics, audit logs, and broker order routing) can listen and process events asynchronously without coupling to the primary order creation request path.

### **C. Observability & Reliability**
1. **Centralized Logging & Distributed Tracing**: Export structured JSON logs to ELK / Datadog and instrument distributed tracing using **OpenTelemetry** and W3C trace contexts.
2. **Metrics & Health**: Expose Prometheus metrics (`/metrics`) tracking order execution latency, split calculation throughput, and error rates.

---

## 5. Engineering Methodology & Tooling

1. **Modular NestJS Architecture**: Clean separation of concerns with domain modules, DTOs, custom pipes, and global exception filters.
2. **Automated Unit Testing & 100% Coverage**: Built comprehensive Jest unit test suites covering edge cases in DTO validation, custom class-validator constraints, precision floor scaling, and in-memory map persistence, achieving 100% statement, branch, function, and line test coverage (23 test suites, 154 tests).
3. **Database Migration Management**: TypeORM database migration scripts (`AddAllocatedWeightAndIsActiveForOrderToPortfolio` and `RenameIsActiveForOrderToIsCompleteInPortfolio`).
4. **Postman Collection Structuring**: Full Postman Collection JSON (`split-folio.postman_collection.json`) with test assertion scripts and collection variables (`baseUrl`, `portfolioId`, `stockId`, `orderId`) for automated API verification.
5. **Design Pattern Auditing**: Codebase auditing and refactoring to implement enterprise design patterns (Strategy, Factory, Builder, Chain of Responsibility / Pipeline, Repository).
