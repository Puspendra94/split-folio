import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PortfolioStockService } from './portfolio-stock.service';
import { CreatePortfolioStockDto } from './dto/create-portfolio-stock.dto';
import { UpdatePortfolioStockDto } from './dto/update-portfolio-stock.dto';
import { BatchUpsertStocksDto } from './dto/batch-upsert-stocks.dto';

@Controller()
export class PortfolioStockController {
  constructor(private readonly portfolioStockService: PortfolioStockService) {}

  @Post('portfolios/:portfolioId/stocks/batch')
  @HttpCode(HttpStatus.OK)
  batchUpsert(
    @Param('portfolioId') portfolioId: string,
    @Body() dto: BatchUpsertStocksDto,
  ) {
    return this.portfolioStockService.batchUpsert(portfolioId, dto);
  }

  @Post('portfolios/:portfolioId/stocks')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('portfolioId') portfolioId: string,
    @Body() dto: CreatePortfolioStockDto,
  ) {
    return this.portfolioStockService.create(portfolioId, dto);
  }

  @Get('portfolios/:portfolioId/stocks')
  findAllByPortfolio(@Param('portfolioId') portfolioId: string) {
    return this.portfolioStockService.findAllByPortfolio(portfolioId);
  }

  @Get('portfolio-stocks/:id')
  findOne(@Param('id') id: string) {
    return this.portfolioStockService.findOne(id);
  }

  @Put('portfolio-stocks/:id')
  update(@Param('id') id: string, @Body() dto: UpdatePortfolioStockDto) {
    return this.portfolioStockService.update(id, dto);
  }

  @Delete('portfolio-stocks/:id')
  remove(@Param('id') id: string) {
    return this.portfolioStockService.remove(id);
  }
}
