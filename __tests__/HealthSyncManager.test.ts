

import { AppState, AppStateStatus } from 'react-native';
import healthSyncManager, {
  ALL_SYNC_METRICS,
  HealthSyncManager,
} from '../src/health';
import {
  generateSyncHash,
  normalizeHealthSample,
  normalizeHealthSamples,
} from '../src/health/normalizer';
import { mockNetworkClient } from '../src/lib/mockNetworkClient';
import { setHealthKitConnectedInStorage, storage } from '../src/lib/storage';
import MockHealthKit, { HealthSample } from '../src/mockHealthKit';

describe('HealthSyncManager & Data Normalization', () => {
  let appStateListener: ((state: AppStateStatus) => void) | null = null;

  beforeEach(() => {
    storage.clearAll();
    MockHealthKit.resetMockData();
    mockNetworkClient.resetSimulationConfig();
    mockNetworkClient.setSimulationConfig({ latency: 0 });
    healthSyncManager.destroy();

    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((event, listener: any) => {
        if (event === 'change') {
          appStateListener = listener;
        }
        return {
          remove: jest.fn(),
        } as any;
      });
  });

  afterEach(() => {
    healthSyncManager.destroy();
    jest.restoreAllMocks();
  });

  describe('Data Normalizer', () => {
    it('generates consistent deterministic sync hashes for identical samples', () => {
      const sample = {
        source: 'mock_healthkit',
        metricType: 'steps',
        startTime: '2026-10-02T08:00:00.000Z',
        endTime: '2026-10-02T09:00:00.000Z',
        value: 1500,
      };

      const hash1 = generateSyncHash(sample);
      const hash2 = generateSyncHash(sample);
      expect(hash1).toBe(hash2);
      expect(hash1).toContain('sync_');
    });

    it('normalizes a raw HealthSample with correct UTC dates, duration, and units', () => {
      const rawSample: HealthSample = {
        id: 'raw-123',
        metricType: 'sleep',
        value: 462,
        unit: 'minutes',
        startTime: '2026-10-01T23:18:00Z',
        endTime: '2026-10-02T07:00:00Z',
        source: 'Apple Watch',
        metadata: { sleepStage: 'core' },
      };

      const normalized = normalizeHealthSample(rawSample);
      expect(normalized.metricType).toBe('sleep');
      expect(normalized.value).toBe(462);
      expect(normalized.unit).toBe('minutes');
      expect(normalized.durationSeconds).toBe(27720);                     
      expect(normalized.source).toBe('Apple Watch');
      expect(normalized.metadata?.sleepStage).toBe('core');
      expect(normalized.syncHash).toBeDefined();
    });

    it('deduplicates duplicate samples during batch normalization', () => {
      const sample: HealthSample = {
        id: 'dup-1',
        metricType: 'water',
        value: 500,
        unit: 'ml',
        startTime: '2026-10-02T10:00:00Z',
        endTime: '2026-10-02T10:00:00Z',
        source: 'mock_healthkit',
      };

      const duplicateSample: HealthSample = {
        id: 'dup-2',
        metricType: 'water',
        value: 500,
        unit: 'ml',
        startTime: '2026-10-02T10:00:00Z',
        endTime: '2026-10-02T10:00:00Z',
        source: 'mock_healthkit',
      };

      const batch = normalizeHealthSamples([sample, duplicateSample]);
      expect(batch.length).toBe(1);
    });
  });

  describe('HealthSyncManager Core Workflow', () => {
    it('initializes and respects connected state from MMKV', async () => {
      setHealthKitConnectedInStorage(false);
      const manager = new HealthSyncManager();

      await manager.initialize();
      const status = manager.getSyncStatus();
      expect(status.state).toBe('idle');
      expect(status.isSyncing).toBe(false);
    });

    it('performs full sync across all 7 metrics when connected', async () => {
      setHealthKitConnectedInStorage(true);
      await MockHealthKit.initHealthKit();

      const manager = new HealthSyncManager();
      await manager.initialize();

      const syncResult = await manager.sync({
        trigger: 'manual_connect',
        forceFullSync: true,
      });

      expect(syncResult.state).toBe('success');
      expect(syncResult.isSyncing).toBe(false);
      expect(syncResult.lastSyncedAt).toBeDefined();

      ALL_SYNC_METRICS.forEach(metric => {
        const metricStatus = syncResult.metricStatuses[metric];
        expect(metricStatus.count).toBeGreaterThan(0);
        expect(metricStatus.lastSyncedAt).toBeDefined();
        expect(metricStatus.error).toBeNull();
      });
    });

    it('synchronizes an individual metric via syncMetric', async () => {
      setHealthKitConnectedInStorage(true);
      await MockHealthKit.initHealthKit();

      const manager = new HealthSyncManager();
      await manager.initialize();

      const metricResult = await manager.syncMetric('steps', {
        forceFullSync: true,
      });
      expect(metricResult.success).toBe(true);
      expect(metricResult.metricType).toBe('steps');
      expect(metricResult.recordsCount).toBeGreaterThan(0);
      expect(metricResult.lastSyncedAt).toBeDefined();
    });

    it('subscribes to live status updates and notifies listeners', async () => {
      setHealthKitConnectedInStorage(true);
      await MockHealthKit.initHealthKit();

      const manager = new HealthSyncManager();
      const statusSnapshots: string[] = [];

      const unsubscribe = manager.subscribeToSyncStatus(status => {
        statusSnapshots.push(status.state);
      });

      await manager.sync({ trigger: 'pull_to_refresh' });

      expect(statusSnapshots).toContain('syncing');
      expect(statusSnapshots).toContain('success');

      unsubscribe();
    });

    it('triggers sync when returning to active foreground from background', async () => {
      setHealthKitConnectedInStorage(true);
      await MockHealthKit.initHealthKit();

      const manager = new HealthSyncManager();
      await manager.initialize();

      const syncSpy = jest.spyOn(manager, 'sync');

      if (appStateListener) {
        appStateListener('background');
        appStateListener('active');
      }

      expect(syncSpy).toHaveBeenCalledWith({ trigger: 'app_foreground' });
    });

    it('handles sync cancellation cleanly without throwing unhandled exceptions', async () => {
      setHealthKitConnectedInStorage(true);
      await MockHealthKit.initHealthKit();

      const manager = new HealthSyncManager();
      await manager.initialize();

      const syncPromise = manager.sync({ trigger: 'pull_to_refresh' });
      manager.cancelSync();

      const finalStatus = await syncPromise;
      expect(finalStatus.isSyncing).toBe(false);
    });
  });
});
