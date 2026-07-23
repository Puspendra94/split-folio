import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioStockController } from '../portfolio-stock.controller';
import { PortfolioStockService } from '../portfolio-stock.service';

describe('PortfolioStockController', () => {
  let controller: PortfolioStockController;
  let service: PortfolioStockService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortfolioStockController],
      providers: [
        {
          provide: PortfolioStockService,
          useValue: {
            batchUpsert: jest.fn().mockImplementation((portfolioId, dto) =>
              Promise.resolve({
                id: portfolioId,
                allocatedWeight: 100,
                isComplete: true,
                stocks: dto.stocks,
              }),
            ),
            create: jest
              .fn()
              .mockImplementation((portfolioId, dto) =>
                Promise.resolve({ id: 'stock-123', portfolioId, ...dto }),
              ),
            findAllByPortfolio: jest
              .fn()
              .mockResolvedValue([{ id: 'stock-123' }]),
            findOne: jest.fn().mockResolvedValue({ id: 'stock-123' }),
            update: jest
              .fn()
              .mockImplementation((id, dto) => Promise.resolve({ id, ...dto })),
            remove: jest
              .fn()
              .mockResolvedValue({ message: 'Deleted successfully' }),
          },
        },
      ],
    }).compile();

    controller = module.get<PortfolioStockController>(PortfolioStockController);
    service = module.get<PortfolioStockService>(PortfolioStockService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should batch upsert stocks in portfolio', async () => {
    const dto = {
      stocks: [{ ticker: 'AAPL', allocationPercentage: 100 }],
    };
    const result = await controller.batchUpsert('port-123', dto);
    expect(service.batchUpsert).toHaveBeenCalledWith('port-123', dto);
    expect(result.id).toBe('port-123');
    expect(result.isComplete).toBe(true);
  });

  it('should create stock allocation', async () => {
    const dto = { ticker: 'AAPL', allocationPercentage: 50 };
    const result = await controller.create('port-123', dto);
    expect(service.create).toHaveBeenCalledWith('port-123', dto);
    expect(result.id).toBe('stock-123');
  });

  it('should find all stocks by portfolio', async () => {
    const result = await controller.findAllByPortfolio('port-123');
    expect(service.findAllByPortfolio).toHaveBeenCalledWith('port-123');
    expect(result).toHaveLength(1);
  });

  it('should find one stock by id', async () => {
    const result = await controller.findOne('stock-123');
    expect(service.findOne).toHaveBeenCalledWith('stock-123');
    expect(result.id).toBe('stock-123');
  });

  it('should update stock allocation', async () => {
    const dto = { allocationPercentage: 60 };
    const result = await controller.update('stock-123', dto);
    expect(service.update).toHaveBeenCalledWith('stock-123', dto);
    expect(result.allocationPercentage).toBe(60);
  });

  it('should remove stock allocation', async () => {
    const result = await controller.remove('stock-123');
    expect(service.remove).toHaveBeenCalledWith('stock-123');
    expect(result.message).toBe('Deleted successfully');
  });
});
