import databaseManager from '../src/database/databaseManager';
import fitnessMetricsDao from '../src/database/repositories/fitnessMetricsDao';
import syncQueueDao from '../src/database/repositories/syncQueueDao';
import syncStateDao from '../src/database/repositories/syncStateDao';
import { FitnessMetricEntity } from '../src/database/types';

describe('SQLite Database Layer & DAOs', () => {
  beforeEach(async () => {
    await databaseManager.resetDatabase();
  });

  describe('Schema Migrations', () => {
    it('applies schema migrations and records version in schema_migrations', async () => {
      const rows = await databaseManager.execute<{
        version: number;
        name: string;
      }>('SELECT version, name FROM schema_migrations;');

      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].version).toBe(1);
      expect(rows[0].name).toBe('001_initial_schema');
    });

    it('creates all tables with correct structures and indexes', async () => {
      const tables = await databaseManager.execute<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
      );
      const tableNames = tables.map(t => t.name);

      expect(tableNames).toContain('schema_migrations');
      expect(tableNames).toContain('fitness_metrics');
      expect(tableNames).toContain('sync_queue');
      expect(tableNames).toContain('sync_state');
    });
  });

  describe('FitnessMetricsDao Operations', () => {
    it('inserts and retrieves a single metric record by ID', async () => {
      const metric: FitnessMetricEntity = {
        id: 'metric_1',
        user_id: 'user_123',
        metric_type: 'steps',
        value: 5000,
        unit: 'steps',
        start_time: '2026-10-02T08:00:00.000Z',
        end_time: '2026-10-02T09:00:00.000Z',
        source: 'healthkit',
        source_record_id: 'hk_sample_1',
        created_at: '2026-10-02T09:00:00.000Z',
        updated_at: '2026-10-02T09:00:00.000Z',
      };

      await fitnessMetricsDao.insertMetric(metric);
      const retrieved = await fitnessMetricsDao.getMetricById('metric_1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('metric_1');
      expect(retrieved?.value).toBe(5000);
      expect(retrieved?.source_record_id).toBe('hk_sample_1');
    });

    it('bulk inserts multiple metrics in a transaction', async () => {
      const metrics: FitnessMetricEntity[] = [
        {
          id: 'metric_1',
          user_id: 'user_123',
          metric_type: 'calories',
          value: 300,
          unit: 'kcal',
          start_time: '2026-10-02T08:00:00.000Z',
          end_time: '2026-10-02T08:30:00.000Z',
          source: 'healthkit',
          source_record_id: 'hk_cal_1',
          created_at: '2026-10-02T08:30:00.000Z',
          updated_at: '2026-10-02T08:30:00.000Z',
        },
        {
          id: 'metric_2',
          user_id: 'user_123',
          metric_type: 'calories',
          value: 450,
          unit: 'kcal',
          start_time: '2026-10-02T12:00:00.000Z',
          end_time: '2026-10-02T12:45:00.000Z',
          source: 'healthkit',
          source_record_id: 'hk_cal_2',
          created_at: '2026-10-02T12:45:00.000Z',
          updated_at: '2026-10-02T12:45:00.000Z',
        },
      ];

      await fitnessMetricsDao.insertMetrics(metrics);
      const list = await fitnessMetricsDao.getMetricsByType('calories');

      expect(list.length).toBe(2);
    });

    it('deduplicates and updates records correctly on upsert', async () => {
      const initial: FitnessMetricEntity = {
        id: 'metric_steps_1',
        user_id: 'user_123',
        metric_type: 'steps',
        value: 2000,
        unit: 'steps',
        start_time: '2026-10-02T08:00:00.000Z',
        end_time: '2026-10-02T09:00:00.000Z',
        source: 'healthkit',
        source_record_id: 'hk_steps_raw_101',
        created_at: '2026-10-02T09:00:00.000Z',
        updated_at: '2026-10-02T09:00:00.000Z',
      };

      await fitnessMetricsDao.upsertMetric(initial);

      const updated: FitnessMetricEntity = {
        id: 'different_id_same_source',
        user_id: 'user_123',
        metric_type: 'steps',
        value: 3500,
        unit: 'steps',
        start_time: '2026-10-02T08:00:00.000Z',
        end_time: '2026-10-02T09:00:00.000Z',
        source: 'healthkit',
        source_record_id: 'hk_steps_raw_101',
        created_at: '2026-10-02T09:00:00.000Z',
        updated_at: '2026-10-02T09:30:00.000Z',
      };

      await fitnessMetricsDao.upsertMetric(updated);

      const records = await fitnessMetricsDao.getMetricsByType('steps');
      expect(records.length).toBe(1);
      expect(records[0].value).toBe(3500);
    });

    it('queries metrics by date range and type', async () => {
      const samples: FitnessMetricEntity[] = [
        {
          id: 's1',
          user_id: 'user_1',
          metric_type: 'water',
          value: 0.5,
          unit: 'L',
          start_time: '2026-10-01T10:00:00.000Z',
          end_time: '2026-10-01T10:00:00.000Z',
          source: 'app',
          source_record_id: null,
          created_at: '2026-10-01T10:00:00.000Z',
          updated_at: '2026-10-01T10:00:00.000Z',
        },
        {
          id: 's2',
          user_id: 'user_1',
          metric_type: 'water',
          value: 1.0,
          unit: 'L',
          start_time: '2026-10-02T14:00:00.000Z',
          end_time: '2026-10-02T14:00:00.000Z',
          source: 'app',
          source_record_id: null,
          created_at: '2026-10-02T14:00:00.000Z',
          updated_at: '2026-10-02T14:00:00.000Z',
        },
        {
          id: 's3',
          user_id: 'user_1',
          metric_type: 'water',
          value: 0.75,
          unit: 'L',
          start_time: '2026-10-03T18:00:00.000Z',
          end_time: '2026-10-03T18:00:00.000Z',
          source: 'app',
          source_record_id: null,
          created_at: '2026-10-03T18:00:00.000Z',
          updated_at: '2026-10-03T18:00:00.000Z',
        },
      ];

      await fitnessMetricsDao.insertMetrics(samples);

      const range = await fitnessMetricsDao.getMetricsByTypeAndDateRange(
        'water',
        '2026-10-01T00:00:00.000Z',
        '2026-10-02T23:59:59.999Z',
      );

      expect(range.length).toBe(2);
    });

    it('fetches latest metric per metric type', async () => {
      await fitnessMetricsDao.insertMetrics([
        {
          id: 'w1',
          user_id: 'u1',
          metric_type: 'weight',
          value: 74.5,
          unit: 'kg',
          start_time: '2026-10-01T07:00:00.000Z',
          end_time: '2026-10-01T07:00:00.000Z',
          source: 'app',
          source_record_id: null,
          created_at: '2026-10-01T07:00:00.000Z',
          updated_at: '2026-10-01T07:00:00.000Z',
        },
        {
          id: 'w2',
          user_id: 'u1',
          metric_type: 'weight',
          value: 73.8,
          unit: 'kg',
          start_time: '2026-10-02T07:00:00.000Z',
          end_time: '2026-10-02T07:00:00.000Z',
          source: 'app',
          source_record_id: null,
          created_at: '2026-10-02T07:00:00.000Z',
          updated_at: '2026-10-02T07:00:00.000Z',
        },
      ]);

      const latest = await fitnessMetricsDao.getLatestMetric('weight');
      expect(latest?.value).toBe(73.8);
      expect(latest?.id).toBe('w2');
    });

    it('deletes metric by id and clears metrics', async () => {
      const metric: FitnessMetricEntity = {
        id: 'del_1',
        user_id: 'u1',
        metric_type: 'steps',
        value: 1000,
        unit: 'steps',
        start_time: '2026-10-02T10:00:00.000Z',
        end_time: '2026-10-02T11:00:00.000Z',
        source: 'healthkit',
        source_record_id: null,
        created_at: '2026-10-02T11:00:00.000Z',
        updated_at: '2026-10-02T11:00:00.000Z',
      };
      await fitnessMetricsDao.insertMetric(metric);

      const deleted = await fitnessMetricsDao.deleteMetric('del_1');
      expect(deleted).toBe(true);

      const check = await fitnessMetricsDao.getMetricById('del_1');
      expect(check).toBeNull();
    });
  });

  describe('Daily Aggregations', () => {
    it('sums steps, calories, water, and activity per day', async () => {
      await fitnessMetricsDao.insertMetrics([
        {
          id: 'step_1',
          user_id: 'u1',
          metric_type: 'steps',
          value: 3000,
          unit: 'steps',
          start_time: '2026-10-02T08:00:00.000Z',
          end_time: '2026-10-02T09:00:00.000Z',
          source: 'healthkit',
          source_record_id: null,
          created_at: '2026-10-02T09:00:00.000Z',
          updated_at: '2026-10-02T09:00:00.000Z',
        },
        {
          id: 'step_2',
          user_id: 'u1',
          metric_type: 'steps',
          value: 4500,
          unit: 'steps',
          start_time: '2026-10-02T14:00:00.000Z',
          end_time: '2026-10-02T15:00:00.000Z',
          source: 'healthkit',
          source_record_id: null,
          created_at: '2026-10-02T15:00:00.000Z',
          updated_at: '2026-10-02T15:00:00.000Z',
        },
      ]);

      const agg = await fitnessMetricsDao.getDailyAggregates(
        'steps',
        '2026-10-02T00:00:00.000Z',
        '2026-10-02T23:59:59.999Z',
      );

      expect(agg.length).toBe(1);
      expect(agg[0].date).toBe('2026-10-02');
      expect(agg[0].value).toBe(7500);
      expect(agg[0].count).toBe(2);
    });

    it('averages heart rate and records min/max for the day', async () => {
      await fitnessMetricsDao.insertMetrics([
        {
          id: 'hr_1',
          user_id: 'u1',
          metric_type: 'heart_rate',
          value: 60,
          unit: 'bpm',
          start_time: '2026-10-02T07:00:00.000Z',
          end_time: '2026-10-02T07:00:00.000Z',
          source: 'healthkit',
          source_record_id: null,
          created_at: '2026-10-02T07:00:00.000Z',
          updated_at: '2026-10-02T07:00:00.000Z',
        },
        {
          id: 'hr_2',
          user_id: 'u1',
          metric_type: 'heart_rate',
          value: 80,
          unit: 'bpm',
          start_time: '2026-10-02T12:00:00.000Z',
          end_time: '2026-10-02T12:00:00.000Z',
          source: 'healthkit',
          source_record_id: null,
          created_at: '2026-10-02T12:00:00.000Z',
          updated_at: '2026-10-02T12:00:00.000Z',
        },
        {
          id: 'hr_3',
          user_id: 'u1',
          metric_type: 'heart_rate',
          value: 100,
          unit: 'bpm',
          start_time: '2026-10-02T18:00:00.000Z',
          end_time: '2026-10-02T18:00:00.000Z',
          source: 'healthkit',
          source_record_id: null,
          created_at: '2026-10-02T18:00:00.000Z',
          updated_at: '2026-10-02T18:00:00.000Z',
        },
      ]);

      const agg = await fitnessMetricsDao.getDailyAggregates(
        'heart_rate',
        '2026-10-02T00:00:00.000Z',
        '2026-10-02T23:59:59.999Z',
      );

      expect(agg.length).toBe(1);
      expect(agg[0].value).toBe(80);                      
      expect(agg[0].min_value).toBe(60);
      expect(agg[0].max_value).toBe(100);
    });

    it('takes the latest weight measurement for each day', async () => {
      await fitnessMetricsDao.insertMetrics([
        {
          id: 'w_morning',
          user_id: 'u1',
          metric_type: 'weight',
          value: 75.0,
          unit: 'kg',
          start_time: '2026-10-02T07:00:00.000Z',
          end_time: '2026-10-02T07:00:00.000Z',
          source: 'app',
          source_record_id: null,
          created_at: '2026-10-02T07:00:00.000Z',
          updated_at: '2026-10-02T07:00:00.000Z',
        },
        {
          id: 'w_evening',
          user_id: 'u1',
          metric_type: 'weight',
          value: 74.2,
          unit: 'kg',
          start_time: '2026-10-02T20:00:00.000Z',
          end_time: '2026-10-02T20:00:00.000Z',
          source: 'app',
          source_record_id: null,
          created_at: '2026-10-02T20:00:00.000Z',
          updated_at: '2026-10-02T20:00:00.000Z',
        },
      ]);

      const agg = await fitnessMetricsDao.getDailyAggregates(
        'weight',
        '2026-10-02T00:00:00.000Z',
        '2026-10-02T23:59:59.999Z',
      );

      expect(agg.length).toBe(1);
      expect(agg[0].value).toBe(74.2);
    });

    it('calculates sleep duration without double counting overlapping intervals', async () => {

      await fitnessMetricsDao.insertMetrics([
        {
          id: 'sleep_1',
          user_id: 'u1',
          metric_type: 'sleep',
          value: 4,
          unit: 'hrs',
          start_time: '2026-10-02T00:00:00.000Z',
          end_time: '2026-10-02T04:00:00.000Z',
          source: 'healthkit',
          source_record_id: null,
          created_at: '2026-10-02T04:00:00.000Z',
          updated_at: '2026-10-02T04:00:00.000Z',
        },
        {
          id: 'sleep_2',
          user_id: 'u1',
          metric_type: 'sleep',
          value: 4,
          unit: 'hrs',
          start_time: '2026-10-02T03:00:00.000Z',
          end_time: '2026-10-02T07:00:00.000Z',
          source: 'healthkit',
          source_record_id: null,
          created_at: '2026-10-02T07:00:00.000Z',
          updated_at: '2026-10-02T07:00:00.000Z',
        },
      ]);

      const agg = await fitnessMetricsDao.getDailyAggregates(
        'sleep',
        '2026-10-02T00:00:00.000Z',
        '2026-10-02T23:59:59.999Z',
      );

      expect(agg.length).toBe(1);
      expect(agg[0].value).toBe(7.0);                           
    });
  });

  describe('SyncQueueDao Operations', () => {
    it('enqueues pending operations and retrieves them in order', async () => {
      await syncQueueDao.enqueue({
        entity_type: 'weight',
        entity_id: 'w_100',
        operation: 'create',
        payload: { value: 72.5, unit: 'kg' },
      });

      const pending = await syncQueueDao.getPendingItems();
      expect(pending.length).toBe(1);
      expect(pending[0].entity_id).toBe('w_100');
      expect(pending[0].status).toBe('pending');
    });

    it('updates pending entry when enqueuing same entity again', async () => {
      await syncQueueDao.enqueue({
        entity_type: 'weight',
        entity_id: 'w_200',
        operation: 'create',
        payload: { value: 70.0 },
      });

      await syncQueueDao.enqueue({
        entity_type: 'weight',
        entity_id: 'w_200',
        operation: 'update',
        payload: { value: 69.5 },
      });

      const pending = await syncQueueDao.getPendingItems();
      expect(pending.length).toBe(1);
      expect(pending[0].operation).toBe('update');
      expect(JSON.parse(pending[0].payload).value).toBe(69.5);
    });

    it('resets stuck syncing items on startup crash recovery', async () => {
      const item = await syncQueueDao.enqueue({
        entity_type: 'weight',
        entity_id: 'w_300',
        operation: 'create',
        payload: { value: 80.0 },
      });

      await syncQueueDao.markAsSyncing([item.id]);

      const pendingBefore = await syncQueueDao.getPendingItems();
      expect(pendingBefore.length).toBe(0);

      const recoveredCount = await syncQueueDao.resetStuckSyncingItems();
      expect(recoveredCount).toBe(1);

      const pendingAfter = await syncQueueDao.getPendingItems();
      expect(pendingAfter.length).toBe(1);
      expect(pendingAfter[0].status).toBe('pending');
    });
  });

  describe('SyncStateDao Operations', () => {
    it('saves and retrieves checkpoints per provider', async () => {
      const timestamp = '2026-10-02T15:00:00.000Z';
      await syncStateDao.setCheckpoint('healthkit', timestamp);

      const state = await syncStateDao.getCheckpoint('healthkit');
      expect(state).toBeDefined();
      expect(state?.last_synced_at).toBe(timestamp);
    });
  });
});
