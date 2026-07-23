import { Controller, Get, Optional } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthCheck: HealthCheckService,
    @Optional()
    private readonly typeOrmHealthIndicator?: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  public async checkHealth(): Promise<HealthCheckResult> {
    const isPostgres = process.env.STORAGE_DRIVER?.toLowerCase() === 'postgres';

    if (isPostgres && this.typeOrmHealthIndicator) {
      return this.healthCheck.check([
        () => this.typeOrmHealthIndicator!.pingCheck('postgres'),
      ]);
    }

    return this.healthCheck.check([
      async () => ({
        storage: { status: 'up', driver: 'inmemory' },
      }),
    ]);
  }
}
