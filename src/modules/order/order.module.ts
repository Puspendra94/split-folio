import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { MarketModule } from '../market/market.module';

@Module({
  imports: [PortfolioModule, MarketModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
