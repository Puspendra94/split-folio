import { TypeOrmPortfolioRepository } from '../typeorm/typeorm-portfolio.repository';
import { TypeOrmPortfolioStockRepository } from '../typeorm/typeorm-portfolio-stock.repository';
import { TypeOrmOrderRepository } from '../typeorm/typeorm-order.repository';
import { PortfolioEntity } from '../../modules/portfolio/portfolio.entity';
import { PortfolioStockEntity } from '../../modules/portfolio-stock/portfolio-stock.entity';
import { OrderEntity } from '../../modules/order/order.entity';

describe('TypeOrm Repositories', () => {
  let mockTypeOrmRepo: any;

  beforeEach(() => {
    mockTypeOrmRepo = {
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      remove: jest.fn().mockImplementation((data) => Promise.resolve(data)),
    };
  });

  it('TypeOrmPortfolioRepository delegates to TypeORM Repository', async () => {
    const repo = new TypeOrmPortfolioRepository(mockTypeOrmRepo);
    const p = new PortfolioEntity();

    repo.create({ name: 'Test' });
    expect(mockTypeOrmRepo.create).toHaveBeenCalled();

    await repo.save(p);
    expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(p);

    await repo.find();
    expect(mockTypeOrmRepo.find).toHaveBeenCalled();

    await repo.findOne({ where: { id: '123' } });
    expect(mockTypeOrmRepo.findOne).toHaveBeenCalled();

    await repo.remove(p);
    expect(mockTypeOrmRepo.remove).toHaveBeenCalledWith(p);
  });

  it('TypeOrmPortfolioStockRepository delegates to TypeORM Repository', async () => {
    const repo = new TypeOrmPortfolioStockRepository(mockTypeOrmRepo);
    const s = new PortfolioStockEntity();

    repo.create({ ticker: 'AAPL' });
    expect(mockTypeOrmRepo.create).toHaveBeenCalled();

    await repo.save(s);
    expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(s);

    await repo.find();
    expect(mockTypeOrmRepo.find).toHaveBeenCalled();

    await repo.findOne({ where: { id: '123' } });
    expect(mockTypeOrmRepo.findOne).toHaveBeenCalled();

    await repo.remove(s);
    expect(mockTypeOrmRepo.remove).toHaveBeenCalledWith(s);
  });

  it('TypeOrmOrderRepository delegates to TypeORM Repository', async () => {
    const repo = new TypeOrmOrderRepository(mockTypeOrmRepo);
    const o = new OrderEntity();

    await repo.save(o);
    expect(mockTypeOrmRepo.save).toHaveBeenCalledWith(o);

    await repo.find();
    expect(mockTypeOrmRepo.find).toHaveBeenCalled();

    await repo.findOne({ where: { id: '123' } });
    expect(mockTypeOrmRepo.findOne).toHaveBeenCalled();
  });
});
