import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateIf,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderTypeEnum } from '../../../common/constants/order-type.enum';
import { StockAllocationDto } from './stock-allocation.dto';

export function IsEitherPortfolioOrPortfolioId(
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isEitherPortfolioOrPortfolioId',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(_value: any, args: ValidationArguments) {
          const obj = args.object as any;
          const hasPortfolio =
            Array.isArray(obj.portfolio) && obj.portfolio.length > 0;
          const hasPortfolioId =
            typeof obj.portfolioId === 'string' &&
            obj.portfolioId.trim().length > 0;

          return (
            (hasPortfolio && !hasPortfolioId) ||
            (!hasPortfolio && hasPortfolioId)
          );
        },
        defaultMessage() {
          return 'Either "portfolio" or "portfolioId" must be provided, but not both.';
        },
      },
    });
  };
}

export class CreateOrderDto {
  @IsEnum(OrderTypeEnum)
  orderType: OrderTypeEnum;

  @IsNumber()
  @IsPositive()
  totalAmount: number;

  @IsEitherPortfolioOrPortfolioId()
  @ValidateIf((o) => !o.portfolio || o.portfolioId !== undefined)
  @IsString()
  portfolioId?: string;

  @ValidateIf((o) => !o.portfolioId || o.portfolio !== undefined)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockAllocationDto)
  portfolio?: StockAllocationDto[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  precision?: number;
}
