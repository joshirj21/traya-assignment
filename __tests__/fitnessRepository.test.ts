import databaseManager from '../src/database/databaseManager';
import fitnessMetricsDao from '../src/database/repositories/fitnessMetricsDao';
import syncQueueDao from '../src/database/repositories/syncQueueDao';
import fitnessRepository from '../src/repositories/fitnessRepository';
import { saveUserDetailsToStorage, storage } from '../src/lib/storage';

describe('FitnessRepository (Offline-First Single Source of Truth)', () => {
  beforeEach(async () => {
    storage.clearAll();
    await databaseManager.resetDatabase();

    saveUserDetailsToStorage({
      user: {
        name: 'Rahul Joshi',
        age: 28,
        height: 175,
        weight: 75.0,
      },
    });
  });

  it('reads cached metrics from SQLite and constructs dashboard metrics', async () => {

    const now = new Date().toISOString();
    await fitnessMetricsDao.insertMetrics([
      {
        id: 'step_sample',
        user_id: 'user_rahul',
        metric_type: 'steps',
        value: 9500,
        unit: 'steps',
        start_time: now,
        end_time: now,
        source: 'healthkit',
        source_record_id: 'hk_step_1',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'weight_sample',
        user_id: 'user_rahul',
        metric_type: 'weight',
        value: 72.0,
        unit: 'kg',
        start_time: now,
        end_time: now,
        source: 'app',
        source_record_id: null,
        created_at: now,
        updated_at: now,
      },
    ]);

    const dashboard = await fitnessRepository.getDashboardData('7_days');

    expect(dashboard).toBeDefined();
    expect(dashboard.period).toBe('7_days');
    expect(dashboard.weightGoal.currentWeight).toBe(72.0);
    expect(dashboard.coreMetrics.length).toBeGreaterThan(0);

    const stepsCard = dashboard.coreMetrics.find(m => m.iconName === 'steps');
    expect(stepsCard?.value).toBe('9,500');
  });

  it('adds weight offline transactionally and enqueues to sync_queue', async () => {
    const entry = await fitnessRepository.addWeight(71.5, 'kg');

    expect(entry).toBeDefined();
    expect(entry.value).toBe(71.5);
    expect(entry.unit).toBe('kg');
    expect(entry.source).toBe('app');

    const stored = await fitnessMetricsDao.getMetricById(entry.id);
    expect(stored).toBeDefined();
    expect(stored?.value).toBe(71.5);

    const pending = await syncQueueDao.getPendingItems();
    expect(pending.length).toBe(1);
    expect(pending[0].entity_id).toBe(entry.id);
    expect(pending[0].operation).toBe('create');
    expect(pending[0].status).toBe('pending');
  });

  it('validates weight input before saving', async () => {
    await expect(fitnessRepository.addWeight(-5)).rejects.toThrow();
    await expect(fitnessRepository.addWeight(600)).rejects.toThrow();
    await expect(fitnessRepository.addWeight(NaN)).rejects.toThrow();
  });

  it('updates an existing weight entry and records update in sync_queue', async () => {
    const entry = await fitnessRepository.addWeight(72.0, 'kg');
    const updated = await fitnessRepository.updateWeight(entry.id, 71.8);

    expect(updated.value).toBe(71.8);

    const stored = await fitnessMetricsDao.getMetricById(entry.id);
    expect(stored?.value).toBe(71.8);

    const queueItems = await syncQueueDao.getPendingItems();
    const updateOp = queueItems.find(q => q.operation === 'update');
    expect(updateOp).toBeDefined();
  });

  it('deletes a weight entry and records delete in sync_queue', async () => {
    const entry = await fitnessRepository.addWeight(73.0, 'kg');
    const success = await fitnessRepository.deleteWeight(entry.id);

    expect(success).toBe(true);

    const stored = await fitnessMetricsDao.getMetricById(entry.id);
    expect(stored).toBeNull();

    const queueItems = await syncQueueDao.getPendingItems();
    const deleteOp = queueItems.find(q => q.operation === 'delete');
    expect(deleteOp).toBeDefined();
  });

  it('allows UI components to subscribe to change notifications', async () => {
    let notifyCount = 0;
    const unsubscribe = fitnessRepository.subscribeToChanges(() => {
      notifyCount++;
    });

    await fitnessRepository.addWeight(70.5, 'kg');
    expect(notifyCount).toBe(1);

    await fitnessRepository.addWeight(70.2, 'kg');
    expect(notifyCount).toBe(2);

    unsubscribe();
    await fitnessRepository.addWeight(70.0, 'kg');
    expect(notifyCount).toBe(2);
  });
});
