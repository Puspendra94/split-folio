import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { StockAllocationDto } from '../stock-allocation.dto';
import { CreateOrderDto } from '../create-order.dto';
import { OrderTypeEnum } from '../../../../common/constants/order-type.enum';

describe('Order DTO Validation & Transformation', () => {
  describe('StockAllocationDto', () => {
    it('should transform ticker to uppercase string when given a string', () => {
      const dto = plainToInstance(StockAllocationDto, {
        ticker: ' aapl ',
        allocationPercentage: 60,
      });

      expect(dto.ticker).toBe('AAPL');
    });

    it('should return raw value when ticker is not a string', () => {
      const dto = plainToInstance(StockAllocationDto, {
        ticker: 12345 as any,
        allocationPercentage: 60,
      });

      expect(dto.ticker).toBe(12345);
    });

    it('should fail validation if allocationPercentage is out of range', async () => {
      const dto = plainToInstance(StockAllocationDto, {
        ticker: 'TSLA',
        allocationPercentage: 150,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('CreateOrderDto', () => {
    it('should pass validation for valid payload with portfolio', async () => {
      const dto = plainToInstance(CreateOrderDto, {
        orderType: OrderTypeEnum.BUY,
        totalAmount: 100,
        portfolio: [
          { ticker: 'AAPL', allocationPercentage: 60 },
          { ticker: 'TSLA', allocationPercentage: 40 },
        ],
        precision: 3,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation for valid payload with portfolioId', async () => {
      const dto = plainToInstance(CreateOrderDto, {
        orderType: OrderTypeEnum.BUY,
        totalAmount: 100,
        portfolioId: 'bf543d76-7da4-4eb4-a317-6e3e7c9e69ef',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation if both portfolio and portfolioId are provided', async () => {
      const dto = plainToInstance(CreateOrderDto, {
        orderType: OrderTypeEnum.BUY,
        totalAmount: 100,
        portfolioId: 'bf543d76-7da4-4eb4-a317-6e3e7c9e69ef',
        portfolio: [{ ticker: 'AAPL', allocationPercentage: 100 }],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation if neither portfolio nor portfolioId is provided', async () => {
      const dto = plainToInstance(CreateOrderDto, {
        orderType: OrderTypeEnum.BUY,
        totalAmount: 100,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation if orderType is invalid', async () => {
      const dto = plainToInstance(CreateOrderDto, {
        orderType: 'INVALID_TYPE' as any,
        totalAmount: 100,
        portfolio: [{ ticker: 'AAPL', allocationPercentage: 100 }],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
