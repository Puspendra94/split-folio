import { Module } from '@nestjs/common';
import { MarketService } from './market.service';
import {
  PRICE_RESOLUTION_STRATEGY,
  MARKET_SCHEDULE_STRATEGY,
} from './market.constants';
import { DefaultPriceResolutionStrategy } from './strategies/default-price-resolution.strategy';
import { StandardEquitiesMarketScheduleStrategy } from './strategies/standard-equities-market-schedule.strategy';

@Module({
  providers: [
    DefaultPriceResolutionStrategy,
    StandardEquitiesMarketScheduleStrategy,
    {
      provide: PRICE_RESOLUTION_STRATEGY,
      useClass: DefaultPriceResolutionStrategy,
    },
    {
      provide: MARKET_SCHEDULE_STRATEGY,
      useClass: StandardEquitiesMarketScheduleStrategy,
    },
    MarketService,
  ],
  exports: [MarketService, PRICE_RESOLUTION_STRATEGY, MARKET_SCHEDULE_STRATEGY],
})
export class MarketModule {}
