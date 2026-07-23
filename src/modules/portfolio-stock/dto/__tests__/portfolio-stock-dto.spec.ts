import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePortfolioStockDto } from '../create-portfolio-stock.dto';
import { UpdatePortfolioStockDto } from '../update-portfolio-stock.dto';
import { BatchUpsertStocksDto } from '../batch-upsert-stocks.dto';

describe('PortfolioStock DTOs', () => {
  describe('CreatePortfolioStockDto', () => {
    it('should transform ticker to uppercase string when given string', () => {
      const dto = plainToInstance(CreatePortfolioStockDto, {
        ticker: ' tsla ',
        allocationPercentage: 50,
      });
      expect(dto.ticker).toBe('TSLA');
    });

    it('should return raw ticker when not a string', () => {
      const dto = plainToInstance(CreatePortfolioStockDto, {
        ticker: 9999 as any,
        allocationPercentage: 50,
      });
      expect(dto.ticker).toBe(9999);
    });
  });

  describe('UpdatePortfolioStockDto', () => {
    it('should transform ticker to uppercase string when provided', () => {
      const dto = plainToInstance(UpdatePortfolioStockDto, {
        ticker: ' aapl ',
      });
      expect(dto.ticker).toBe('AAPL');
    });

    it('should return raw ticker when not a string', () => {
      const dto = plainToInstance(UpdatePortfolioStockDto, {
        ticker: 8888 as any,
      });
      expect(dto.ticker).toBe(8888);
    });
  });

  describe('BatchUpsertStocksDto', () => {
    it('should validate valid batch upsert payload', async () => {
      const dto = plainToInstance(BatchUpsertStocksDto, {
        stocks: [{ ticker: 'AAPL', allocationPercentage: 100 }],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
