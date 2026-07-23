import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PORTFOLIO_REPOSITORY,
  PORTFOLIO_STOCK_REPOSITORY,
  ORDER_REPOSITORY,
} from './storage.constants';
import { MemoryPortfolioRepository } from './memory/memory-portfolio.repository';
import { MemoryPortfolioStockRepository } from './memory/memory-portfolio-stock.repository';
import { MemoryOrderRepository } from './memory/memory-order.repository';
import { TypeOrmPortfolioRepository } from './typeorm/typeorm-portfolio.repository';
import { TypeOrmPortfolioStockRepository } from './typeorm/typeorm-portfolio-stock.repository';
import { TypeOrmOrderRepository } from './typeorm/typeorm-order.repository';
import { PortfolioEntity } from '../modules/portfolio/portfolio.entity';
import { PortfolioStockEntity } from '../modules/portfolio-stock/portfolio-stock.entity';
import { OrderEntity } from '../modules/order/order.entity';
import { OrderItemEntity } from '../modules/order/order-item.entity';

const isPostgres = process.env.STORAGE_DRIVER?.toLowerCase() === 'postgres';

@Global()
@Module({
  imports: isPostgres
    ? [
        TypeOrmModule.forFeature([
          PortfolioEntity,
          PortfolioStockEntity,
          OrderEntity,
          OrderItemEntity,
        ]),
      ]
    : [],
  providers: [
    {
      provide: PORTFOLIO_REPOSITORY,
      useClass: isPostgres
        ? TypeOrmPortfolioRepository
        : MemoryPortfolioRepository,
    },
    {
      provide: PORTFOLIO_STOCK_REPOSITORY,
      useClass: isPostgres
        ? TypeOrmPortfolioStockRepository
        : MemoryPortfolioStockRepository,
    },
    {
      provide: ORDER_REPOSITORY,
      useClass: isPostgres ? TypeOrmOrderRepository : MemoryOrderRepository,
    },
  ],
  exports: [PORTFOLIO_REPOSITORY, PORTFOLIO_STOCK_REPOSITORY, ORDER_REPOSITORY],
})
export class StorageModule {}
