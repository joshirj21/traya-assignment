

import metricResponses from '../ApiMocks/metricResponses.json';
import { generateHistoryResponse } from '../ApiMocks/historyResponses';
import { metricsAggregator } from '../health/metricsAggregator';
import MockHealthKit from '../mockHealthKit';
import mockNetworkClient, { MockNetworkClient } from '../lib/mockNetworkClient';
import { isHealthKitConnectedInStorage, storage } from '../lib/storage';
import { ApiResponse, MockRequestOptions } from '../types/api';
import {
  DashboardMetricsData,
  TimelinePeriod,
  WeightGoal,
} from '../types/metrics';
import { DailyAggregateResult } from '../database/types';
import { MetricType } from '../mockHealthKit/types';

export const METRICS_STORAGE_KEYS = {
  CUSTOM_TARGET_GOAL: 'customTargetWeightGoal',
  LAST_SYNCED_AT: 'lastSyncedHealthDataAt',
} as const;

export class MetricsService {
  private client: MockNetworkClient;

  constructor(client: MockNetworkClient = mockNetworkClient) {
    this.client = client;
  }

  public async getDashboardMetrics(
    period: TimelinePeriod = '7_days',
    options?: MockRequestOptions<DashboardMetricsData>,
  ): Promise<ApiResponse<DashboardMetricsData>> {
    const customGoal = this.getCustomTargetWeightGoal();
    const isConnected = isHealthKitConnectedInStorage();

    if (isConnected) {
      try {
        if (!MockHealthKit.getConnectionStatus().initialized) {
          await MockHealthKit.initHealthKit();
        }
        const liveData = await metricsAggregator.computeDashboardMetrics(
          period,
          customGoal,
        );
        const lastSynced = this.getLastSyncedTime() || liveData.lastSyncedAt;
        return {
          data: {
            ...liveData,
            lastSyncedAt: lastSynced,
          },
          status: 200,
        };
      } catch (err) {
        console.warn(
          'Failed to aggregate live HealthKit metrics, falling back to backend:',
          err,
        );
      }
    }

    const rawMock = metricResponses[period];
    const defaultData: DashboardMetricsData = rawMock
      ? (rawMock.data as DashboardMetricsData)
      : (metricResponses['7_days'].data as DashboardMetricsData);

    const lastSynced = this.getLastSyncedTime() || defaultData.lastSyncedAt;

    const modifiedData: DashboardMetricsData = {
      ...defaultData,
      weightGoal: customGoal
        ? { ...defaultData.weightGoal, ...customGoal }
        : defaultData.weightGoal,
      lastSyncedAt: lastSynced,
    };

    return this.client.get<DashboardMetricsData>(
      `/api/v1/metrics?period=${period}`,
      modifiedData,
      options,
    );
  }

  public getCustomTargetWeightGoal(): Partial<WeightGoal> | null {
    try {
      const raw = storage.getString(METRICS_STORAGE_KEYS.CUSTOM_TARGET_GOAL);
      if (!raw) return null;
      return JSON.parse(raw) as Partial<WeightGoal>;
    } catch {
      return null;
    }
  }

  public updateTargetWeight(
    newTargetWeight: number,
    currentGoal: WeightGoal,
  ): WeightGoal {
    const startWeight = currentGoal.startWeight;
    const currentWeight = currentGoal.currentWeight;

    let progressPercent = 0;
    if (startWeight !== newTargetWeight) {
      progressPercent = Math.round(
        ((startWeight - currentWeight) / (startWeight - newTargetWeight)) * 100,
      );
      progressPercent = Math.min(Math.max(progressPercent, 0), 100);
    }

    const remainingKg = Math.max(
      0,
      Math.round((currentWeight - newTargetWeight) * 10) / 10,
    );

    const updatedGoal: WeightGoal = {
      ...currentGoal,
      targetWeight: newTargetWeight,
      progressPercent,
      remainingKg,
    };

    try {
      storage.set(
        METRICS_STORAGE_KEYS.CUSTOM_TARGET_GOAL,
        JSON.stringify(updatedGoal),
      );
    } catch (e) {
      console.error('Failed to save custom target weight to MMKV:', e);
    }

    return updatedGoal;
  }

  public getLastSyncedTime(): string | null {
    try {
      return storage.getString(METRICS_STORAGE_KEYS.LAST_SYNCED_AT) || null;
    } catch {
      return null;
    }
  }

  public async getMetricHistory(
    metricType: MetricType,
    period: TimelinePeriod,
  ): Promise<DailyAggregateResult[]> {
    const mockData = generateHistoryResponse(
      metricType,
      period as '7_days' | '30_days' | '3_months',
    );

    const response = await this.client.get<DailyAggregateResult[]>(
      `/api/v1/metrics/history?metricType=${metricType}&period=${period}`,
      mockData,
    );

    return response.data;
  }

  public async syncExternalHealthData(
    delayMs: number = 800,
  ): Promise<{ lastSyncedAt: string }> {
    if (delayMs > 0) {
      await new Promise<void>(resolve => {
        setTimeout(() => resolve(), delayMs);
      });
    }

    const now = new Date();
    const formatted = `${now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}, ${now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`;

    try {
      storage.set(METRICS_STORAGE_KEYS.LAST_SYNCED_AT, formatted);
    } catch (e) {
      console.error('Failed to save last sync timestamp to MMKV:', e);
    }

    return { lastSyncedAt: formatted };
  }

}

export const metricsService = new MetricsService();
export default metricsService;
