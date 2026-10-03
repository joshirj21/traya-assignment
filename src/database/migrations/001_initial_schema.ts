import { DatabaseExecutor, Migration } from '../types';

export const migration001InitialSchema: Migration = {
  version: 1,
  name: '001_initial_schema',
  up: async (db: DatabaseExecutor) => {

    await db.executeRaw(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    await db.executeRaw(`
      CREATE TABLE IF NOT EXISTS fitness_metrics (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        metric_type TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        source TEXT NOT NULL,
        source_record_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.executeRaw(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_fitness_metrics_dedup
      ON fitness_metrics(user_id, source, source_record_id)
      WHERE source_record_id IS NOT NULL;
    `);

    await db.executeRaw(`
      CREATE INDEX IF NOT EXISTS idx_fitness_metrics_type
      ON fitness_metrics(metric_type);
    `);

    await db.executeRaw(`
      CREATE INDEX IF NOT EXISTS idx_fitness_metrics_start
      ON fitness_metrics(start_time);
    `);

    await db.executeRaw(`
      CREATE INDEX IF NOT EXISTS idx_fitness_metrics_end
      ON fitness_metrics(end_time);
    `);

    await db.executeRaw(`
      CREATE INDEX IF NOT EXISTS idx_fitness_metrics_type_start
      ON fitness_metrics(metric_type, start_time);
    `);

    await db.executeRaw(`
      CREATE INDEX IF NOT EXISTS idx_fitness_metrics_user_type_start
      ON fitness_metrics(user_id, metric_type, start_time);
    `);

    await db.executeRaw(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL,
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await db.executeRaw(`
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status
      ON sync_queue(status);
    `);

    await db.executeRaw(`
      CREATE INDEX IF NOT EXISTS idx_sync_queue_entity
      ON sync_queue(entity_type, entity_id);
    `);

    await db.executeRaw(`
      CREATE TABLE IF NOT EXISTS sync_state (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL UNIQUE,
        last_synced_at TEXT,
        updated_at TEXT NOT NULL
      );
    `);

    await db.executeRaw(`
      CREATE INDEX IF NOT EXISTS idx_sync_state_provider
      ON sync_state(provider);
    `);
  },
  down: async (db: DatabaseExecutor) => {
    await db.executeRaw('DROP TABLE IF EXISTS sync_state;');
    await db.executeRaw('DROP TABLE IF EXISTS sync_queue;');
    await db.executeRaw('DROP TABLE IF EXISTS fitness_metrics;');
    await db.executeRaw('DROP TABLE IF EXISTS schema_migrations;');
  },
};
