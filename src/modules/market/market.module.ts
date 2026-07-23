import { Module } from '@nestjs/common';
import { MarketService } from './market.service';
import { PRICE_RESOLUTION_STRATEGY } from './market.constants';
import { DefaultPriceResolutionStrategy } from './strategies/default-price-resolution.strategy';

@Module({
  providers: [
    DefaultPriceResolutionStrategy,
    {
      provide: PRICE_RESOLUTION_STRATEGY,
      useClass: DefaultPriceResolutionStrategy,
    },
    MarketService,
  ],
  exports: [MarketService, PRICE_RESOLUTION_STRATEGY],
})
export class MarketModule {}
