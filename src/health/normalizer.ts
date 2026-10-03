

import { HealthSample, METRIC_DEFAULT_UNITS } from '../mockHealthKit/types';
import { NormalizedHealthRecord } from './types';

export const generateSyncHash = (sample: {
  source: string;
  metricType: string;
  startTime: string;
  endTime: string;
  value: number;
}): string => {
  const rawKey = `${sample.source || 'healthkit'}_${sample.metricType}_${
    sample.startTime
  }_${sample.endTime}_${sample.value}`;

  let hash = 0;
  for (let i = 0; i < rawKey.length; i++) {
    const char = rawKey.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;                            
  }
  return `sync_${Math.abs(hash).toString(16)}_${Date.parse(sample.startTime)}`;
};

export const normalizeHealthSample = (
  sample: HealthSample,
): NormalizedHealthRecord => {
  const startIso = new Date(sample.startTime).toISOString();
  const endIso = new Date(sample.endTime).toISOString();

  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  const durationSeconds =
    endMs >= startMs ? Math.round((endMs - startMs) / 1000) : 0;

  const rawUnit = (sample.unit || METRIC_DEFAULT_UNITS[sample.metricType])
    .trim()
    .toLowerCase();
  let value = sample.value;
  let unit = sample.unit || METRIC_DEFAULT_UNITS[sample.metricType];

  if (sample.metricType === 'weight') {
    if (['lb', 'lbs', 'pound', 'pounds'].includes(rawUnit)) {
      value *= 0.45359237;
    }
    unit = 'kg';
  } else if (sample.metricType === 'water') {
    if (['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'].includes(rawUnit)) {
      value /= 1000;
    }
    unit = 'L';
  }

  const normalizedValue = Math.round(value * 100) / 100;
  const source = sample.source || 'mock_healthkit';

  const syncHash = generateSyncHash({
    source,
    metricType: sample.metricType,
    startTime: startIso,
    endTime: endIso,
    value: normalizedValue,
  });

  return {
    id: sample.id || syncHash,
    syncHash,
    metricType: sample.metricType,
    value: normalizedValue,
    unit,
    startTime: startIso,
    endTime: endIso,
    durationSeconds,
    source,
    normalizedAt: new Date().toISOString(),
    ...(sample.metadata ? { metadata: sample.metadata } : {}),
  };
};

export const normalizeHealthSamples = (
  samples: HealthSample[],
): NormalizedHealthRecord[] => {
  const seenHashes = new Set<string>();
  const normalized: NormalizedHealthRecord[] = [];

  for (const sample of samples) {
    const record = normalizeHealthSample(sample);
    if (!seenHashes.has(record.syncHash)) {
      seenHashes.add(record.syncHash);
      normalized.push(record);
    }
  }

  return normalized.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
};
