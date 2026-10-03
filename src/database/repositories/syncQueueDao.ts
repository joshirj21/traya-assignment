import databaseManager, { DatabaseManager } from '../databaseManager';
import { SyncQueueEntity, SyncQueueOperation, SyncQueueStatus } from '../types';

export class SyncQueueDao {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager = databaseManager) {
    this.dbManager = dbManager;
  }

  public async enqueue(
    item: {
      entity_type: string;
      entity_id: string;
      operation: SyncQueueOperation;
      payload: any;
    },
    customId?: string,
  ): Promise<SyncQueueEntity> {
    const now = new Date().toISOString();
    const payloadStr =
      typeof item.payload === 'string'
        ? item.payload
        : JSON.stringify(item.payload);
    const id =
      customId ||
      `sync_q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const existing = await this.dbManager.execute<SyncQueueEntity>(
      `SELECT * FROM sync_queue WHERE entity_type = ? AND entity_id = ? AND operation = ? AND status = 'pending' ORDER BY created_at ASC LIMIT 1;`,
      [item.entity_type, item.entity_id, item.operation],
    );

    if (existing.length > 0) {
      const existingId = existing[0].id;
      await this.dbManager.executeRaw(
        `UPDATE sync_queue SET payload = ?, updated_at = ?, retry_count = 0, last_error = NULL WHERE id = ?;`,
        [payloadStr, now, existingId],
      );
      return {
        ...existing[0],
        operation: item.operation,
        payload: payloadStr,
        retry_count: 0,
        last_error: null,
        updated_at: now,
      };
    }

    const entity: SyncQueueEntity = {
      id,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      operation: item.operation,
      payload: payloadStr,
      status: 'pending',
      retry_count: 0,
      last_error: null,
      created_at: now,
      updated_at: now,
    };

    await this.dbManager.executeRaw(
      `INSERT INTO sync_queue (
        id, entity_type, entity_id, operation, payload, status, retry_count, last_error, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        entity.id,
        entity.entity_type,
        entity.entity_id,
        entity.operation,
        entity.payload,
        entity.status,
        entity.retry_count,
        entity.last_error,
        entity.created_at,
        entity.updated_at,
      ],
    );

    return entity;
  }

  public async getPendingItems(limit: number = 50): Promise<SyncQueueEntity[]> {
    return this.dbManager.execute<SyncQueueEntity>(
      `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC, rowid ASC LIMIT ?;`,
      [limit],
    );
  }

  public async markAsSyncing(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    const placeholders = ids.map(() => '?').join(',');
    await this.dbManager.executeRaw(
      `UPDATE sync_queue SET status = 'syncing', updated_at = ? WHERE id IN (${placeholders});`,
      [now, ...ids],
    );
  }

  public async markAsFailed(
    id: string,
    error: string,
    retryCount: number,
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.dbManager.executeRaw(
      `UPDATE sync_queue SET status = 'failed', last_error = ?, retry_count = ?, updated_at = ? WHERE id = ?;`,
      [error, retryCount, now, id],
    );
  }

  public async retryFailedItems(maxRetries: number = 5): Promise<void> {
    const now = new Date().toISOString();
    await this.dbManager.executeRaw(
      `UPDATE sync_queue SET status = 'pending', updated_at = ?, last_error = NULL WHERE status = 'failed' AND retry_count < ?;`,
      [now, maxRetries],
    );
  }

  public async markAsCompleted(id: string): Promise<void> {
    await this.dbManager.executeRaw('DELETE FROM sync_queue WHERE id = ?;', [
      id,
    ]);
  }

  public async resetStuckSyncingItems(): Promise<number> {
    const now = new Date().toISOString();
    const res = await this.dbManager.executeRaw(
      `UPDATE sync_queue SET status = 'pending', updated_at = ? WHERE status = 'syncing';`,
      [now],
    );
    return res?.rowsAffected ?? 0;
  }

  public async getPendingCount(): Promise<number> {
    const rows = await this.dbManager.execute<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending' OR status = 'syncing';`,
    );
    return rows[0]?.count ?? 0;
  }

  public async getFailedCount(): Promise<number> {
    const rows = await this.dbManager.execute<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'failed';`,
    );
    return rows[0]?.count ?? 0;
  }

  public async retryAllFailedItems(): Promise<void> {
    await this.dbManager.executeRaw(
      `UPDATE sync_queue SET status = 'pending', retry_count = 0, last_error = NULL, updated_at = ? WHERE status = 'failed';`,
      [new Date().toISOString()],
    );
  }

  public async clearAll(): Promise<void> {
    await this.dbManager.executeRaw('DELETE FROM sync_queue;');
  }
}

export const syncQueueDao = new SyncQueueDao();
export default syncQueueDao;
