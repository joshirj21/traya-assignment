

import { getInitialSeedData } from './mockData';
import {
  isHealthKitAvailableInStorage,
  setHealthKitAvailableInStorage,
} from '../lib/storage';
import {
  AggregationResult,
  AuthorizationStatus,
  ConnectionStatus,
  GenericSampleQueryOptions,
  HealthKitError,
  HealthKitInitOptions,
  HealthKitInitResult,
  HealthKitPermissions,
  HealthKitSubscriber,
  HealthSample,
  METRIC_DEFAULT_UNITS,
  MetricType,
  QueryOptions,
  Unsubscribe,
} from './types';

const ALL_METRIC_TYPES: MetricType[] = [
  'steps',
  'heart_rate',
  'sleep',
  'calories',
  'water',
  'activity',
  'weight',
];

export class MockHealthKitEngine {
  private isInitialized: boolean = false;
  private isConnected: boolean = false;
  private samples: HealthSample[] = [];

  private permissions: Map<
    MetricType,
    { read: AuthorizationStatus; write: AuthorizationStatus }
  > = new Map();

  private subscribers: Map<MetricType | '*', Set<HealthKitSubscriber>> =
    new Map();

  constructor() {
    this.resetState();
  }

  public get isAvailable(): boolean {
    return isHealthKitAvailableInStorage();
  }

  public set isAvailable(available: boolean) {
    setHealthKitAvailableInStorage(available);
  }

  private resetState(): void {
    this.samples = getInitialSeedData();
    this.isInitialized = false;
    this.isConnected = false;
    setHealthKitAvailableInStorage(true);

    this.permissions.clear();
    ALL_METRIC_TYPES.forEach(metric => {
      this.permissions.set(metric, {
        read: 'notDetermined',
        write: 'notDetermined',
      });
    });

    this.subscribers.clear();
  }

  public async initHealthKit(
    options?: HealthKitInitOptions,
  ): Promise<HealthKitInitResult> {
    if (!this.isAvailable) {
      throw new HealthKitError(
        'UNAVAILABLE',
        'HealthKit is not supported on this device/environment.',
      );
    }

    this.isInitialized = true;
    this.isConnected = true;

    if (options?.permissions) {
      const { read = [], write = [] } = options.permissions;
      read.forEach(metric => {
        const current = this.permissions.get(metric) || {
          read: 'notDetermined',
          write: 'notDetermined',
        };
        this.permissions.set(metric, { ...current, read: 'authorized' });
      });

      write.forEach(metric => {
        const current = this.permissions.get(metric) || {
          read: 'notDetermined',
          write: 'notDetermined',
        };
        this.permissions.set(metric, { ...current, write: 'authorized' });
      });
    } else {
      ALL_METRIC_TYPES.forEach(metric => {
        this.permissions.set(metric, {
          read: 'authorized',
          write: 'authorized',
        });
      });
    }

    return {
      success: true,
      connected: true,
    };
  }

  public async isHealthKitAvailable(): Promise<boolean> {
    return this.isAvailable;
  }

  public setHealthKitAvailable(available: boolean): void {
    this.isAvailable = available;
    if (!available) {
      this.isConnected = false;
    }
  }

  public getConnectionStatus(): ConnectionStatus {
    return {
      initialized: this.isInitialized,
      connected: this.isConnected,
      available: this.isAvailable,
    };
  }

  public disconnect(): void {
    this.isConnected = false;
  }

  public async requestAuthorization(
    permissions?: HealthKitPermissions,
  ): Promise<
    Record<
      MetricType,
      { read: AuthorizationStatus; write: AuthorizationStatus }
    >
  > {
    this.checkConnection();

    if (permissions?.read) {
      permissions.read.forEach(m => {
        const cur = this.permissions.get(m)!;
        this.permissions.set(m, { ...cur, read: 'authorized' });
      });
    }

    if (permissions?.write) {
      permissions.write.forEach(m => {
        const cur = this.permissions.get(m)!;
        this.permissions.set(m, { ...cur, write: 'authorized' });
      });
    }

    const result: any = {};
    this.permissions.forEach((v, k) => {
      result[k] = { ...v };
    });
    return result;
  }

  public getAuthorizationStatus(
    metricType: MetricType,
    accessType: 'read' | 'write' = 'read',
  ): AuthorizationStatus {
    const perm = this.permissions.get(metricType);
    return perm ? perm[accessType] : 'notDetermined';
  }

  public setAuthorizationStatus(
    metricType: MetricType,
    status: AuthorizationStatus,
    accessType: 'read' | 'write' = 'read',
  ): void {
    const current = this.permissions.get(metricType) || {
      read: 'notDetermined',
      write: 'notDetermined',
    };
    this.permissions.set(metricType, {
      ...current,
      [accessType]: status,
    });
  }

  private checkConnection(): void {
    if (!this.isInitialized) {
      throw new HealthKitError(
        'NOT_INITIALIZED',
        'HealthKit has not been initialized. Call initHealthKit() first.',
      );
    }
    if (!this.isConnected) {
      throw new HealthKitError(
        'DISCONNECTED',
        'HealthKit is disconnected. Please re-initialize or reconnect.',
      );
    }
  }

  private checkPermission(
    metricType: MetricType,
    accessType: 'read' | 'write',
  ): void {
    this.checkConnection();
    const status = this.getAuthorizationStatus(metricType, accessType);
    if (status !== 'authorized') {
      throw new HealthKitError(
        'PERMISSION_DENIED',
        `${
          accessType === 'read' ? 'Read' : 'Write'
        } permission denied for ${metricType}. Current status: ${status}`,
      );
    }
  }

  public async getSamples(
    options: GenericSampleQueryOptions,
  ): Promise<HealthSample[]> {
    const {
      metricType,
      startDate,
      endDate,
      limit,
      ascending = false,
    } = options;
    this.checkPermission(metricType, 'read');

    let filtered = this.samples.filter(s => s.metricType === metricType);

    if (startDate) {
      const startTs = new Date(startDate).getTime();
      if (isNaN(startTs)) {
        throw new HealthKitError(
          'INVALID_DATE_RANGE',
          `Invalid startDate: ${startDate}`,
        );
      }
      filtered = filtered.filter(
        s => new Date(s.endTime || s.startTime).getTime() >= startTs,
      );
    }

    if (endDate) {
      const endTs = new Date(endDate).getTime();
      if (isNaN(endTs)) {
        throw new HealthKitError(
          'INVALID_DATE_RANGE',
          `Invalid endDate: ${endDate}`,
        );
      }
      filtered = filtered.filter(s => new Date(s.startTime).getTime() <= endTs);
    }

    filtered.sort((a, b) => {
      const timeA = new Date(a.startTime).getTime();
      const timeB = new Date(b.startTime).getTime();
      return ascending ? timeA - timeB : timeB - timeA;
    });

    if (typeof limit === 'number' && limit > 0) {
      filtered = filtered.slice(0, limit);
    }

    return filtered.map(item => ({ ...item }));
  }

  public async getSampleById(id: string): Promise<HealthSample | null> {
    this.checkConnection();
    const found = this.samples.find(s => s.id === id);
    if (!found) return null;
    this.checkPermission(found.metricType, 'read');
    return { ...found };
  }

  public async addSample(data: {
    metricType: MetricType;
    value: number;
    unit?: string;
    startTime: string;
    endTime: string;
    source?: string;
    metadata?: Record<string, unknown>;
  }): Promise<HealthSample> {
    this.checkPermission(data.metricType, 'write');

    if (typeof data.value !== 'number' || isNaN(data.value)) {
      throw new HealthKitError(
        'INVALID_SAMPLE',
        'Sample value must be a valid number.',
      );
    }

    const startTs = new Date(data.startTime).getTime();
    const endTs = new Date(data.endTime).getTime();
    if (isNaN(startTs) || isNaN(endTs) || endTs < startTs) {
      throw new HealthKitError(
        'INVALID_DATE_RANGE',
        'Invalid sample startTime or endTime.',
      );
    }

    const newSample: HealthSample = {
      id: `${data.metricType}-${Date.now()}-${Math.floor(
        Math.random() * 10000,
      )}`,
      metricType: data.metricType,
      value: data.value,
      unit: data.unit || METRIC_DEFAULT_UNITS[data.metricType],
      startTime: data.startTime,
      endTime: data.endTime,
      source: data.source || 'mock_healthkit',
      ...(data.metadata ? { metadata: data.metadata } : {}),
    };

    this.samples.push(newSample);
    this.notifySubscribers(newSample);

    return { ...newSample };
  }

  public async updateSample(
    id: string,
    updates: Partial<Omit<HealthSample, 'id'>>,
  ): Promise<HealthSample> {
    this.checkConnection();
    const idx = this.samples.findIndex(s => s.id === id);
    if (idx === -1) {
      throw new HealthKitError(
        'SAMPLE_NOT_FOUND',
        `Sample with ID "${id}" was not found.`,
      );
    }

    const existing = this.samples[idx];
    this.checkPermission(existing.metricType, 'write');

    const updated: HealthSample = {
      ...existing,
      ...updates,
      id: existing.id,
      metricType: existing.metricType,
    };

    this.samples[idx] = updated;
    this.notifySubscribers(updated);

    return { ...updated };
  }

  public async deleteSample(id: string): Promise<boolean> {
    this.checkConnection();
    const idx = this.samples.findIndex(s => s.id === id);
    if (idx === -1) {
      throw new HealthKitError(
        'SAMPLE_NOT_FOUND',
        `Sample with ID "${id}" was not found.`,
      );
    }

    const existing = this.samples[idx];
    this.checkPermission(existing.metricType, 'write');

    this.samples.splice(idx, 1);
    return true;
  }

  public clearSamples(): void {
    this.samples = [];
  }

  public seedMockData(): void {
    this.samples = getInitialSeedData();
  }

  public resetMockData(): void {
    this.resetState();
  }

  public async getStepCount(options?: QueryOptions): Promise<HealthSample[]> {
    return this.getSamples({ metricType: 'steps', ...options });
  }

  public async getHeartRateSamples(
    options?: QueryOptions,
  ): Promise<HealthSample[]> {
    return this.getSamples({ metricType: 'heart_rate', ...options });
  }

  public async getSleepSamples(
    options?: QueryOptions,
  ): Promise<HealthSample[]> {
    return this.getSamples({ metricType: 'sleep', ...options });
  }

  public async getActiveEnergyBurned(
    options?: QueryOptions,
  ): Promise<HealthSample[]> {
    return this.getSamples({ metricType: 'calories', ...options });
  }

  public async getWaterSamples(
    options?: QueryOptions,
  ): Promise<HealthSample[]> {
    return this.getSamples({ metricType: 'water', ...options });
  }

  public async getActivitySamples(
    options?: QueryOptions,
  ): Promise<HealthSample[]> {
    return this.getSamples({ metricType: 'activity', ...options });
  }

  public async getWeightSamples(
    options?: QueryOptions,
  ): Promise<HealthSample[]> {
    return this.getSamples({ metricType: 'weight', ...options });
  }

  public async addStepSample(data: {
    value: number;
    startTime: string;
    endTime: string;
    metadata?: Record<string, unknown>;
  }): Promise<HealthSample> {
    return this.addSample({ metricType: 'steps', ...data });
  }

  public async addHeartRateSample(data: {
    value: number;
    startTime: string;
    endTime: string;
    metadata?: Record<string, unknown>;
  }): Promise<HealthSample> {
    return this.addSample({ metricType: 'heart_rate', ...data });
  }

  public async addSleepSample(data: {
    value: number;
    startTime: string;
    endTime: string;
    metadata?: Record<string, unknown>;
  }): Promise<HealthSample> {
    return this.addSample({ metricType: 'sleep', ...data });
  }

  public async addCaloriesSample(data: {
    value: number;
    startTime: string;
    endTime: string;
    metadata?: Record<string, unknown>;
  }): Promise<HealthSample> {
    return this.addSample({ metricType: 'calories', ...data });
  }

  public async addWaterSample(data: {
    value: number;
    startTime: string;
    endTime: string;
    metadata?: Record<string, unknown>;
  }): Promise<HealthSample> {
    return this.addSample({ metricType: 'water', ...data });
  }

  public async addActivitySample(data: {
    value: number;
    startTime: string;
    endTime: string;
    metadata?: Record<string, unknown>;
  }): Promise<HealthSample> {
    return this.addSample({ metricType: 'activity', ...data });
  }

  public async addWeightSample(data: {
    value: number;
    startTime: string;
    endTime: string;
    metadata?: Record<string, unknown>;
  }): Promise<HealthSample> {
    return this.addSample({ metricType: 'weight', ...data });
  }

  private formatDateToYMD(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  public async getTodaySamples(
    metricType: MetricType,
  ): Promise<HealthSample[]> {
    const todayStr = this.formatDateToYMD(new Date());
    return this.getSamplesForDate(metricType, todayStr);
  }

  public async getSamplesForDate(
    metricType: MetricType,
    dateStr: string,
  ): Promise<HealthSample[]> {
    const startIso = `${dateStr}T00:00:00.000Z`;
    const endIso = `${dateStr}T23:59:59.999Z`;
    return this.getSamples({
      metricType,
      startDate: startIso,
      endDate: endIso,
      ascending: true,
    });
  }

  public async getSamplesForDateRange(
    metricType: MetricType,
    startDate: string,
    endDate: string,
  ): Promise<HealthSample[]> {
    return this.getSamples({
      metricType,
      startDate,
      endDate,
      ascending: true,
    });
  }

  public async getDailyTotal(
    metricType: MetricType,
    dateStr: string,
  ): Promise<AggregationResult> {
    const samples = await this.getSamplesForDate(metricType, dateStr);
    const sum = samples.reduce((acc, s) => acc + s.value, 0);
    const rounded = Math.round(sum * 100) / 100;

    return {
      metricType,
      date: dateStr,
      value: rounded,
      unit: samples[0]?.unit || METRIC_DEFAULT_UNITS[metricType],
    };
  }

  public async getDailyAverage(
    metricType: MetricType,
    dateStr: string,
  ): Promise<AggregationResult> {
    const samples = await this.getSamplesForDate(metricType, dateStr);
    const total = samples.reduce((acc, s) => acc + s.value, 0);
    const avg = samples.length > 0 ? total / samples.length : 0;
    const rounded = Math.round(avg * 10) / 10;

    return {
      metricType,
      date: dateStr,
      value: rounded,
      unit: samples[0]?.unit || METRIC_DEFAULT_UNITS[metricType],
    };
  }

  public async getDailyMin(
    metricType: MetricType,
    dateStr: string,
  ): Promise<AggregationResult> {
    const samples = await this.getSamplesForDate(metricType, dateStr);
    const min = samples.length > 0 ? Math.min(...samples.map(s => s.value)) : 0;

    return {
      metricType,
      date: dateStr,
      value: min,
      unit: samples[0]?.unit || METRIC_DEFAULT_UNITS[metricType],
    };
  }

  public async getDailyMax(
    metricType: MetricType,
    dateStr: string,
  ): Promise<AggregationResult> {
    const samples = await this.getSamplesForDate(metricType, dateStr);
    const max = samples.length > 0 ? Math.max(...samples.map(s => s.value)) : 0;

    return {
      metricType,
      date: dateStr,
      value: max,
      unit: samples[0]?.unit || METRIC_DEFAULT_UNITS[metricType],
    };
  }

  public async simulateNewData(
    metricType: MetricType,
    data: {
      value: number;
      startTime: string;
      endTime: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<HealthSample> {
    return this.addSample({ metricType, ...data });
  }

  public async getLatestSample(
    metricType: MetricType,
  ): Promise<HealthSample | null> {
    const samples = await this.getSamples({
      metricType,
      limit: 1,
      ascending: false,
    });
    return samples.length > 0 ? samples[0] : null;
  }

  public subscribe(
    metricType: MetricType | '*',
    subscriber: HealthKitSubscriber,
  ): Unsubscribe {
    if (!this.subscribers.has(metricType)) {
      this.subscribers.set(metricType, new Set());
    }

    this.subscribers.get(metricType)!.add(subscriber);

    return () => {
      const set = this.subscribers.get(metricType);
      if (set) {
        set.delete(subscriber);
      }
    };
  }

  private notifySubscribers(sample: HealthSample): void {

    const specificSubscribers = this.subscribers.get(sample.metricType);
    if (specificSubscribers) {
      specificSubscribers.forEach(cb => {
        try {
          cb(sample);
        } catch (e) {
          console.error('Error in HealthKit subscriber callback:', e);
        }
      });
    }

    const wildcardSubscribers = this.subscribers.get('*');
    if (wildcardSubscribers) {
      wildcardSubscribers.forEach(cb => {
        try {
          cb(sample);
        } catch (e) {
          console.error('Error in HealthKit wildcard subscriber callback:', e);
        }
      });
    }
  }
}

export const mockHealthKit = new MockHealthKitEngine();
export default mockHealthKit;
