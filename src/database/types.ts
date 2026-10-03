

import { MetricType } from '../mockHealthKit/types';

export type MetricSource = 'healthkit' | 'health_connect' | 'app' | 'backend';

export interface FitnessMetricEntity {
  id: string;
  user_id: string | null;
  metric_type: MetricType;
  value: number;
  unit: string;
  start_time: string;                
  end_time: string;                
  source: MetricSource;
  source_record_id: string | null;
  created_at: string;                
  updated_at: string;                
}

export type SyncQueueOperation = 'create' | 'update' | 'delete';
export type SyncQueueStatus = 'pending' | 'syncing' | 'failed';

export interface SyncQueueEntity {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: SyncQueueOperation;
  payload: string;                    
  status: SyncQueueStatus;
  retry_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncStateEntity {
  id: string;
  provider: string;                                              
  last_synced_at: string | null;
  updated_at: string;
}

export interface SchemaMigrationEntity {
  version: number;
  name: string;
  applied_at: string;
}

export interface DailyAggregateResult {
  metric_type: MetricType;
  date: string;              
  value: number;
  unit: string;
  count: number;
  min_value?: number;
  max_value?: number;
}

export interface Migration {
  version: number;
  name: string;
  up: (db: DatabaseExecutor) => Promise<void> | void;
  down?: (db: DatabaseExecutor) => Promise<void> | void;
}

export interface DatabaseExecutor {
  execute: <T = any>(
    query: string,
    params?: (string | number | boolean | null)[],
  ) => Promise<T[]>;
  executeRaw: (
    query: string,
    params?: (string | number | boolean | null)[],
  ) => Promise<any>;
}

export interface MetricQueryOptions {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  ascending?: boolean;
}
