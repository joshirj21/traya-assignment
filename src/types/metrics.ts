

export type TimelinePeriod = '7_days' | '30_days' | '3_months';

export interface WeightGoal {
  targetWeight: number;      
  currentWeight: number;      
  startWeight: number;      
  targetSetDate: string;
  progressPercent: number;           
  remainingKg: number;
}

export interface MetricItem {
  id: string;
  title: string;
  value: string;
  unit?: string;
  goal?: string;
  subtitle?: string;
  iconName: 'weight' | 'steps' | 'sleep' | 'calories' | 'water' | 'activity';
  statusColor?: string;

  measuredAt?: string;
}

export interface DashboardMetricsData {
  period: TimelinePeriod;
  weightGoal: WeightGoal;
  coreMetrics: MetricItem[];

  lastSyncedAt: string;

  fetchedAt?: string;
}
