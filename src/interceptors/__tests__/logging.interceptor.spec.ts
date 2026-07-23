import { LoggingInterceptor } from '../logging.interceptor';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    interceptor = new LoggingInterceptor();

    const mockRequest = {
      method: 'GET',
      originalUrl: '/api/orders',
    };
    const mockResponse = {
      statusCode: 200,
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ data: 'ok' })),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should intercept request and measure execution duration', (done) => {
    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result).toEqual({ data: 'ok' });
        expect(mockCallHandler.handle).toHaveBeenCalled();
        done();
      },
    });
  });
});
