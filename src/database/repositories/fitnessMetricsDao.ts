import { MetricType } from '../../mockHealthKit/types';
import databaseManager, { DatabaseManager } from '../databaseManager';
import {
  DailyAggregateResult,
  FitnessMetricEntity,
  MetricQueryOptions,
} from '../types';

export class FitnessMetricsDao {
  private dbManager: DatabaseManager;

  constructor(dbManager: DatabaseManager = databaseManager) {
    this.dbManager = dbManager;
  }

  public async insertMetric(metric: FitnessMetricEntity): Promise<void> {
    const query = `
      INSERT INTO fitness_metrics (
        id, user_id, metric_type, value, unit, start_time, end_time, source, source_record_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    await this.dbManager.executeRaw(query, [
      metric.id,
      metric.user_id ?? null,
      metric.metric_type,
      metric.value,
      metric.unit,
      metric.start_time,
      metric.end_time,
      metric.source,
      metric.source_record_id ?? null,
      metric.created_at,
      metric.updated_at,
    ]);
  }

  public async insertMetrics(metrics: FitnessMetricEntity[]): Promise<void> {
    if (metrics.length === 0) return;

    await this.dbManager.transaction(async tx => {
      const query = `
        INSERT INTO fitness_metrics (
          id, user_id, metric_type, value, unit, start_time, end_time, source, source_record_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
      for (const m of metrics) {
        tx.execute(query, [
          m.id,
          m.user_id ?? null,
          m.metric_type,
          m.value,
          m.unit,
          m.start_time,
          m.end_time,
          m.source,
          m.source_record_id ?? null,
          m.created_at,
          m.updated_at,
        ]);
      }
    });
  }

  public async upsertMetric(metric: FitnessMetricEntity): Promise<void> {
    await this.upsertMetrics([metric]);
  }

  public async upsertMetrics(metrics: FitnessMetricEntity[]): Promise<void> {
    if (metrics.length === 0) return;

    await this.dbManager.transaction(async tx => {
      for (const m of metrics) {
        let existingId: string | null = null;

        if (m.source_record_id) {
          const res = tx.execute<{ id: string }>(
            `SELECT id FROM fitness_metrics WHERE source = ? AND source_record_id = ? AND (user_id = ? OR (user_id IS NULL AND ? IS NULL)) LIMIT 1;`,
            [
              m.source,
              m.source_record_id,
              m.user_id ?? null,
              m.user_id ?? null,
            ],
          );
          const row = (res.rows?._array ?? [])[0];
          if (row) {
            existingId = row.id;
          }
        }

        if (!existingId) {
          const res = tx.execute<{ id: string }>(
            `SELECT id FROM fitness_metrics WHERE id = ? LIMIT 1;`,
            [m.id],
          );
          const row = (res.rows?._array ?? [])[0];
          if (row) {
            existingId = row.id;
          }
        }

        if (existingId) {

          tx.execute(
            `UPDATE fitness_metrics SET
              user_id = ?,
              metric_type = ?,
              value = ?,
              unit = ?,
              start_time = ?,
              end_time = ?,
              source = ?,
              source_record_id = ?,
              updated_at = ?
            WHERE id = ? AND updated_at <= ?;`,
            [
              m.user_id ?? null,
              m.metric_type,
              m.value,
              m.unit,
              m.start_time,
              m.end_time,
              m.source,
              m.source_record_id ?? null,
              m.updated_at,
              existingId,
              m.updated_at,
            ],
          );
        } else {

          tx.execute(
            `INSERT INTO fitness_metrics (
              id, user_id, metric_type, value, unit, start_time, end_time, source, source_record_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              m.id,
              m.user_id ?? null,
              m.metric_type,
              m.value,
              m.unit,
              m.start_time,
              m.end_time,
              m.source,
              m.source_record_id ?? null,
              m.created_at,
              m.updated_at,
            ],
          );
        }
      }
    });
  }

  public async getMetricById(id: string): Promise<FitnessMetricEntity | null> {
    const rows = await this.dbManager.execute<FitnessMetricEntity>(
      'SELECT * FROM fitness_metrics WHERE id = ? LIMIT 1;',
      [id],
    );
    return rows[0] || null;
  }

  public async getMetricsByType(
    metricType: MetricType,
    limit: number = 100,
    offset: number = 0,
    ascending: boolean = false,
  ): Promise<FitnessMetricEntity[]> {
    const order = ascending ? 'ASC' : 'DESC';
    return this.dbManager.execute<FitnessMetricEntity>(
      `SELECT * FROM fitness_metrics WHERE metric_type = ? ORDER BY start_time ${order} LIMIT ? OFFSET ?;`,
      [metricType, limit, offset],
    );
  }

  public async getMetricsByDateRange(
    startDate: string,
    endDate: string,
    options: MetricQueryOptions = {},
  ): Promise<FitnessMetricEntity[]> {
    const limit = options.limit ?? 500;
    const offset = options.offset ?? 0;
    const order = options.ascending ? 'ASC' : 'DESC';

    return this.dbManager.execute<FitnessMetricEntity>(
      `SELECT * FROM fitness_metrics
       WHERE start_time >= ? AND start_time <= ?
       ORDER BY start_time ${order} LIMIT ? OFFSET ?;`,
      [startDate, endDate, limit, offset],
    );
  }

  public async getMetricsByTypeAndDateRange(
    metricType: MetricType,
    startDate: string,
    endDate: string,
    options: MetricQueryOptions = {},
  ): Promise<FitnessMetricEntity[]> {
    const limit = options.limit ?? 500;
    const offset = options.offset ?? 0;
    const order = options.ascending ? 'ASC' : 'DESC';

    return this.dbManager.execute<FitnessMetricEntity>(
      `SELECT * FROM fitness_metrics
       WHERE metric_type = ? AND start_time >= ? AND start_time <= ?
       ORDER BY start_time ${order} LIMIT ? OFFSET ?;`,
      [metricType, startDate, endDate, limit, offset],
    );
  }

  public async getLatestMetric(
    metricType: MetricType,
    userId?: string,
  ): Promise<FitnessMetricEntity | null> {
    const query = userId
      ? `SELECT * FROM fitness_metrics WHERE metric_type = ? AND user_id = ? ORDER BY start_time DESC LIMIT 1;`
      : `SELECT * FROM fitness_metrics WHERE metric_type = ? ORDER BY start_time DESC LIMIT 1;`;
    const params = userId ? [metricType, userId] : [metricType];

    const rows = await this.dbManager.execute<FitnessMetricEntity>(
      query,
      params,
    );
    return rows[0] || null;
  }

  public async getLatestMetricByPriority(
    metricType: MetricType,
    userId?: string,
  ): Promise<FitnessMetricEntity | null> {
    const whereClause = userId
      ? 'WHERE metric_type = ? AND user_id = ?'
      : 'WHERE metric_type = ?';
    const params = userId ? [metricType, userId] : [metricType];

    const rows = await this.dbManager.execute<FitnessMetricEntity>(
      `SELECT * FROM fitness_metrics
       ${whereClause}
       ORDER BY
         end_time DESC,
         CASE source
           WHEN 'manual'    THEN 1
           WHEN 'healthkit' THEN 2
           WHEN 'backend'   THEN 3
           ELSE                  4
         END ASC
       LIMIT 1;`,
      params,
    );
    return rows[0] || null;
  }

  public async getLatestMetrics(
    userId?: string,
  ): Promise<Record<MetricType, FitnessMetricEntity | null>> {
    const types: MetricType[] = [
      'steps',
      'heart_rate',
      'sleep',
      'calories',
      'water',
      'activity',
      'weight',
    ];

    const results: Record<MetricType, FitnessMetricEntity | null> = {
      steps: null,
      heart_rate: null,
      sleep: null,
      calories: null,
      water: null,
      activity: null,
      weight: null,
    };

    await Promise.all(
      types.map(async t => {
        results[t] = await this.getLatestMetricByPriority(t, userId);
      }),
    );

    return results;
  }

  public async deleteMetric(id: string): Promise<boolean> {
    const res = await this.dbManager.executeRaw(
      'DELETE FROM fitness_metrics WHERE id = ?;',
      [id],
    );
    return (res?.rowsAffected ?? 0) > 0;
  }

  public async deleteMetricsByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<number> {
    const res = await this.dbManager.executeRaw(
      'DELETE FROM fitness_metrics WHERE start_time >= ? AND start_time <= ?;',
      [startDate, endDate],
    );
    return res?.rowsAffected ?? 0;
  }

  public async clearAllMetrics(): Promise<void> {
    await this.dbManager.executeRaw('DELETE FROM fitness_metrics;');
  }

  public async getDailyAggregates(
    metricType: MetricType,
    startDate: string,
    endDate: string,
  ): Promise<DailyAggregateResult[]> {
    const records = await this.dbManager.execute<FitnessMetricEntity>(
      `SELECT * FROM fitness_metrics
       WHERE metric_type = ? AND start_time >= ? AND start_time <= ?
       ORDER BY start_time ASC;`,
      [metricType, startDate, endDate],
    );

    if (records.length === 0) {
      return [];
    }

    const recordsByDay = new Map<string, FitnessMetricEntity[]>();
    for (const r of records) {
      const day = r.start_time.substring(0, 10);
      if (!recordsByDay.has(day)) {
        recordsByDay.set(day, []);
      }
      recordsByDay.get(day)!.push(r);
    }

    const aggregates: DailyAggregateResult[] = [];

    recordsByDay.forEach((dayRecords, day) => {
      const unit = dayRecords[0]?.unit || '';

      switch (metricType) {
        case 'steps':
        case 'calories':
        case 'water':
        case 'activity': {
          const total = dayRecords.reduce((acc, curr) => acc + curr.value, 0);
          aggregates.push({
            metric_type: metricType,
            date: day,
            value:
              metricType === 'water'
                ? Number(total.toFixed(2))
                : Math.round(total),
            unit,
            count: dayRecords.length,
          });
          break;
        }

        case 'heart_rate': {
          const values = dayRecords.map(r => r.value);
          const sum = values.reduce((acc, val) => acc + val, 0);
          const avg = sum / values.length;
          const min = Math.min(...values);
          const max = Math.max(...values);
          aggregates.push({
            metric_type: metricType,
            date: day,
            value: Math.round(avg),
            unit: 'bpm',
            count: dayRecords.length,
            min_value: min,
            max_value: max,
          });
          break;
        }

        case 'weight': {

          const sorted = [...dayRecords].sort(
            (a, b) =>
              new Date(b.start_time).getTime() -
              new Date(a.start_time).getTime(),
          );
          const latest = sorted[0];
          aggregates.push({
            metric_type: metricType,
            date: day,
            value: Number(latest.value.toFixed(1)),
            unit: latest.unit || 'kg',
            count: dayRecords.length,
          });
          break;
        }

        case 'sleep': {

          const intervals = dayRecords
            .map(r => ({
              start: new Date(r.start_time).getTime(),
              end: new Date(r.end_time).getTime(),
            }))
            .sort((a, b) => a.start - b.start);

          const merged: { start: number; end: number }[] = [];
          for (const interval of intervals) {
            if (merged.length === 0) {
              merged.push({ ...interval });
            } else {
              const last = merged[merged.length - 1];
              if (interval.start <= last.end) {
                last.end = Math.max(last.end, interval.end);
              } else {
                merged.push({ ...interval });
              }
            }
          }

          const totalMs = merged.reduce(
            (acc, curr) => acc + (curr.end - curr.start),
            0,
          );
          const totalHours = totalMs / (1000 * 60 * 60);

          aggregates.push({
            metric_type: metricType,
            date: day,
            value: Number(totalHours.toFixed(1)),
            unit: 'hrs',
            count: dayRecords.length,
          });
          break;
        }
      }
    });

    return aggregates.sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const fitnessMetricsDao = new FitnessMetricsDao();
export default fitnessMetricsDao;
