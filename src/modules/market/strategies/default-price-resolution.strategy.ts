import { Injectable } from '@nestjs/common';
import { ApiConfigService } from '../../../shared/services/config.service';
import { IPriceResolutionStrategy } from './price-resolution.strategy.interface';

@Injectable()
export class DefaultPriceResolutionStrategy
  implements IPriceResolutionStrategy
{
  constructor(private readonly configService: ApiConfigService) {}

  resolvePrice(ticker: string, customPrice?: number | null): number {
    if (
      customPrice !== undefined &&
      customPrice !== null &&
      !isNaN(customPrice) &&
      customPrice > 0
    ) {
      return customPrice;
    }
    return this.configService.defaultStockPrice;
  }
}
