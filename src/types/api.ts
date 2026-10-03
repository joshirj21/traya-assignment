

export interface ApiResponse<T> {
  data: T;
  status: number;
  headers?: Record<string, string>;
  isDuplicate?: boolean;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  retryable: boolean;
  status?: number;
  details?: unknown;
}

export class ApiError extends Error {
  code: string;
  status: number;
  retryable: boolean;
  details?: unknown;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.code = payload.code;
    this.status = payload.status ?? 500;
    this.retryable = payload.retryable;
    this.details = payload.details;
  }
}

export type SimulatedErrorType =
  | 'SERVICE_UNAVAILABLE'                   
  | 'RATE_LIMIT'                   
  | 'TIMEOUT'                   
  | 'NETWORK_FAILURE'                                
  | 'BAD_REQUEST'                       
  | 'UNAUTHORIZED'                       
  | 'NOT_FOUND'                       
  | 'SERVER_ERROR';                       

export interface MockNetworkConfig {

  latency: number | [number, number];

  fixedDelayMs?: number;

  failureRate: number;

  forcedError: SimulatedErrorType | null;

  simulateDuplicate: boolean;

  autoRetry: {
    enabled: boolean;
    maxRetries: number;
    initialBackoffMs: number;
    backoffMultiplier: number;
  };
}

export interface MockRequestOptions<T = unknown> {

  delayMs?: number;

  forcedError?: SimulatedErrorType | null;

  idempotencyKey?: string;

  mockResponseKey?: string;

  mockData?: T;

  maxRetries?: number;
}
