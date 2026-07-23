import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderEntity } from './order.entity';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('split')
  @HttpCode(HttpStatus.CREATED)
  async splitOrder(
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderEntity> {
    return this.orderService.splitAndCreateOrder(createOrderDto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderEntity> {
    return this.orderService.splitAndCreateOrder(createOrderDto);
  }

  @Get()
  async getHistoricOrders(): Promise<OrderEntity[]> {
    return this.orderService.getHistoricOrders();
  }

  @Get(':id')
  async getOrderById(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<OrderEntity> {
    return this.orderService.getOrderById(id);
  }
}
