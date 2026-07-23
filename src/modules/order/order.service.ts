import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ORDER_REPOSITORY } from '../../storage/storage.constants';
import { IOrderRepository } from '../../storage/interfaces/order-repository.interface';
import { OrderEntity, OrderStatusEnum } from './order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  PortfolioService,
  PortfolioStockInput,
} from '../portfolio/portfolio.service';
import { MarketService } from '../market/market.service';
import { OrderFactory } from './factories/order.factory';

@Injectable()
export class OrderService {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    private readonly portfolioService: PortfolioService,
    private readonly marketService: MarketService,
    private readonly orderFactory: OrderFactory,
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

    // 3. Create Order Entity & Order Items using OrderFactory & OrderBuilder
    const order = this.orderFactory.createOrder({
      orderType,
      totalAmount,
      scheduledExecutionDate,
      status,
      calculatedSplits,
    });

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
