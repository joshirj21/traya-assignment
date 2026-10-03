

export type MetricType =
  | 'steps'
  | 'heart_rate'
  | 'sleep'
  | 'calories'
  | 'water'
  | 'activity'
  | 'weight';

export type MetricUnit =
  | 'count'
  | 'bpm'
  | 'minutes'
  | 'hours'
  | 'kcal'
  | 'ml'
  | 'kg';

export const METRIC_DEFAULT_UNITS: Record<MetricType, MetricUnit> = {
  steps: 'count',
  heart_rate: 'bpm',
  sleep: 'minutes',
  calories: 'kcal',
  water: 'ml',
  activity: 'minutes',
  weight: 'kg',
};

export type AuthorizationStatus = 'notDetermined' | 'authorized' | 'denied';

export interface HealthKitPermissions {
  read?: MetricType[];
  write?: MetricType[];
}

export interface HealthSample {
  id: string;
  metricType: MetricType;
  value: number;
  unit: MetricUnit | string;
  startTime: string;                
  endTime: string;                
  source: string;                                                    
  metadata?: Record<string, unknown>;
}

export interface SleepSample extends HealthSample {
  metricType: 'sleep';
  metadata?: {
    sleepStage?: 'deep' | 'rem' | 'core' | 'awake';
    inBedStartTime?: string;
    inBedEndTime?: string;
    [key: string]: unknown;
  };
}

export interface QueryOptions {
  startDate?: string;                                 
  endDate?: string;                                 
  limit?: number;
  ascending?: boolean;
}

export interface GenericSampleQueryOptions extends QueryOptions {
  metricType: MetricType;
}

export interface AggregationResult {
  metricType: MetricType;
  date: string;              
  value: number;
  unit: MetricUnit | string;
}

export interface HealthKitInitOptions {
  permissions?: HealthKitPermissions;
}

export interface HealthKitInitResult {
  success: boolean;
  connected: boolean;
}

export interface ConnectionStatus {
  initialized: boolean;
  connected: boolean;
  available: boolean;
}

export type HealthKitErrorCode =
  | 'NOT_INITIALIZED'
  | 'DISCONNECTED'
  | 'PERMISSION_DENIED'
  | 'INVALID_METRIC'
  | 'INVALID_DATE_RANGE'
  | 'INVALID_SAMPLE'
  | 'SAMPLE_NOT_FOUND'
  | 'UNAVAILABLE';

export class HealthKitError extends Error {
  code: HealthKitErrorCode;

  constructor(code: HealthKitErrorCode, message: string) {
    super(message);
    this.name = 'HealthKitError';
    this.code = code;
  }
}

export type HealthKitSubscriber = (sample: HealthSample) => void;
export type Unsubscribe = () => void;
