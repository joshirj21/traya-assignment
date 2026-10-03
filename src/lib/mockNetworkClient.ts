

import {
  ApiError,
  ApiResponse,
  MockNetworkConfig,
  MockRequestOptions,
  SimulatedErrorType,
} from '../types/api';
import userResponses, { MockResponseKey } from '../ApiMocks';

const DEFAULT_CONFIG: MockNetworkConfig = {
  latency: [150, 400],
  failureRate: 0,
  forcedError: null,
  simulateDuplicate: false,
  autoRetry: {
    enabled: true,
    maxRetries: 3,
    initialBackoffMs: 200,
    backoffMultiplier: 2,
  },
};

export class MockNetworkClient {
  private config: MockNetworkConfig;
  private idempotencyStore = new Map<string, ApiResponse<unknown>>();
  private requestLog: Array<{
    endpoint: string;
    timestamp: number;
    idempotencyKey?: string;
  }> = [];

  constructor(initialConfig: Partial<MockNetworkConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...initialConfig,
      autoRetry: {
        ...DEFAULT_CONFIG.autoRetry,
        ...initialConfig.autoRetry,
      },
    };
  }

  public setSimulationConfig(newConfig: Partial<MockNetworkConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      autoRetry: {
        ...this.config.autoRetry,
        ...newConfig.autoRetry,
      },
    };
  }

  public getSimulationConfig(): MockNetworkConfig {
    return { ...this.config };
  }

  public resetSimulationConfig(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.idempotencyStore.clear();
    this.requestLog = [];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateDelay(options?: MockRequestOptions): number {
    if (typeof options?.delayMs === 'number') {
      return options.delayMs;
    }
    if (typeof this.config.fixedDelayMs === 'number') {
      return this.config.fixedDelayMs;
    }
    if (Array.isArray(this.config.latency)) {
      const [min, max] = this.config.latency;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return this.config.latency;
  }

  private createSimulatedError(errorType: SimulatedErrorType): ApiError {
    switch (errorType) {
      case 'SERVICE_UNAVAILABLE':
        return new ApiError({
          code: 'SERVICE_UNAVAILABLE',
          status: 503,
          message: 'Service is temporarily overloaded. Please retry.',
          retryable: true,
        });
      case 'RATE_LIMIT':
        return new ApiError({
          code: 'RATE_LIMIT_EXCEEDED',
          status: 429,
          message: 'Too many requests. Please slow down.',
          retryable: true,
        });
      case 'TIMEOUT':
        return new ApiError({
          code: 'REQUEST_TIMEOUT',
          status: 408,
          message: 'Simulated request timeout.',
          retryable: true,
        });
      case 'NETWORK_FAILURE':
        return new ApiError({
          code: 'NETWORK_ERROR',
          status: 0,
          message: 'Device has lost internet connection.',
          retryable: true,
        });
      case 'BAD_REQUEST':
        return new ApiError({
          code: 'BAD_REQUEST',
          status: 400,
          message: 'Invalid request payload or query parameters.',
          retryable: false,
        });
      case 'UNAUTHORIZED':
        return new ApiError({
          code: 'UNAUTHORIZED',
          status: 401,
          message: 'Session expired or token is invalid.',
          retryable: false,
        });
      case 'NOT_FOUND':
        return new ApiError({
          code: 'NOT_FOUND',
          status: 404,
          message: 'Requested resource was not found.',
          retryable: false,
        });
      case 'SERVER_ERROR':
      default:
        return new ApiError({
          code: 'INTERNAL_SERVER_ERROR',
          status: 500,
          message: 'Internal server error occurred.',
          retryable: false,
        });
    }
  }

  private async executeAttempt<T>(
    endpoint: string,
    defaultMockData: T,
    options?: MockRequestOptions<T>,
  ): Promise<ApiResponse<T>> {
    const delayDuration = this.calculateDelay(options);
    if (delayDuration > 0) {
      await this.delay(delayDuration);
    }

    if (options?.idempotencyKey) {
      if (this.idempotencyStore.has(options.idempotencyKey)) {
        const cached = this.idempotencyStore.get(
          options.idempotencyKey,
        ) as ApiResponse<T>;
        return {
          ...cached,
          isDuplicate: true,
          headers: {
            ...cached.headers,
            'X-Idempotency-Replay': 'true',
          },
        };
      }
    }

    const forcedErrorType =
      options?.forcedError !== undefined
        ? options.forcedError
        : this.config.forcedError;

    if (forcedErrorType) {
      throw this.createSimulatedError(forcedErrorType);
    }

    if (this.config.failureRate > 0) {
      if (Math.random() < this.config.failureRate) {
        throw this.createSimulatedError('SERVICE_UNAVAILABLE');
      }
    }

    let responseData: T = defaultMockData;
    let status = 200;

    if (options?.mockResponseKey) {
      const mockKey = options.mockResponseKey as MockResponseKey;
      const mockObj = userResponses[mockKey];
      if (mockObj) {
        status = mockObj.status;
        if ('error' in mockObj) {
          throw new ApiError({
            code: mockObj.error.code,
            status: mockObj.status,
            message: mockObj.error.message,
            retryable: mockObj.error.retryable,
          });
        }
        if ('data' in mockObj) {
          responseData = mockObj.data as unknown as T;
        }
      }
    } else if (options?.mockData !== undefined) {
      responseData = options.mockData;
    }

    const isDuplicate = this.config.simulateDuplicate;

    const response: ApiResponse<T> = {
      data: responseData,
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-Client': 'StepFit-Mock-v1',
        ...(isDuplicate ? { 'X-Simulated-Duplicate': 'true' } : {}),
      },
      isDuplicate,
    };

    if (options?.idempotencyKey) {
      this.idempotencyStore.set(options.idempotencyKey, response);
    }

    this.requestLog.push({
      endpoint,
      timestamp: Date.now(),
      idempotencyKey: options?.idempotencyKey,
    });

    return response;
  }

  public async execute<T>(
    endpoint: string,
    defaultMockData: T,
    options?: MockRequestOptions<T>,
  ): Promise<ApiResponse<T>> {
    const maxRetries =
      options?.maxRetries ??
      (this.config.autoRetry.enabled ? this.config.autoRetry.maxRetries : 0);

    let attempt = 0;
    let backoff = this.config.autoRetry.initialBackoffMs;

    while (true) {
      try {
        return await this.executeAttempt<T>(endpoint, defaultMockData, options);
      } catch (err) {
        attempt++;
        const isApiError = err instanceof ApiError;
        const isRetryable = isApiError ? err.retryable : true;

        if (isRetryable && attempt <= maxRetries) {

          const jitter = Math.floor(Math.random() * 50);
          await this.delay(backoff + jitter);
          backoff *= this.config.autoRetry.backoffMultiplier;
          continue;
        }

        throw err;
      }
    }
  }

  public async get<T>(
    endpoint: string,
    defaultMockData: T,
    options?: MockRequestOptions<T>,
  ): Promise<ApiResponse<T>> {
    return this.execute<T>(`GET ${endpoint}`, defaultMockData, options);
  }

  public async post<T>(
    endpoint: string,
    _body: unknown,
    defaultMockData: T,
    options?: MockRequestOptions<T>,
  ): Promise<ApiResponse<T>> {
    return this.execute<T>(`POST ${endpoint}`, defaultMockData, options);
  }

  public clearIdempotencyCache(): void {
    this.idempotencyStore.clear();
  }

  public getRequestLog() {
    return [...this.requestLog];
  }
}

export const mockNetworkClient = new MockNetworkClient();
export default mockNetworkClient;
