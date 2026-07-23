import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioController } from '../portfolio.controller';
import { PortfolioService } from '../portfolio.service';

describe('PortfolioController', () => {
  let controller: PortfolioController;
  let service: PortfolioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortfolioController],
      providers: [
        {
          provide: PortfolioService,
          useValue: {
            create: jest
              .fn()
              .mockImplementation((dto) =>
                Promise.resolve({ id: 'port-123', ...dto }),
              ),
            findAll: jest.fn().mockResolvedValue([{ id: 'port-123' }]),
            findOne: jest.fn().mockResolvedValue({ id: 'port-123' }),
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

    controller = module.get<PortfolioController>(PortfolioController);
    service = module.get<PortfolioService>(PortfolioService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a portfolio', async () => {
    const dto = {
      name: 'Tech Growth',
      stocks: [{ ticker: 'AAPL', allocationPercentage: 100 }],
    };
    const result = await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result.id).toBe('port-123');
  });

  it('should find all portfolios', async () => {
    const result = await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it('should find one portfolio by id', async () => {
    const result = await controller.findOne('port-123');
    expect(service.findOne).toHaveBeenCalledWith('port-123');
    expect(result.id).toBe('port-123');
  });

  it('should update portfolio', async () => {
    const dto = { name: 'Updated Name' };
    const result = await controller.update('port-123', dto);
    expect(service.update).toHaveBeenCalledWith('port-123', dto);
    expect(result.name).toBe('Updated Name');
  });

  it('should remove portfolio', async () => {
    const result = await controller.remove('port-123');
    expect(service.remove).toHaveBeenCalledWith('port-123');
    expect(result.message).toBe('Deleted successfully');
  });
});
