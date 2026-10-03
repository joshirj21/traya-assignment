import { MetricType } from '../mockHealthKit/types';
import { FitnessMetricEntity } from '../database/types';
import {
  DashboardMetricsData,
  MetricItem,
  TimelinePeriod,
  WeightGoal,
} from '../types/metrics';

export interface WeightInput {
  value: number;
  unit?: 'kg' | 'lbs';
  timestamp?: string;
}

export interface MetricHistoryOptions {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export type RepositoryChangeListener = () => void;
export type UnsubscribeRepository = () => void;
