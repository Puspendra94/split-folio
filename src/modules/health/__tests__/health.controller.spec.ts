import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthController } from '../health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;
  let typeOrmIndicator: TypeOrmHealthIndicator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn().mockImplementation(async (indicators) => {
              for (const fn of indicators) {
                await fn();
              }
              return {
                status: 'ok',
                info: { storage: { status: 'up' } },
                error: {},
                details: { storage: { status: 'up' } },
              };
            }),
          },
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: {
            pingCheck: jest
              .fn()
              .mockReturnValue({ postgres: { status: 'up' } }),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    typeOrmIndicator = module.get<TypeOrmHealthIndicator>(
      TypeOrmHealthIndicator,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return inmemory health check result by default', async () => {
    delete process.env.STORAGE_DRIVER;
    const result = await controller.checkHealth();
    expect(result.status).toBe('ok');
    expect(healthCheckService.check).toHaveBeenCalled();
  });

  it('should ping postgres if STORAGE_DRIVER=postgres', async () => {
    process.env.STORAGE_DRIVER = 'postgres';
    const result = await controller.checkHealth();
    expect(result.status).toBe('ok');
    expect(typeOrmIndicator.pingCheck).toHaveBeenCalledWith('postgres');
    delete process.env.STORAGE_DRIVER;
  });
});
