import { Module } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { PortfolioController } from './portfolio.controller';
import { PortfolioStockModule } from '../portfolio-stock/portfolio-stock.module';
import { NormalizeTickerStep } from './pipeline/steps/normalize-ticker.step';
import { DeduplicateStockStep } from './pipeline/steps/deduplicate-stock.step';
import { PortfolioProcessingPipeline } from './pipeline/portfolio-processing.pipeline';

@Module({
  imports: [PortfolioStockModule],
  controllers: [PortfolioController],
  providers: [
    NormalizeTickerStep,
    DeduplicateStockStep,
    PortfolioProcessingPipeline,
    PortfolioService,
  ],
  exports: [PortfolioService, PortfolioProcessingPipeline],
})
export class PortfolioModule {}
