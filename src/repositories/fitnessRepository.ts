

import { DatabaseManager, databaseManager } from '../database/databaseManager';
import {
  FitnessMetricsDao,
  fitnessMetricsDao,
} from '../database/repositories/fitnessMetricsDao';
import {
  SyncQueueDao,
  syncQueueDao,
} from '../database/repositories/syncQueueDao';
import {
  SyncStateDao,
  syncStateDao,
} from '../database/repositories/syncStateDao';
import { FitnessMetricEntity } from '../database/types';
import { getUserDetailsFromStorage } from '../lib/storage';
import { MetricType } from '../mockHealthKit/types';
import { MetricsService, metricsService } from '../services/metricsService';
import {
  SyncQueueProcessor,
  syncQueueProcessor,
} from '../sync/syncQueueProcessor';
import {
  DashboardMetricsData,
  MetricItem,
  TimelinePeriod,
  WeightGoal,
} from '../types/metrics';
import type { Transaction } from 'react-native-nitro-sqlite';
import {
  MetricHistoryOptions,
  RepositoryChangeListener,
  UnsubscribeRepository,
} from './types';

export class FitnessRepository {
  private dbManager: DatabaseManager;
  private metricsDao: FitnessMetricsDao;
  private queueDao: SyncQueueDao;
  private stateDao: SyncStateDao;
  private service: MetricsService;
  private queueProcessor: SyncQueueProcessor;
  private listeners = new Set<RepositoryChangeListener>();
  private isRefreshing: boolean = false;

  private enqueueWeightSync(
    tx: Transaction,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    payload: unknown,
    now: string,
  ): void {
    const pending = tx.execute<{ id: string; operation: string }>(
      `SELECT id, operation FROM sync_queue
       WHERE entity_type = 'weight' AND entity_id = ? AND status = 'pending' AND operation = ?
       ORDER BY created_at ASC LIMIT 1;`,
      [entityId, operation],
    ).rows?._array?.[0];

    if (pending) {
      tx.execute(
        `UPDATE sync_queue SET operation = ?, payload = ?, updated_at = ?, last_error = NULL
         WHERE id = ?;`,
        [operation, JSON.stringify(payload), now, pending.id],
      );
      return;
    }

    const syncId = `sync_q_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    tx.execute(
      `INSERT INTO sync_queue (
        id, entity_type, entity_id, operation, payload, status, retry_count, last_error, created_at, updated_at
      ) VALUES (?, 'weight', ?, ?, ?, 'pending', 0, NULL, ?, ?);`,
      [syncId, entityId, operation, JSON.stringify(payload), now, now],
    );
  }

  constructor(
    dbManager: DatabaseManager = databaseManager,
    metricsDao: FitnessMetricsDao = fitnessMetricsDao,
    queueDao: SyncQueueDao = syncQueueDao,
    stateDao: SyncStateDao = syncStateDao,
    service: MetricsService = metricsService,
    queueProcessor: SyncQueueProcessor = syncQueueProcessor,
  ) {
    this.dbManager = dbManager;
    this.metricsDao = metricsDao;
    this.queueDao = queueDao;
    this.stateDao = stateDao;
    this.service = service;
    this.queueProcessor = queueProcessor;
  }

  public async getDashboardData(
    period: TimelinePeriod = '7_days',
  ): Promise<DashboardMetricsData> {
    await this.dbManager.initialize();

    const days = period === '7_days' ? 7 : period === '30_days' ? 30 : 90;
    const now = new Date();
    const endDate = now.toISOString();
    const startDate = new Date(
      now.getTime() - days * 24 * 60 * 60 * 1000,
    ).toISOString();

    const latestMetrics = await this.metricsDao.getLatestMetrics();
    const hasAnyMetric = Object.values(latestMetrics).some(m => m !== null);

    if (!hasAnyMetric) {

      await this.refreshFromBackendInternal(period, false);
    }

    return this.buildDashboardDataFromSQLite(period, startDate, endDate);
  }

  private async buildDashboardDataFromSQLite(
    period: TimelinePeriod,
    startDate: string,
    endDate: string,
  ): Promise<DashboardMetricsData> {

    const [
      stepsAgg,
      heartRateAgg,
      sleepAgg,
      caloriesAgg,
      waterAgg,
      activityAgg,
      weightAgg,
    ] = await Promise.all([
      this.metricsDao.getDailyAggregates('steps', startDate, endDate),
      this.metricsDao.getDailyAggregates('heart_rate', startDate, endDate),
      this.metricsDao.getDailyAggregates('sleep', startDate, endDate),
      this.metricsDao.getDailyAggregates('calories', startDate, endDate),
      this.metricsDao.getDailyAggregates('water', startDate, endDate),
      this.metricsDao.getDailyAggregates('activity', startDate, endDate),
      this.metricsDao.getDailyAggregates('weight', startDate, endDate),
    ]);

    const isMultiDayAvg = period !== '7_days';

    const stepsVal = this.computePeriodValue(
      stepsAgg.map(a => a.value),
      isMultiDayAvg,
    );
    const stepsItem: MetricItem = {
      id: 'metric_steps',
      title: 'Steps',
      value: stepsAgg.length > 0 ? stepsVal.toLocaleString('en-US') : '—',
      unit: 'steps',
      goal: '10,000 steps',
      subtitle: isMultiDayAvg ? 'Daily average' : 'Goal: 10,000 steps',
      iconName: 'steps',
      statusColor: '#10B981',
    };

    const hrVal =
      heartRateAgg.length > 0
        ? Math.round(
            heartRateAgg.reduce((sum, a) => sum + a.value, 0) /
              heartRateAgg.length,
          )
      : null;
    const hrItem: MetricItem = {
      id: 'metric_heart_rate',
      title: 'Heart Rate',
      value: hrVal === null ? '—' : `${hrVal}`,
      unit: 'bpm',
      subtitle: heartRateAgg.length > 0 ? 'Period average' : 'No data yet',
      iconName: 'activity',
      statusColor: '#EF4444',
    };

    const sleepVal = this.computePeriodValue(
      sleepAgg.map(a => a.value),
      isMultiDayAvg,
      1,
    );
    const sleepItem: MetricItem = {
      id: 'metric_sleep',
      title: 'Sleep',
      value: sleepAgg.length > 0 ? `${sleepVal}` : '—',
      unit: 'hrs',
      goal: '8.0 hrs',
      subtitle: isMultiDayAvg ? 'Daily average' : 'Goal: 8.0 hrs',
      iconName: 'sleep',
      statusColor: '#8B5CF6',
    };

    const calVal = this.computePeriodValue(
      caloriesAgg.map(a => a.value),
      isMultiDayAvg,
    );
    const calItem: MetricItem = {
      id: 'metric_calories',
      title: 'Calories',
      value: caloriesAgg.length > 0 ? calVal.toLocaleString('en-US') : '—',
      unit: 'kcal',
      goal: '2,400 kcal',
      subtitle: isMultiDayAvg ? 'Daily average' : 'Daily total',
      iconName: 'calories',
      statusColor: '#F59E0B',
    };

    const waterVal = this.computePeriodValue(
      waterAgg.map(a => a.value),
      isMultiDayAvg,
      1,
    );
    const waterItem: MetricItem = {
      id: 'metric_water',
      title: 'Water Intake',
      value: waterAgg.length > 0 ? `${waterVal}` : '—',
      unit: 'L',
      goal: '3.0 L',
      subtitle: isMultiDayAvg ? 'Daily average' : 'Goal: 3.0 L',
      iconName: 'water',
      statusColor: '#3B82F6',
    };

    const actVal = this.computePeriodValue(
      activityAgg.map(a => a.value),
      isMultiDayAvg,
    );
    const actItem: MetricItem = {
      id: 'metric_activity',
      title: 'Active Time',
      value: activityAgg.length > 0 ? `${actVal}` : '—',
      unit: 'mins',
      goal: '60 mins',
      subtitle: isMultiDayAvg ? 'Daily average' : 'Goal: 60 mins',
      iconName: 'activity',
      statusColor: '#10B981',
    };

    const customGoal = this.service.getCustomTargetWeightGoal();
    const user = getUserDetailsFromStorage();
    const profileWeight = Number(user?.user?.weight);

    const latestWeightEntity = await this.metricsDao.getLatestMetric('weight');
    const currentWeight = latestWeightEntity
      ? latestWeightEntity.value
      : weightAgg.length > 0
      ? weightAgg[weightAgg.length - 1].value
      : Number.isFinite(profileWeight) && profileWeight > 0
      ? profileWeight
      : 0;
    const targetWeight = customGoal?.targetWeight ?? 70.0;
    const startWeight = customGoal?.startWeight ?? currentWeight;

    let progressPercent = 0;
    if (startWeight !== targetWeight) {
      progressPercent = Math.round(
        ((startWeight - currentWeight) / (startWeight - targetWeight)) * 100,
      );
      progressPercent = Math.min(Math.max(progressPercent, 0), 100);
    }
    const remainingKg = Math.max(
      0,
      Math.round((currentWeight - targetWeight) * 10) / 10,
    );

    const weightGoal: WeightGoal = {
      targetWeight,
      currentWeight,
      startWeight,
      targetSetDate: customGoal?.targetSetDate || '15 Aug 2026',
      progressPercent,
      remainingKg,
    };

    const weightItem: MetricItem = {
      id: 'metric_weight',
      title: 'Weight',
      value: currentWeight > 0 ? `${currentWeight}` : '—',
      unit: 'kg',
      ...(currentWeight > 0
        ? { goal: `Target: ${targetWeight} kg` }
        : {}),
      iconName: 'weight',
      statusColor: '#3B82F6',
    };

    const backendCheckpoint = await this.stateDao.getCheckpoint('backend');
    const hkCheckpoint = await this.stateDao.getCheckpoint('healthkit');
    const lastSynced =
      this.service.getLastSyncedTime() ||
      hkCheckpoint?.last_synced_at ||
      backendCheckpoint?.last_synced_at ||
      'Not synced yet';

    return {
      period,
      weightGoal,
      coreMetrics: [
        weightItem,
        stepsItem,
        sleepItem,
        calItem,
        waterItem,
        actItem,
      ],
      lastSyncedAt: lastSynced,
    };
  }

  private computePeriodValue(
    values: number[],
    isAverage: boolean,
    decimals: number = 0,
  ): number {
    if (values.length === 0) return 0;
    if (!isAverage) {

      const latest = values[values.length - 1];
      return decimals > 0
        ? Number(latest.toFixed(decimals))
        : Math.round(latest);
    }
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    return decimals > 0 ? Number(avg.toFixed(decimals)) : Math.round(avg);
  }

  public async getMetricHistory(
    metricType: MetricType,
    options: MetricHistoryOptions = {},
  ): Promise<FitnessMetricEntity[]> {
    await this.dbManager.initialize();

    if (options.startDate && options.endDate) {
      return this.metricsDao.getMetricsByTypeAndDateRange(
        metricType,
        options.startDate,
        options.endDate,
        options,
      );
    }

    return this.metricsDao.getMetricsByType(
      metricType,
      options.limit ?? 100,
      options.offset ?? 0,
    );
  }

  public async getDailyAggregates(
    metricType: MetricType,
    startDate: string,
    endDate: string,
  ): Promise<import('../database/types').DailyAggregateResult[]> {
    await this.dbManager.initialize();
    return this.metricsDao.getDailyAggregates(metricType, startDate, endDate);
  }

  public async persistHistoryFromBackend(
    metricType: MetricType,
    aggregates: import('../database/types').DailyAggregateResult[],
  ): Promise<void> {
    if (aggregates.length === 0) return;
    await this.dbManager.initialize();

    const now = new Date().toISOString();
    const user = getUserDetailsFromStorage();
    const userId = user?.user?.name
      ? `user_${user.user.name.toLowerCase().replace(/\s+/g, '_')}`
      : 'local_user';

    const entities: FitnessMetricEntity[] = aggregates.map(agg => ({
      id: `backend_${metricType}_${agg.date}`,
      user_id: userId,
      metric_type: metricType,
      value: agg.value,
      unit: agg.unit,
      start_time: `${agg.date}T00:00:00.000Z`,
      end_time: `${agg.date}T23:59:59.999Z`,
      source: 'backend' as const,
      source_record_id: `server_${metricType}_${agg.date}`,
      created_at: now,
      updated_at: now,
    }));

    await this.metricsDao.upsertMetrics(entities);
  }

  public async addWeight(
    value: number,
    unit: 'kg' | 'lbs' = 'kg',
    timestamp?: string,
  ): Promise<FitnessMetricEntity> {

    if (
      typeof value !== 'number' ||
      isNaN(value) ||
      value <= 0 ||
      value > 500
    ) {
      throw new Error(
        `Invalid weight value: ${value}. Must be between 0 and 500.`,
      );
    }

    await this.dbManager.initialize();

    const now = new Date().toISOString();
    const entryTime = timestamp || now;
    const entityId = `metric_weight_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    const user = getUserDetailsFromStorage();
    const userId = user?.user?.name
      ? `user_${user.user.name.toLowerCase().replace(/\s+/g, '_')}`
      : 'local_user';

    const metricRecord: FitnessMetricEntity = {
      id: entityId,
      user_id: userId,
      metric_type: 'weight',
      value,
      unit,
      start_time: entryTime,
      end_time: entryTime,
      source: 'app',
      source_record_id: null,
      created_at: now,
      updated_at: now,
    };

    await this.dbManager.transaction(async tx => {

      tx.execute(
        `INSERT INTO fitness_metrics (
          id, user_id, metric_type, value, unit, start_time, end_time, source, source_record_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          metricRecord.id,
          metricRecord.user_id,
          metricRecord.metric_type,
          metricRecord.value,
          metricRecord.unit,
          metricRecord.start_time,
          metricRecord.end_time,
          metricRecord.source,
          metricRecord.source_record_id,
          metricRecord.created_at,
          metricRecord.updated_at,
        ],
      );

      this.enqueueWeightSync(tx, entityId, 'create', metricRecord, now);
    });

    this.notifyListeners();

    this.queueProcessor.processPendingQueue().catch(err => {
      console.warn('Background sync queue processing error:', err);
    });

    return metricRecord;
  }

  public async updateWeight(
    id: string,
    value: number,
    timestamp?: string,
  ): Promise<FitnessMetricEntity> {
    if (
      typeof value !== 'number' ||
      isNaN(value) ||
      value <= 0 ||
      value > 500
    ) {
      throw new Error(`Invalid weight value: ${value}`);
    }

    await this.dbManager.initialize();
    const existing = await this.metricsDao.getMetricById(id);
    if (!existing) {
      throw new Error(`Weight metric not found with id: ${id}`);
    }

    const now = new Date().toISOString();
    const entryTime = timestamp || existing.start_time;

    const updated: FitnessMetricEntity = {
      ...existing,
      value,
      start_time: entryTime,
      end_time: entryTime,
      updated_at: now,
    };

    await this.dbManager.transaction(async tx => {
      tx.execute(
        `UPDATE fitness_metrics SET value = ?, start_time = ?, end_time = ?, updated_at = ? WHERE id = ?;`,
        [
          updated.value,
          updated.start_time,
          updated.end_time,
          updated.updated_at,
          id,
        ],
      );

      this.enqueueWeightSync(tx, id, 'update', updated, now);
    });

    this.notifyListeners();
    this.queueProcessor.processPendingQueue().catch(console.warn);

    return updated;
  }

  public async deleteWeight(id: string): Promise<boolean> {
    await this.dbManager.initialize();
    const existing = await this.metricsDao.getMetricById(id);
    if (!existing) return false;

    const now = new Date().toISOString();

    await this.dbManager.transaction(async tx => {
      tx.execute('DELETE FROM fitness_metrics WHERE id = ?;', [id]);

      this.enqueueWeightSync(tx, id, 'delete', { id }, now);
    });

    this.notifyListeners();
    this.queueProcessor.processPendingQueue().catch(console.warn);

    return true;
  }

  public async refreshFromBackend(
    period: TimelinePeriod = '7_days',
  ): Promise<void> {
    await this.refreshFromBackendInternal(period, true);
  }

  private async refreshFromBackendInternal(
    period: TimelinePeriod = '7_days',
    notify: boolean = true,
  ): Promise<void> {
    if (this.isRefreshing) return;
    this.isRefreshing = true;

    try {
      const response = await this.service.getDashboardMetrics(period);
      if (response && response.data) {
        const data = response.data;
        const now = new Date().toISOString();

        const periodDays =
          period === '7_days' ? 7 : period === '30_days' ? 30 : 90;
        const periodStart = new Date(
          Date.now() - periodDays * 24 * 60 * 60 * 1000,
        ).toISOString();

        const entities: FitnessMetricEntity[] = [];

        data.coreMetrics.forEach(m => {
          const rawNum = Number(m.value.replace(/,/g, ''));
          if (!Number.isFinite(rawNum)) return;
          let metricType: MetricType = 'steps';
          if (m.iconName === 'steps') metricType = 'steps';
          else if (m.iconName === 'activity' && m.unit === 'bpm')
            metricType = 'heart_rate';
          else if (m.iconName === 'activity') metricType = 'activity';
          else if (m.iconName === 'sleep') metricType = 'sleep';
          else if (m.iconName === 'calories') metricType = 'calories';
          else if (m.iconName === 'water') metricType = 'water';
          else if (m.iconName === 'weight') metricType = 'weight';

          const metricMeasuredAt = m.measuredAt ?? periodStart;

          entities.push({
            id: `backend_${metricType}_${period}`,
            user_id: 'local_user',
            metric_type: metricType,
            value: rawNum,
            unit: m.unit || '',
            start_time: metricMeasuredAt,
            end_time: now,
            source: 'backend',
            source_record_id: `server_${metricType}_${period}`,
            created_at: now,
            updated_at: now,
          });
        });

        if (entities.length > 0) {
          await this.metricsDao.upsertMetrics(entities);
        }

        await this.stateDao.setCheckpoint('backend', now);
        if (notify) {
          this.notifyListeners();
        }
      }
    } catch (err) {
      console.warn('FitnessRepository refreshFromBackend failed:', err);
    } finally {
      this.isRefreshing = false;
    }
  }

  public async getPendingSyncCount(): Promise<number> {
    await this.dbManager.initialize();
    return this.queueDao.getPendingCount();
  }

  public async getSyncQueueSummary(): Promise<{ pending: number; failed: number }> {
    await this.dbManager.initialize();
    const [pending, failed] = await Promise.all([
      this.queueDao.getPendingCount(),
      this.queueDao.getFailedCount(),
    ]);
    return { pending, failed };
  }

  public async retryFailedSyncItems(): Promise<void> {
    await this.dbManager.initialize();
    await this.queueDao.retryAllFailedItems();
  }

  public subscribeToChanges(
    listener: RepositoryChangeListener,
  ): UnsubscribeRepository {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (err) {
        console.error('Error in FitnessRepository change listener:', err);
      }
    });
  }
}

export const fitnessRepository = new FitnessRepository();
export default fitnessRepository;
