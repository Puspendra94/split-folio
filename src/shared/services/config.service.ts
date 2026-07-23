import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiConfigService {
  constructor(private configService: ConfigService) {}

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV') || 'development';
  }

  get port(): number {
    return this.configService.get<number>('PORT') || 3001;
  }

  get shareDecimalPrecision(): number {
    const val = this.configService.get<string>(
      'SHARE_QUANTITY_DECIMAL_PRECISION',
    );
    return val ? parseInt(val, 10) : 3;
  }

  get defaultStockPrice(): number {
    const val = this.configService.get<string>('DEFAULT_STOCK_PRICE');
    return val ? parseFloat(val) : 100;
  }
}
