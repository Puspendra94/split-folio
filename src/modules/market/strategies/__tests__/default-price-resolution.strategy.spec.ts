import { Test, TestingModule } from '@nestjs/testing';
import { DefaultPriceResolutionStrategy } from '../default-price-resolution.strategy';
import { ApiConfigService } from '../../../../shared/services/config.service';

describe('DefaultPriceResolutionStrategy', () => {
  let strategy: DefaultPriceResolutionStrategy;
  let configService: ApiConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DefaultPriceResolutionStrategy,
        {
          provide: ApiConfigService,
          useValue: {
            defaultStockPrice: 100,
          },
        },
      ],
    }).compile();

    strategy = module.get<DefaultPriceResolutionStrategy>(
      DefaultPriceResolutionStrategy,
    );
    configService = module.get<ApiConfigService>(ApiConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should return custom price if valid and greater than zero', () => {
    expect(strategy.resolvePrice('AAPL', 150.5)).toBe(150.5);
  });

  it('should return default stock price if custom price is undefined, null, NaN, or <= 0', () => {
    expect(strategy.resolvePrice('AAPL')).toBe(100);
    expect(strategy.resolvePrice('AAPL', null)).toBe(100);
    expect(strategy.resolvePrice('AAPL', NaN)).toBe(100);
    expect(strategy.resolvePrice('AAPL', -10)).toBe(100);
    expect(strategy.resolvePrice('AAPL', 0)).toBe(100);
  });
});
