import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioStockEntity } from './portfolio-stock.entity';
import { PortfolioEntity } from '../portfolio/portfolio.entity';
import { PortfolioStockService } from './portfolio-stock.service';
import { PortfolioStockController } from './portfolio-stock.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PortfolioStockEntity, PortfolioEntity])],
  controllers: [PortfolioStockController],
  providers: [PortfolioStockService],
  exports: [PortfolioStockService],
})
export class PortfolioStockModule {}
