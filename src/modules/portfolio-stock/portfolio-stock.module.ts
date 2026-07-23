import { Module } from '@nestjs/common';
import { PortfolioStockService } from './portfolio-stock.service';
import { PortfolioStockController } from './portfolio-stock.controller';

@Module({
  imports: [],
  controllers: [PortfolioStockController],
  providers: [PortfolioStockService],
  exports: [PortfolioStockService],
})
export class PortfolioStockModule {}
