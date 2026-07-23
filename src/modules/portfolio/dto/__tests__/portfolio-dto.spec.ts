import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePortfolioDto } from '../create-portfolio.dto';
import { UpdatePortfolioDto } from '../update-portfolio.dto';

describe('Portfolio DTOs', () => {
  describe('CreatePortfolioDto', () => {
    it('should validate valid portfolio payload', async () => {
      const dto = plainToInstance(CreatePortfolioDto, {
        name: 'Tech Growth',
        stocks: [{ ticker: 'AAPL', allocationPercentage: 100 }],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('UpdatePortfolioDto', () => {
    it('should validate valid update payload with stocks', async () => {
      const dto = plainToInstance(UpdatePortfolioDto, {
        name: 'Updated Tech',
        stocks: [{ ticker: 'AAPL', allocationPercentage: 100 }],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
