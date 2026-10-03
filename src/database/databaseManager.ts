import {
  open,
  NitroSQLiteConnection,
  Transaction,
} from 'react-native-nitro-sqlite';
import { migrations } from './migrations';
import { DatabaseExecutor, SchemaMigrationEntity } from './types';

export const DATABASE_NAME = 'traya_fitness.db';

export class DatabaseManager implements DatabaseExecutor {
  private static instance: DatabaseManager | null = null;
  private db: NitroSQLiteConnection | null = null;
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;

  private operationQueue: Promise<unknown> = Promise.resolve();

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operationQueue.then(operation, operation);

    this.operationQueue = result.then(
      () => {},
      () => {},
    );
    return result;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized && this.db) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        if (!this.db) {
          this.db = open({ name: DATABASE_NAME });
        }

        await this.runMigrations();
        this.isInitialized = true;
      } catch (error) {
        console.error('Database initialization failed:', error);

        this.db = null;
        this.isInitialized = false;
        throw error;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  public async getDatabase(): Promise<NitroSQLiteConnection> {
    if (!this.isInitialized || !this.db) {
      await this.initialize();
    }
    if (!this.db) {
      throw new Error('Database connection is not open');
    }
    return this.db;
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not opened');
    }

    this.db.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    const appliedResult = this.db.execute<any>(
      'SELECT version, name, applied_at FROM schema_migrations ORDER BY version ASC;',
    );
    const appliedRows = (appliedResult.rows?._array ??
      []) as SchemaMigrationEntity[];
    const appliedVersions = new Set(appliedRows.map(r => r.version));

    const sortedMigrations = [...migrations].sort(
      (a, b) => a.version - b.version,
    );

    for (const migration of sortedMigrations) {
      if (!appliedVersions.has(migration.version)) {
        console.log(
          `Applying database migration ${migration.version}: ${migration.name}`,
        );

        await this.db.transaction(async tx => {

          const txExecutor: DatabaseExecutor = {
            execute: async <T>(sql: string, params: any[] = []) => {
              const res = tx.execute<any>(sql, params);
              return (res.rows?._array ?? []) as T[];
            },
            executeRaw: async (sql: string, params: any[] = []) => {
              return tx.execute(sql, params);
            },
          };

          await migration.up(txExecutor);

          tx.execute(
            'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
            [migration.version, migration.name, new Date().toISOString()],
          );
        });
      }
    }
  }

  public execute<T = any>(
    query: string,
    params: (string | number | boolean | null)[] = [],
  ): Promise<T[]> {
    return this.enqueue(async () => {
      const db = await this.getDatabase();
      const result = db.execute<any>(query, params);
      return (result.rows?._array ?? []) as T[];
    });
  }

  public executeRaw(
    query: string,
    params: (string | number | boolean | null)[] = [],
  ): Promise<any> {
    return this.enqueue(async () => {
      const db = await this.getDatabase();
      return db.execute(query, params);
    });
  }

  public transaction<T = void>(
    callback: (tx: Transaction) => Promise<T>,
  ): Promise<T> {
    return this.enqueue(async () => {
      const db = await this.getDatabase();
      return db.transaction(callback);
    });
  }

  public close(): void {
    if (this.db) {
      try {
        this.db.close();
      } catch (e) {
        console.warn('Error closing database:', e);
      }
      this.db = null;
      this.isInitialized = false;
    }
  }

  public async resetDatabase(): Promise<void> {
    if (!this.db) {
      this.db = open({ name: DATABASE_NAME });
    }

    try {
      this.db.execute('DROP TABLE IF EXISTS sync_state;');
      this.db.execute('DROP TABLE IF EXISTS sync_queue;');
      this.db.execute('DROP TABLE IF EXISTS fitness_metrics;');
      this.db.execute('DROP TABLE IF EXISTS schema_migrations;');
    } catch (e) {
      console.warn('Error dropping tables in resetDatabase:', e);
    }

    this.isInitialized = false;
    await this.initialize();
  }
}

export const databaseManager = DatabaseManager.getInstance();
export default databaseManager;
