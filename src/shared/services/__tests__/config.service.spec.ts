import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ApiConfigService } from '../config.service';

describe('ApiConfigService', () => {
  let service: ApiConfigService;
  let mockConfigService: any;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'NODE_ENV':
            return 'development';
          case 'PORT':
            return 3001;
          case 'SHARE_QUANTITY_DECIMAL_PRECISION':
            return '3';
          case 'DEFAULT_STOCK_PRICE':
            return '100';
          default:
            return undefined;
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiConfigService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ApiConfigService>(ApiConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return nodeEnv', () => {
    expect(service.nodeEnv).toBe('development');
  });

  it('should return port', () => {
    expect(service.port).toBe(3001);
  });

  it('should return shareDecimalPrecision', () => {
    expect(service.shareDecimalPrecision).toBe(3);
  });

  it('should return defaultStockPrice', () => {
    expect(service.defaultStockPrice).toBe(100);
  });

  it('should fallback to defaults if config values are undefined', () => {
    mockConfigService.get.mockReturnValue(undefined);
    expect(service.nodeEnv).toBe('development');
    expect(service.port).toBe(3001);
    expect(service.shareDecimalPrecision).toBe(3);
    expect(service.defaultStockPrice).toBe(100);
  });
});
