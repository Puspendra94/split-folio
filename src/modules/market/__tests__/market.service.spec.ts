import { Test, TestingModule } from '@nestjs/testing';
import { MarketService } from '../market.service';
import { ApiConfigService } from '../../../shared/services/config.service';
import {
  PRICE_RESOLUTION_STRATEGY,
  MARKET_SCHEDULE_STRATEGY,
} from '../market.constants';
import { DefaultPriceResolutionStrategy } from '../strategies/default-price-resolution.strategy';
import { StandardEquitiesMarketScheduleStrategy } from '../strategies/standard-equities-market-schedule.strategy';

describe('MarketService', () => {
  let service: MarketService;
  let configService: ApiConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketService,
        DefaultPriceResolutionStrategy,
        StandardEquitiesMarketScheduleStrategy,
        {
          provide: PRICE_RESOLUTION_STRATEGY,
          useClass: DefaultPriceResolutionStrategy,
        },
        {
          provide: MARKET_SCHEDULE_STRATEGY,
          useClass: StandardEquitiesMarketScheduleStrategy,
        },
        {
          provide: ApiConfigService,
          useValue: {
            defaultStockPrice: 100,
          },
        },
      ],
    }).compile();

    service = module.get<MarketService>(MarketService);
    configService = module.get<ApiConfigService>(ApiConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isMarketOpen', () => {
    it('should return true for Monday through Friday', () => {
      const monday = new Date('2026-07-20T10:00:00Z');
      const friday = new Date('2026-07-24T10:00:00Z');

      expect(service.isMarketOpen(monday)).toBe(true);
      expect(service.isMarketOpen(friday)).toBe(true);
    });

    it('should return false for Saturday and Sunday', () => {
      const saturday = new Date('2026-07-25T10:00:00Z');
      const sunday = new Date('2026-07-26T10:00:00Z');

      expect(service.isMarketOpen(saturday)).toBe(false);
      expect(service.isMarketOpen(sunday)).toBe(false);
    });

    it('should evaluate default current date if no date parameter passed', () => {
      const isOpen = service.isMarketOpen();
      expect(typeof isOpen).toBe('boolean');
    });
  });

  describe('getNextMarketExecutionDate', () => {
    it('should return same date if submitted on a market weekday', () => {
      const wednesday = new Date('2026-07-22T14:00:00Z');
      const executionDate = service.getNextMarketExecutionDate(wednesday);
      expect(executionDate.getTime()).toBe(wednesday.getTime());
    });

    it('should return next Monday if submitted on Saturday', () => {
      const saturday = new Date('2026-07-25T14:00:00Z');
      const executionDate = service.getNextMarketExecutionDate(saturday);

      expect(executionDate.getDay()).toBe(1); // Monday
      expect(executionDate.getDate()).toBe(27); // 2026-07-27
    });

    it('should return next Monday if submitted on Sunday', () => {
      const sunday = new Date('2026-07-26T14:00:00Z');
      const executionDate = service.getNextMarketExecutionDate(sunday);

      expect(executionDate.getDay()).toBe(1); // Monday
      expect(executionDate.getDate()).toBe(27); // 2026-07-27
    });

    it('should evaluate default current date if no date parameter passed', () => {
      const date = service.getNextMarketExecutionDate();
      expect(date).toBeInstanceOf(Date);
    });
  });

  describe('getEffectiveStockPrice', () => {
    it('should return default $100 price if no custom price is provided', () => {
      const price = service.getEffectiveStockPrice('AAPL');
      expect(price).toBe(100);
    });

    it('should return custom price if custom price is provided and > 0', () => {
      const price = service.getEffectiveStockPrice('AAPL', 185.5);
      expect(price).toBe(185.5);
    });

    it('should fallback to default price if custom price is invalid or <= 0', () => {
      expect(service.getEffectiveStockPrice('TSLA', 0)).toBe(100);
      expect(service.getEffectiveStockPrice('TSLA', -50)).toBe(100);
      expect(service.getEffectiveStockPrice('TSLA', NaN)).toBe(100);
    });
  });
});
