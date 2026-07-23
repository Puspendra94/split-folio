import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity, OrderStatusEnum } from './order.entity';
import { OrderItemEntity } from './order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  PortfolioService,
  PortfolioStockInput,
} from '../portfolio/portfolio.service';
import { MarketService } from '../market/market.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepository: Repository<OrderItemEntity>,
    private readonly portfolioService: PortfolioService,
    private readonly marketService: MarketService,
  ) {}

  /**
   * Splits an order based on model portfolio (or portfolioId) and saves the order & history.
   */
  async splitAndCreateOrder(
    createOrderDto: CreateOrderDto,
  ): Promise<OrderEntity> {
    const { orderType, totalAmount, portfolio, portfolioId, precision } =
      createOrderDto;

    const stocksToSplit = portfolioId
      ? await this.fetchStocksByPortfolioId(portfolioId)
      : portfolio!;

    // 1. Calculate stock split breakdowns via PortfolioService
    const calculatedSplits = this.portfolioService.splitPortfolio(
      stocksToSplit,
      totalAmount,
      precision,
    );

    // 2. Determine market execution date via MarketService (Mon-Fri execution schedule)
    const scheduledExecutionDate =
      this.marketService.getNextMarketExecutionDate();

    const isMarketOpenNow = this.marketService.isMarketOpen();
    const status = isMarketOpenNow
      ? OrderStatusEnum.EXECUTED
      : OrderStatusEnum.SCHEDULED;

    // 3. Create Order Entity & Order Items
    const orderItems = calculatedSplits.map((split) => {
      const item = new OrderItemEntity();
      item.ticker = split.ticker;
      item.allocationPercentage = split.allocationPercentage;
      item.pricePerShare = split.pricePerShare;
      item.allocatedAmount = split.allocatedAmount;
      item.shareQuantity = split.shareQuantity;
      return item;
    });

    const order = new OrderEntity();
    order.orderType = orderType;
    order.totalAmount = totalAmount;
    order.scheduledExecutionDate = scheduledExecutionDate;
    order.status = status;
    order.items = orderItems;

    // 4. Save and return historic order
    return this.orderRepository.save(order);
  }

  /**
   * Helper method to fetch stock allocations for a completed portfolio ID.
   */
  private async fetchStocksByPortfolioId(
    portfolioId: string,
  ): Promise<PortfolioStockInput[]> {
    const portfolio = await this.portfolioService.findOne(portfolioId);

    if (!portfolio.isComplete) {
      throw new BadRequestException(
        `Portfolio with ID "${portfolioId}" is not complete. Only complete portfolios (allocated_weight = 100%) can be used for orders.`,
      );
    }

    return (portfolio.stocks || []).map((s) => ({
      ticker: s.ticker,
      allocationPercentage: Number(s.allocationPercentage),
      customMarketPrice: s.customMarketPrice,
    }));
  }

  /**
   * Fetches all historic split orders.
   */
  async getHistoricOrders(): Promise<OrderEntity[]> {
    return this.orderRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Fetches a specific order by ID.
   */
  async getOrderById(id: string): Promise<OrderEntity> {
    const order = await this.orderRepository.findOne({
      where: { id },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID '${id}' not found`);
    }
    return order;
  }
}
