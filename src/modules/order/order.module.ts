import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { MarketModule } from '../market/market.module';
import { OrderFactory } from './factories/order.factory';

@Module({
  imports: [PortfolioModule, MarketModule],
  controllers: [OrderController],
  providers: [OrderFactory, OrderService],
  exports: [OrderService, OrderFactory],
})
export class OrderModule {}
