

import { MetricType, MetricUnit } from '../mockHealthKit/types';

export type SyncState = 'idle' | 'syncing' | 'success' | 'error' | 'cancelled';

export type SyncTrigger =
  | 'app_startup'
  | 'app_foreground'
  | 'pull_to_refresh'
  | 'manual_connect'
  | 'realtime_event'
  | 'background';

export interface NormalizedHealthRecord {
  id: string;
  syncHash: string;                                                           
  metricType: MetricType;
  value: number;
  unit: MetricUnit | string;
  startTime: string;                
  endTime: string;                
  durationSeconds?: number;
  source: string;
  normalizedAt: string;                
  metadata?: Record<string, unknown>;
}

export interface MetricSyncResult {
  metricType: MetricType;
  recordsCount: number;
  success: boolean;
  error?: string;
  lastSyncedAt: string;
}

export interface MetricStatusInfo {
  lastSyncedAt: string | null;
  count: number;
  error: string | null;
}

export interface HealthSyncStatus {
  state: SyncState;
  isSyncing: boolean;
  lastSyncTrigger?: SyncTrigger;
  lastSyncedAt: string | null;
  lastError: string | null;
  metricStatuses: Record<MetricType, MetricStatusInfo>;
}

export interface SyncOptions {
  trigger?: SyncTrigger;
  forceFullSync?: boolean;                                        
  metrics?: MetricType[];                                               
  startDate?: string;
  endDate?: string;
}

export type SyncStatusListener = (status: HealthSyncStatus) => void;
export type UnsubscribeSyncStatus = () => void;
