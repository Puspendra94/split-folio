import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import rdbmsConfig from './config/rdbms';
import { StorageModule } from './storage/storage.module';
import { SharedModule } from './shared/shared.module';
import { HealthModule } from './modules/health/health.module';
import { MarketModule } from './modules/market/market.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { PortfolioStockModule } from './modules/portfolio-stock/portfolio-stock.module';
import { OrderModule } from './modules/order/order.module';

const isPostgres = process.env.STORAGE_DRIVER?.toLowerCase() === 'postgres';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ...(isPostgres
      ? [
          TypeOrmModule.forRoot({
            ...rdbmsConfig,
            autoLoadEntities: true,
          }),
        ]
      : []),
    StorageModule,
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
