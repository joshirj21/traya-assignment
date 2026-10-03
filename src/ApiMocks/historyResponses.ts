

import { DailyAggregateResult } from '../database/types';
import { MetricType } from '../mockHealthKit/types';

type Period = '7_days' | '30_days' | '3_months';

const PERIOD_DAYS: Record<Period, number> = {
  '7_days': 7,
  '30_days': 30,
  '3_months': 90,
};

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function range(seed: number, min: number, max: number): number {
  return min + seededRandom(seed) * (max - min);
}

export function generateHistoryResponse(
  metricType: MetricType,
  period: Period,
): DailyAggregateResult[] {
  const days = PERIOD_DAYS[period];
  const results: DailyAggregateResult[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().substring(0, 10);                

    const seed = parseInt(date.replace(/-/g, ''), 10) + metricType.length;

    let value: number;
    let unit: string;
    let extra: Partial<DailyAggregateResult> = {};

    switch (metricType) {
      case 'steps':
        value = Math.round(range(seed, 4500, 12500));
        unit = 'steps';
        break;

      case 'weight': {

        const trend = 74 - (days - 1 - i) * (2 / Math.max(days - 1, 1));
        value = Number((trend + range(seed, -0.3, 0.3)).toFixed(1));
        unit = 'kg';
        break;
      }

      case 'calories':
        value = Math.round(range(seed, 1600, 2500));
        unit = 'kcal';
        break;

      case 'sleep':
        value = Number(range(seed, 5.0, 8.5).toFixed(1));
        unit = 'hrs';
        break;

      case 'water':
        value = Number(range(seed, 1.2, 3.5).toFixed(1));
        unit = 'L';
        break;

      case 'activity':
        value = Math.round(range(seed, 10, 80));
        unit = 'min';
        break;

      case 'heart_rate': {
        const avg = Math.round(range(seed, 58, 84));
        const spread = Math.round(range(seed + 1, 5, 18));
        value = avg;
        unit = 'bpm';
        extra = { min_value: avg - spread, max_value: avg + spread };
        break;
      }

      default:
        value = Math.round(range(seed, 0, 100));
        unit = '';
        break;
    }

    results.push({
      metric_type: metricType,
      date,
      value,
      unit,
      count: 1,
      ...extra,
    });
  }

  return results;
}
