import databaseManager from '../src/database/databaseManager';
import syncQueueDao from '../src/database/repositories/syncQueueDao';
import mockNetworkClient from '../src/lib/mockNetworkClient';
import syncQueueProcessor from '../src/sync/syncQueueProcessor';

describe('SyncQueueProcessor (Background Sync Worker)', () => {
  beforeEach(async () => {
    await databaseManager.resetDatabase();
    mockNetworkClient.setSimulationConfig({ latency: 0 });
  });

  it('processes pending queue items and marks them completed upon success', async () => {
    await syncQueueDao.enqueue({
      entity_type: 'weight',
      entity_id: 'w_test_1',
      operation: 'create',
      payload: { value: 72.0, unit: 'kg' },
    });

    const result = await syncQueueProcessor.processPendingQueue();

    expect(result.processedCount).toBe(1);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);

    const pendingAfter = await syncQueueDao.getPendingItems();
    expect(pendingAfter.length).toBe(0);
  });

  it('handles network failures with retry count increments and marks as failed', async () => {

    jest
      .spyOn(mockNetworkClient, 'post')
      .mockRejectedValueOnce(new Error('Network connection timeout'));

    const item = await syncQueueDao.enqueue({
      entity_type: 'weight',
      entity_id: 'w_test_fail',
      operation: 'create',
      payload: { value: 75.0, unit: 'kg' },
    });

    const result = await syncQueueProcessor.processPendingQueue();

    expect(result.processedCount).toBe(1);
    expect(result.failureCount).toBe(1);

    const rows = await databaseManager.execute<any>(
      'SELECT * FROM sync_queue WHERE id = ?;',
      [item.id],
    );

    expect(rows[0].status).toBe('failed');
    expect(rows[0].retry_count).toBe(1);
    expect(rows[0].last_error).toContain('Network connection timeout');
  });

  it('resets stuck syncing items on startup initialization', async () => {
    const item = await syncQueueDao.enqueue({
      entity_type: 'weight',
      entity_id: 'w_stuck',
      operation: 'create',
      payload: { value: 68.0 },
    });

    await syncQueueDao.markAsSyncing([item.id]);

    const stuckBefore = await databaseManager.execute<any>(
      "SELECT * FROM sync_queue WHERE status = 'syncing';",
    );
    expect(stuckBefore.length).toBe(1);

    const recovered = await syncQueueDao.resetStuckSyncingItems();
    expect(recovered).toBe(1);

    const pendingAfter = await syncQueueDao.getPendingItems();
    expect(pendingAfter.length).toBe(1);
    expect(pendingAfter[0].status).toBe('pending');
  });
});
