import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import rdbmsConfig from './config/rdbms';
import { SharedModule } from './shared/shared.module';
import { HealthModule } from './modules/health/health.module';
import { MarketModule } from './modules/market/market.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { PortfolioStockModule } from './modules/portfolio-stock/portfolio-stock.module';
import { OrderModule } from './modules/order/order.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      ...rdbmsConfig,
      autoLoadEntities: true,
    }),
    SharedModule,
    HealthModule,
    MarketModule,
    PortfolioStockModule,
    PortfolioModule,
    OrderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
