import { MemoryPortfolioRepository } from '../memory/memory-portfolio.repository';
import { MemoryPortfolioStockRepository } from '../memory/memory-portfolio-stock.repository';
import { MemoryOrderRepository } from '../memory/memory-order.repository';
import { PortfolioEntity } from '../../modules/portfolio/portfolio.entity';
import { PortfolioStockEntity } from '../../modules/portfolio-stock/portfolio-stock.entity';
import { OrderEntity, OrderStatusEnum } from '../../modules/order/order.entity';
import { OrderItemEntity } from '../../modules/order/order-item.entity';
import { OrderTypeEnum } from '../../common/constants/order-type.enum';

describe('In-Memory Repositories', () => {
  let portfolioRepo: MemoryPortfolioRepository;
  let stockRepo: MemoryPortfolioStockRepository;
  let orderRepo: MemoryOrderRepository;

  beforeEach(() => {
    MemoryPortfolioRepository.stockStore.clear();
    portfolioRepo = new MemoryPortfolioRepository();
    stockRepo = new MemoryPortfolioStockRepository();
    orderRepo = new MemoryOrderRepository();
  });

  describe('MemoryPortfolioRepository & MemoryPortfolioStockRepository', () => {
    it('should create, save, find, and remove portfolios in memory', async () => {
      const p = portfolioRepo.create({
        id: 'existing-p-id',
        createdAt: new Date('2026-01-01'),
        name: 'Test Portfolio',
        allocatedWeight: 100,
        isComplete: true,
        stocks: [
          {
            id: 'stock-preassigned-id',
            ticker: 'AAPL',
            allocationPercentage: 60,
          } as PortfolioStockEntity,
          { ticker: 'TSLA', allocationPercentage: 40 } as PortfolioStockEntity,
        ],
      });

      const saved = await portfolioRepo.save(p);
      expect(saved.id).toBe('existing-p-id');
      expect(saved.name).toBe('Test Portfolio');
      expect(saved.stocks).toHaveLength(2);

      const found = await portfolioRepo.findOne({ where: { id: saved.id } });
      expect(found).toBeDefined();
      expect(found?.name).toBe('Test Portfolio');

      const all = await portfolioRepo.find();
      expect(all).toHaveLength(1);

      // Find stock via stock repo
      const stocks = await stockRepo.find({
        where: { portfolio: { id: saved.id } },
      });
      expect(stocks).toHaveLength(2);

      const singleStock = await stockRepo.findOne({
        where: { id: stocks[0].id },
      });
      expect(singleStock).toBeDefined();

      // Remove stock
      await stockRepo.remove(stocks[0]);
      const remainingStocks = await stockRepo.find({
        where: { portfolio: { id: saved.id } },
      });
      expect(remainingStocks).toHaveLength(1);

      // Remove portfolio
      await portfolioRepo.remove(saved);
      const afterRemove = await portfolioRepo.findOne({
        where: { id: saved.id },
      });
      expect(afterRemove).toBeNull();
    });

    it('should create portfolio and stock with preassigned id and createdAt', async () => {
      const customDate = new Date('2026-01-01');
      const p = portfolioRepo.create({
        id: 'pre-p-id',
        createdAt: customDate,
        name: 'Preassigned Portfolio',
      });
      expect(p.id).toBe('pre-p-id');
      expect(p.createdAt).toBe(customDate);

      const s = stockRepo.create({
        id: 'pre-s-id',
        createdAt: customDate,
        ticker: 'AAPL',
      });
      expect(s.id).toBe('pre-s-id');
      expect(s.createdAt).toBe(customDate);
    });

    it('should find stocks matching portfolioId property fallback', async () => {
      const stockWithPid = new PortfolioStockEntity();
      stockWithPid.id = 's-pid-only';
      (stockWithPid as any).portfolioId = 'p-pid-123';
      stockWithPid.ticker = 'NVDA';
      MemoryPortfolioRepository.stockStore.set('s-pid-only', stockWithPid);

      const list = await stockRepo.find({
        where: { portfolio: { id: 'p-pid-123' } },
      });
      expect(list).toHaveLength(1);
      expect(list[0].ticker).toBe('NVDA');
    });

    it('should remove portfolio and populate stocks with matching and non-matching portfolio IDs', async () => {
      const p = portfolioRepo.create({ id: 'p-to-remove', name: 'To Remove' });
      await portfolioRepo.save(p);

      const stockMatching = new PortfolioStockEntity();
      stockMatching.id = 'stock-matching';
      stockMatching.portfolio = undefined as any;
      (stockMatching as any).portfolioId = 'p-to-remove';
      MemoryPortfolioRepository.stockStore.set('stock-matching', stockMatching);

      const stockOther = new PortfolioStockEntity();
      stockOther.id = 'stock-other';
      stockOther.portfolio = { id: 'other-portfolio-id' } as any;
      MemoryPortfolioRepository.stockStore.set('stock-other', stockOther);

      const found = await portfolioRepo.findOne({
        where: { id: 'p-to-remove' },
      });
      expect(found?.stocks).toHaveLength(1);

      await portfolioRepo.remove(p);
      expect(MemoryPortfolioRepository.stockStore.has('stock-matching')).toBe(
        false,
      );
      expect(MemoryPortfolioRepository.stockStore.has('stock-other')).toBe(
        true,
      );
    });

    it('should sort multiple portfolios by createdAt DESC', async () => {
      const p1 = portfolioRepo.create({ name: 'P1' });
      p1.createdAt = new Date('2026-01-01');
      await portfolioRepo.save(p1);

      const p2 = portfolioRepo.create({ name: 'P2' });
      p2.createdAt = new Date('2026-01-02');
      await portfolioRepo.save(p2);

      const list = await portfolioRepo.find();
      expect(list[0].name).toBe('P2');
      expect(list[1].name).toBe('P1');
    });

    it('should create stock without id/createdAt and assign auto-generated fields', async () => {
      const s = stockRepo.create({ ticker: 'AAPL', allocationPercentage: 50 });
      expect(s.id).toBeDefined();
      expect(s.createdAt).toBeDefined();

      const singleSaved = (await stockRepo.save(s)) as PortfolioStockEntity;
      expect(singleSaved.id).toBeDefined();
    });

    it('should save stocks with mixed pre-assigned and missing id/createdAt', async () => {
      const s1 = new PortfolioStockEntity();
      s1.id = 'existing-stock-id';
      s1.createdAt = new Date('2026-01-01');
      s1.ticker = 'AAPL';

      const s2 = new PortfolioStockEntity();
      s2.ticker = 'TSLA';

      const saved = (await stockRepo.save([s1, s2])) as PortfolioStockEntity[];
      expect(saved[0].id).toBe('existing-stock-id');
      expect(saved[1].id).toBeDefined();
    });

    it('should sort portfolio stocks by createdAt ASC', async () => {
      const s1 = stockRepo.create({ ticker: 'AAPL', allocationPercentage: 50 });
      s1.createdAt = new Date('2026-01-01');

      const s2 = stockRepo.create({ ticker: 'TSLA', allocationPercentage: 50 });
      s2.createdAt = new Date('2026-01-02');

      await stockRepo.save([s1, s2]);

      const list = await stockRepo.find();
      expect(list[0].ticker).toBe('AAPL');
      expect(list[1].ticker).toBe('TSLA');
    });

    it('should handle saving array of portfolio entities', async () => {
      const p1 = portfolioRepo.create({ name: 'P1' });
      const p2 = portfolioRepo.create({ name: 'P2' });

      const saved = await portfolioRepo.save([p1, p2]);
      expect(saved.name).toBe('P1');
    });

    it('should handle portfolio findOne returning null when id does not exist', async () => {
      const found = await portfolioRepo.findOne({
        where: { id: 'non-existent-p' },
      });
      expect(found).toBeNull();
    });

    it('should handle stock findOne returning null when id does not exist', async () => {
      const found = await stockRepo.findOne({
        where: { id: 'non-existent-s' },
      });
      expect(found).toBeNull();
    });

    it('should populate portfolio when stocks array is initially empty', async () => {
      const p = portfolioRepo.create({
        name: 'No Stocks Portfolio',
        stocks: [],
      });
      const saved = await portfolioRepo.save(p);
      expect(saved.stocks).toEqual([]);
    });

    it('should populate portfolio when stocks property is undefined', async () => {
      const p = new PortfolioEntity();
      p.name = 'Bare Portfolio';

      const saved = await portfolioRepo.save(p);
      const found = await portfolioRepo.findOne({ where: { id: saved.id } });
      expect(found?.stocks).toEqual([]);
    });
  });

  describe('MemoryOrderRepository', () => {
    it('should save, find, and findOne orders in memory with items', async () => {
      const item1 = new OrderItemEntity();
      item1.id = 'existing-item-id';
      item1.createdAt = new Date('2026-01-01');
      item1.ticker = 'AAPL';
      item1.allocationPercentage = 60;
      item1.pricePerShare = 100;
      item1.allocatedAmount = 600;
      item1.shareQuantity = 6;

      const item2 = new OrderItemEntity();
      item2.ticker = 'TSLA';
      item2.allocationPercentage = 40;

      const order = new OrderEntity();
      order.id = 'existing-order-id';
      order.createdAt = new Date('2026-01-01');
      order.orderType = OrderTypeEnum.BUY;
      order.totalAmount = 1000;
      order.scheduledExecutionDate = new Date();
      order.status = OrderStatusEnum.EXECUTED;
      order.items = [item1, item2];

      const saved = await orderRepo.save(order);
      expect(saved.id).toBe('existing-order-id');
      expect(saved.items[0].id).toBe('existing-item-id');
      expect(saved.items[1].id).toBeDefined();

      const found = await orderRepo.findOne({ where: { id: saved.id } });
      expect(found).toBeDefined();
      expect(found?.totalAmount).toBe(1000);

      const all = await orderRepo.find();
      expect(all).toHaveLength(1);
    });

    it('should sort multiple orders by createdAt DESC', async () => {
      const o1 = new OrderEntity();
      o1.totalAmount = 100;
      o1.createdAt = new Date('2026-01-01');

      const o2 = new OrderEntity();
      o2.totalAmount = 200;
      o2.createdAt = new Date('2026-01-02');

      await orderRepo.save(o1);
      await orderRepo.save(o2);

      const list = await orderRepo.find();
      expect(list[0].totalAmount).toBe(200);
      expect(list[1].totalAmount).toBe(100);
    });

    it('should return null if order is not found', async () => {
      const found = await orderRepo.findOne({ where: { id: 'non-existent' } });
      expect(found).toBeNull();
    });

    it('should handle order with undefined items array', async () => {
      const order = new OrderEntity();
      order.orderType = OrderTypeEnum.SELL;
      order.totalAmount = 500;

      const saved = await orderRepo.save(order);
      expect(saved.items).toBeUndefined();
    });
  });
});
