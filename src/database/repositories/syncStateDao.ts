import databaseManager, { DatabaseManager } from '../databaseManager';
import { SyncStateEntity } from '../types';

export class SyncStateDao {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager = databaseManager) {
    this.dbManager = dbManager;
  }

  public async getCheckpoint(
    provider: string,
  ): Promise<SyncStateEntity | null> {
    const rows = await this.dbManager.execute<SyncStateEntity>(
      'SELECT * FROM sync_state WHERE provider = ? LIMIT 1;',
      [provider],
    );
    return rows[0] || null;
  }

  public async setCheckpoint(
    provider: string,
    lastSyncedAt: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const id = `sync_state_${provider}`;

    await this.dbManager.executeRaw(
      `INSERT INTO sync_state (id, provider, last_synced_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(provider) DO UPDATE SET
         last_synced_at = excluded.last_synced_at,
         updated_at = excluded.updated_at;`,
      [id, provider, lastSyncedAt, now],
    );
  }

  public async clearAll(): Promise<void> {
    await this.dbManager.executeRaw('DELETE FROM sync_state;');
  }
}

export const syncStateDao = new SyncStateDao();
export default syncStateDao;
