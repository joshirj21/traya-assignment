

import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
} from 'react-native';
import {
  fitnessMetricsDao,
  FitnessMetricsDao,
} from '../database/repositories/fitnessMetricsDao';
import {
  syncStateDao,
  SyncStateDao,
} from '../database/repositories/syncStateDao';
import { FitnessMetricEntity } from '../database/types';
import mockNetworkClient, { MockNetworkClient } from '../lib/mockNetworkClient';
import {
  getUserDetailsFromStorage,
  isHealthKitConnectedInStorage,
  storage,
} from '../lib/storage';
import MockHealthKit, {
  HealthSample,
  MetricType,
  Unsubscribe as UnsubscribeHealthKit,
} from '../mockHealthKit';
import { METRICS_STORAGE_KEYS } from '../services/metricsService';
import { normalizeHealthSamples } from './normalizer';
import {
  HealthSyncStatus,
  MetricSyncResult,
  NormalizedHealthRecord,
  SyncOptions,
  SyncState,
  SyncStatusListener,
  SyncTrigger,
  UnsubscribeSyncStatus,
} from './types';

export const ALL_SYNC_METRICS: MetricType[] = [
  'steps',
  'heart_rate',
  'sleep',
  'calories',
  'water',
  'activity',
  'weight',
];

export const HEALTH_SYNC_STORAGE_PREFIX = 'healthSyncCursor_' as const;

const createBatchIdempotencyKey = (records: NormalizedHealthRecord[]): string => {
  const signature = records.map(record => record.syncHash).sort().join('|');
  let hash = 2166136261;
  for (let i = 0; i < signature.length; i++) {
    hash ^= signature.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `health_batch_${(hash >>> 0).toString(16)}`;
};

export class HealthSyncManager {
  private networkClient: MockNetworkClient;
  private appStateSubscription: NativeEventSubscription | null = null;
  private healthKitSubscription: UnsubscribeHealthKit | null = null;
  private currentAppState: AppStateStatus =
    (AppState.currentState as AppStateStatus) || 'active';

  private isInitialized: boolean = false;
  private isSyncing: boolean = false;
  private abortController: AbortController | null = null;

  private statusListeners = new Set<SyncStatusListener>();

  private status: HealthSyncStatus = {
    state: 'idle',
    isSyncing: false,
    lastSyncedAt: null,
    lastError: null,
    metricStatuses: {
      steps: { lastSyncedAt: null, count: 0, error: null },
      heart_rate: { lastSyncedAt: null, count: 0, error: null },
      sleep: { lastSyncedAt: null, count: 0, error: null },
      calories: { lastSyncedAt: null, count: 0, error: null },
      water: { lastSyncedAt: null, count: 0, error: null },
      activity: { lastSyncedAt: null, count: 0, error: null },
      weight: { lastSyncedAt: null, count: 0, error: null },
    },
  };

  constructor(networkClient: MockNetworkClient = mockNetworkClient) {
    this.networkClient = networkClient;
    this.loadPersistedCursors();
  }

  private loadPersistedCursors(): void {
    try {
      const globalLastSynced = storage.getString(
        METRICS_STORAGE_KEYS.LAST_SYNCED_AT,
      );
      if (globalLastSynced) {
        this.status.lastSyncedAt = globalLastSynced;
      }

      ALL_SYNC_METRICS.forEach(metric => {
        const metricCursor = storage.getString(
          `${HEALTH_SYNC_STORAGE_PREFIX}${metric}`,
        );
        if (metricCursor) {
          this.status.metricStatuses[metric].lastSyncedAt = metricCursor;
        }
      });
    } catch (e) {
      console.error('Failed to load sync cursors from MMKV:', e);
    }
  }

  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    this.isInitialized = true;

    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );

    const isConnected = isHealthKitConnectedInStorage();
    if (!isConnected) {
      return true;
    }

    try {

      if (!MockHealthKit.getConnectionStatus().initialized) {
        await MockHealthKit.initHealthKit({
          permissions: {
            read: ALL_SYNC_METRICS,
            write: ['weight', 'steps'],
          },
        });
      }

      this.healthKitSubscription = MockHealthKit.subscribe(
        '*',
        this.handleRealtimeHealthSample,
      );
    } catch (err) {
      console.error('Failed to initialize HealthKit in sync manager:', err);
      this.healthKitSubscription?.();
      this.healthKitSubscription = null;
      this.appStateSubscription?.remove();
      this.appStateSubscription = null;
      this.isInitialized = false;
      return false;
    }

    return true;
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    const isReturningToForeground =
      (this.currentAppState === 'background' ||
        this.currentAppState === 'inactive') &&
      nextAppState === 'active';

    this.currentAppState = nextAppState;

    if (isReturningToForeground && isHealthKitConnectedInStorage()) {
      this.sync({ trigger: 'app_foreground' }).catch(err => {
        console.warn('Foreground resume sync error:', err);
      });
    }
  };

  private handleRealtimeHealthSample = async (sample: HealthSample) => {
    if (this.isSyncing) return;
    try {
      await this.syncMetric(sample.metricType, { trigger: 'realtime_event' });
    } catch (e) {
      console.error('Error syncing realtime sample:', e);
    }
  };

  public async sync(options: SyncOptions = {}): Promise<HealthSyncStatus> {
    const isConnected = isHealthKitConnectedInStorage();
    if (!isConnected) {
      this.updateStatus({ state: 'idle', isSyncing: false });
      return this.getSyncStatus();
    }

    if (this.isSyncing) {
      return this.getSyncStatus();
    }

    this.isSyncing = true;
    this.abortController = new AbortController();

    const trigger = options.trigger || 'manual_connect';
    this.updateStatus({
      state: 'syncing',
      isSyncing: true,
      lastSyncTrigger: trigger,
      lastError: null,
    });

    const metricsToSync = options.metrics || ALL_SYNC_METRICS;
    const accumulatedRecords: NormalizedHealthRecord[] = [];
    const pendingMetricCursors = new Map<MetricType, { timestamp: string; count: number }>();

    try {
      if (!MockHealthKit.getConnectionStatus().initialized) {
        await MockHealthKit.initHealthKit({
          permissions: {
            read: ALL_SYNC_METRICS,
            write: ['weight', 'steps'],
          },
        });
      }

      for (const metric of metricsToSync) {
        if (this.abortController.signal.aborted) {
          throw new Error('Sync was cancelled');
        }

        const cursor = options.forceFullSync
          ? undefined
          : this.status.metricStatuses[metric].lastSyncedAt || undefined;

        const rawSamples = await MockHealthKit.getSamples({
          metricType: metric,
          startDate: options.startDate || cursor,
          endDate: options.endDate,
          ascending: true,
        });

        if (rawSamples.length > 0) {

          const normalized = normalizeHealthSamples(rawSamples);
          accumulatedRecords.push(...normalized);

          const latestSampleTime = normalized[normalized.length - 1].endTime;
          pendingMetricCursors.set(metric, {
            timestamp: latestSampleTime,
            count: normalized.length,
          });
        }
      }

      if (accumulatedRecords.length > 0) {
        const user = getUserDetailsFromStorage();
        const userId = user?.user?.name
          ? `user_${user.user.name.toLowerCase().replace(/\s+/g, '_')}`
          : 'local_user';
        const now = new Date().toISOString();

        const dbEntities: FitnessMetricEntity[] = accumulatedRecords.map(r => ({
          id: r.id,
          user_id: userId,
          metric_type: r.metricType,
          value: r.value,
          unit: r.unit,
          start_time: r.startTime,
          end_time: r.endTime,
          source: (r.source as any) || 'healthkit',
          source_record_id: (r.metadata?.sourceRecordId as string) || r.id,
          created_at: r.normalizedAt || now,
          updated_at: now,
        }));

        await fitnessMetricsDao.upsertMetrics(dbEntities);

        await this.networkClient.post(
          '/api/v1/health/sync',
          {
            records: accumulatedRecords,
            syncedAt: now,
            trigger,
            platform: 'healthkit',

            perMetricTimestamps: Object.fromEntries(
              ALL_SYNC_METRICS.map(metric => {
                const metricRecords = accumulatedRecords.filter(
                  r => r.metricType === metric,
                );
                if (metricRecords.length === 0) return [metric, null];
                const latest = metricRecords.reduce((best, r) =>
                  r.endTime > best.endTime ? r : best,
                );
                return [metric, latest.endTime];
              }).filter(([, v]) => v !== null),
            ),
          },
          { success: true, count: accumulatedRecords.length },
          { idempotencyKey: createBatchIdempotencyKey(accumulatedRecords) },
        );

        for (const [metric, cursor] of pendingMetricCursors) {
          this.status.metricStatuses[metric] = {
            lastSyncedAt: cursor.timestamp,
            count: this.status.metricStatuses[metric].count + cursor.count,
            error: null,
          };
          this.saveMetricCursor(metric, cursor.timestamp);
        }
        await syncStateDao.setCheckpoint('healthkit', now);
      }

      const formattedTimestamp = this.formatSyncTimestamp(new Date());
      this.status.lastSyncedAt = formattedTimestamp;
      this.saveGlobalLastSynced(formattedTimestamp);

      this.updateStatus({
        state: 'success',
        isSyncing: false,
        lastSyncedAt: formattedTimestamp,
      });
    } catch (err: any) {
      const isCancelled =
        err?.message === 'Sync was cancelled' ||
        this.abortController?.signal.aborted;

      const state: SyncState = isCancelled ? 'cancelled' : 'error';
      const errorMsg = isCancelled ? null : err?.message || 'Sync failed';

      this.updateStatus({
        state,
        isSyncing: false,
        lastError: errorMsg,
      });

      if (!isCancelled) {
        console.error('HealthSyncManager sync error:', err);
      }
    } finally {
      this.isSyncing = false;
      this.status.isSyncing = false;
      this.abortController = null;
      this.notifyListeners();
    }

    return this.getSyncStatus();
  }

  public async syncMetric(
    metricType: MetricType,
    options: SyncOptions = {},
  ): Promise<MetricSyncResult> {
    const isConnected = isHealthKitConnectedInStorage();
    if (!isConnected) {
      return {
        metricType,
        recordsCount: 0,
        success: false,
        error: 'HealthKit is not connected.',
        lastSyncedAt: this.status.metricStatuses[metricType].lastSyncedAt || '',
      };
    }

    const cursor = options.forceFullSync
      ? undefined
      : this.status.metricStatuses[metricType].lastSyncedAt || undefined;

    try {
      const rawSamples = await MockHealthKit.getSamples({
        metricType,
        startDate: options.startDate || cursor,
        endDate: options.endDate,
        ascending: true,
      });

      const normalized = normalizeHealthSamples(rawSamples);

      if (normalized.length > 0) {
        const user = getUserDetailsFromStorage();
        const userId = user?.user?.name
          ? `user_${user.user.name.toLowerCase().replace(/\s+/g, '_')}`
          : 'local_user';
        const now = new Date().toISOString();

        const dbEntities: FitnessMetricEntity[] = normalized.map(r => ({
          id: r.id,
          user_id: userId,
          metric_type: r.metricType,
          value: r.value,
          unit: r.unit,
          start_time: r.startTime,
          end_time: r.endTime,
          source: (r.source as any) || 'healthkit',
          source_record_id: (r.metadata?.sourceRecordId as string) || r.id,
          created_at: r.normalizedAt || now,
          updated_at: now,
        }));

        await fitnessMetricsDao.upsertMetrics(dbEntities);

        await this.networkClient.post(
          `/api/v1/health/sync/${metricType}`,
          {
            metricType,
            records: normalized,
            syncedAt: now,
          },
          { success: true, count: normalized.length },
          { idempotencyKey: createBatchIdempotencyKey(normalized) },
        );

        const latestTime = normalized[normalized.length - 1].endTime;
        this.status.metricStatuses[metricType] = {
          lastSyncedAt: latestTime,
          count:
            this.status.metricStatuses[metricType].count + normalized.length,
          error: null,
        };
        this.saveMetricCursor(metricType, latestTime);
        await syncStateDao.setCheckpoint('healthkit', now);
      }

      const formattedTimestamp = this.formatSyncTimestamp(new Date());
      this.status.lastSyncedAt = formattedTimestamp;
      this.saveGlobalLastSynced(formattedTimestamp);

      this.notifyListeners();

      return {
        metricType,
        recordsCount: normalized.length,
        success: true,
        lastSyncedAt: formattedTimestamp,
      };
    } catch (err: any) {
      const errorMsg = err?.message || `Failed to sync ${metricType}`;
      this.status.metricStatuses[metricType].error = errorMsg;
      this.notifyListeners();

      return {
        metricType,
        recordsCount: 0,
        success: false,
        error: errorMsg,
        lastSyncedAt: this.status.metricStatuses[metricType].lastSyncedAt || '',
      };
    }
  }

  public getSyncStatus(): HealthSyncStatus {
    return {
      ...this.status,
      metricStatuses: { ...this.status.metricStatuses },
    };
  }

  public cancelSync(): void {
    if (this.isSyncing && this.abortController) {
      this.abortController.abort();
    }
  }

  public subscribeToSyncStatus(
    listener: SyncStatusListener,
  ): UnsubscribeSyncStatus {
    this.statusListeners.add(listener);
    listener(this.getSyncStatus());

    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private updateStatus(partial: Partial<HealthSyncStatus>): void {
    this.status = {
      ...this.status,
      ...partial,
      isSyncing: partial.isSyncing ?? this.isSyncing,
    };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const snapshot = this.getSyncStatus();
    this.statusListeners.forEach(listener => {
      try {
        listener(snapshot);
      } catch (e) {
        console.error('Error in HealthSyncManager status listener:', e);
      }
    });
  }

  private saveMetricCursor(metric: MetricType, timestamp: string): void {
    try {
      storage.set(`${HEALTH_SYNC_STORAGE_PREFIX}${metric}`, timestamp);
    } catch (e) {
      console.error(`Failed to save cursor for ${metric}:`, e);
    }
  }

  private saveGlobalLastSynced(timestamp: string): void {
    try {
      storage.set(METRICS_STORAGE_KEYS.LAST_SYNCED_AT, timestamp);
    } catch (e) {
      console.error('Failed to save global lastSyncedAt to MMKV:', e);
    }
  }

  private formatSyncTimestamp(date: Date): string {
    return `${date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}, ${date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`;
  }

  public destroy(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    if (this.healthKitSubscription) {
      this.healthKitSubscription();
      this.healthKitSubscription = null;
    }
    this.statusListeners.clear();
    this.isInitialized = false;
  }
}

export const healthSyncManager = new HealthSyncManager();
export default healthSyncManager;
