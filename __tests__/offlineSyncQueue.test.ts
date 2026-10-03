import { fitnessRepository } from '../src/repositories/fitnessRepository';
import { syncQueueProcessor } from '../src/sync/syncQueueProcessor';
import { syncQueueDao } from '../src/database/repositories/syncQueueDao';
import { fitnessMetricsDao } from '../src/database/repositories/fitnessMetricsDao';
import { databaseManager } from '../src/database/databaseManager';
import { mockNetworkClient } from '../src/lib/mockNetworkClient';
import { storage } from '../src/lib/storage';

describe('Offline Weight Sync Queue & Network Recovery', () => {
  beforeEach(async () => {
    storage.clearAll();
    mockNetworkClient.resetSimulationConfig();
    mockNetworkClient.setSimulationConfig({
      latency: 0,
      autoRetry: {
        enabled: false,
        maxRetries: 0,
        initialBackoffMs: 0,
        backoffMultiplier: 1,
      },
    });
    await databaseManager.initialize();
    await syncQueueDao.clearAll();
  });

  it('records weight locally and tracks failed sync queue item when offline, then syncs successfully on network recovery', async () => {

    mockNetworkClient.setSimulationConfig({
      forcedError: 'NETWORK_FAILURE',
      latency: 0,
      autoRetry: {
        enabled: false,
        maxRetries: 0,
        initialBackoffMs: 0,
        backoffMultiplier: 1,
      },
    });

    const weightTimestamp = new Date('2026-10-01T12:00:00Z').toISOString();

    const addedMetric = await fitnessRepository.addWeight(
      76.5,
      'kg',
      weightTimestamp,
    );
    expect(addedMetric).toBeDefined();
    expect(addedMetric.value).toBe(76.5);

    const localEntity = await fitnessMetricsDao.getMetricById(addedMetric.id);
    expect(localEntity).toBeDefined();
    expect(localEntity?.value).toBe(76.5);

    await new Promise<void>(resolve => setTimeout(resolve, 50));

    const pendingCount = await syncQueueDao.getPendingCount();

    const queueRows = await databaseManager.execute<any>(
      'SELECT * FROM sync_queue WHERE entity_id = ?;',
      [addedMetric.id],
    );
    expect(queueRows.length).toBe(1);
    expect(queueRows[0].status).toBe('failed');
    expect(queueRows[0].entity_type).toBe('weight');
    expect(queueRows[0].operation).toBe('create');
    expect(queueRows[0].retry_count).toBeGreaterThanOrEqual(1);
    expect(queueRows[0].last_error).toContain('lost internet connection');

    const updatedMetric = await fitnessRepository.updateWeight(
      addedMetric.id,
      75.0,
      weightTimestamp,
    );
    expect(updatedMetric.value).toBe(75.0);

    const updatedLocal = await fitnessMetricsDao.getMetricById(addedMetric.id);
    expect(updatedLocal?.value).toBe(75.0);

    await new Promise<void>(resolve => setTimeout(resolve, 50));

    const queueRowsAfterUpdate = await databaseManager.execute<any>(
      'SELECT * FROM sync_queue WHERE entity_id = ?;',
      [addedMetric.id],
    );
    expect(queueRowsAfterUpdate.length).toBe(2);

    mockNetworkClient.setSimulationConfig({
      forcedError: null,
      latency: 0,
      autoRetry: {
        enabled: false,
        maxRetries: 0,
        initialBackoffMs: 0,
        backoffMultiplier: 1,
      },
    });

    const syncResult = await syncQueueProcessor.processPendingQueue();
    expect(syncResult.processedCount).toBe(2);
    expect(syncResult.successCount).toBe(2);
    expect(syncResult.failureCount).toBe(0);

    const remainingQueueRows = await databaseManager.execute<any>(
      'SELECT * FROM sync_queue WHERE entity_id = ?;',
      [addedMetric.id],
    );
    expect(remainingQueueRows.length).toBe(0);

    const requestLog = mockNetworkClient.getRequestLog();
    const syncRequest = requestLog.find(r =>
      r.endpoint.includes('/api/v1/sync/entities/weight'),
    );
    expect(syncRequest).toBeDefined();
  });
});
