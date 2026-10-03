

jest.mock('react-native-bootsplash', () => ({
  hide: jest.fn().mockResolvedValue(true),
  isVisible: jest.fn().mockResolvedValue(false),
  useHideAnimation: jest.fn(),
}));

jest.mock('react-native-mmkv', () => {
  const store = new Map<string, string | number | boolean>();

  const mockInstance = {
    getString: (key: string): string | undefined => {
      const val = store.get(key);
      return typeof val === 'string' ? val : undefined;
    },
    set: (key: string, value: string | number | boolean): void => {
      store.set(key, value);
    },
    getBoolean: (key: string): boolean | undefined => {
      const val = store.get(key);
      return typeof val === 'boolean' ? val : undefined;
    },
    getNumber: (key: string): number | undefined => {
      const val = store.get(key);
      return typeof val === 'number' ? val : undefined;
    },
    contains: (key: string): boolean => {
      return store.has(key);
    },
    remove: (key: string): boolean => {
      return store.delete(key);
    },
    delete: (key: string): void => {
      store.delete(key);
    },
    clearAll: (): void => {
      store.clear();
    },
    getAllKeys: (): string[] => {
      return Array.from(store.keys());
    },
  };

  return {
    createMMKV: jest.fn(() => mockInstance),
    MMKV: jest.fn(() => mockInstance),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');

  const mockInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  const mockFrame = { x: 0, y: 0, width: 390, height: 844 };

  const SafeAreaInsetsContext = React.createContext(mockInsets);
  const SafeAreaFrameContext = React.createContext(mockFrame);

  return {
    SafeAreaInsetsContext,
    SafeAreaFrameContext,
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        SafeAreaInsetsContext.Provider,
        { value: mockInsets },
        React.createElement(
          SafeAreaFrameContext.Provider,
          { value: mockFrame },
          children,
        ),
      ),
    SafeAreaView: View,
    useSafeAreaInsets: () => mockInsets,
    useSafeAreaFrame: () => mockFrame,
    initialWindowMetrics: { frame: mockFrame, insets: mockInsets },
  };
});

import { mockNetworkClient } from './src/lib/mockNetworkClient';
mockNetworkClient.setSimulationConfig({ latency: 0 });

const mockSqliteConnections = new Map<string, any>();

jest.mock('react-native-nitro-sqlite', () => {
  const { DatabaseSync } = require('node:sqlite');

  return {
    open: (options: { name: string }) => {
      const dbName = options?.name || 'test.db';
      let db = mockSqliteConnections.get(dbName);
      if (!db) {
        db = new DatabaseSync(':memory:');
        mockSqliteConnections.set(dbName, db);
      }

      const sanitizeParams = (params: any[] = []) =>
        params.map(p => (p === undefined ? null : p));

      const connection = {
        execute: (query: string, params: any[] = []) => {
          const cleanParams = sanitizeParams(params);
          const trimmed = query.trim();
          const isSelect = /^select/i.test(trimmed) || /^pragma/i.test(trimmed);

          if (isSelect) {
            const stmt = db.prepare(query);
            const rows = stmt.all(...cleanParams);
            return {
              rows: {
                _array: rows,
                length: rows.length,
                item: (idx: number) => rows[idx],
              },
            };
          } else {

            const statements = trimmed
              .split(';')
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0);

            if (statements.length > 1 && cleanParams.length === 0) {
              db.exec(trimmed);
              return {
                rowsAffected: statements.length,
                rows: { _array: [], length: 0, item: () => undefined },
              };
            }

            const stmt = db.prepare(trimmed);
            const info = stmt.run(...cleanParams);
            return {
              insertId: Number(info.lastInsertRowid),
              rowsAffected: Number(info.changes),
              rows: { _array: [], length: 0, item: () => undefined },
            };
          }
        },
        executeAsync: async (query: string, params: any[] = []) => {
          return connection.execute(query, params);
        },
        transaction: async (callback: (tx: any) => Promise<any>) => {
          db.exec('BEGIN TRANSACTION;');
          try {
            const tx = {
              execute: (query: string, params: any[] = []) =>
                connection.execute(query, params),
              executeAsync: async (query: string, params: any[] = []) =>
                connection.execute(query, params),
              commit: () => {
                db.exec('COMMIT;');
                return {};
              },
              rollback: () => {
                db.exec('ROLLBACK;');
                return {};
              },
            };
            const result = await callback(tx);
            db.exec('COMMIT;');
            return result;
          } catch (err) {
            try {
              db.exec('ROLLBACK;');
            } catch {}
            throw err;
          }
        },
        close: () => {

        },
      };

      return connection;
    },
  };
});
