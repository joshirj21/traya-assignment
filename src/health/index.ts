

import healthSyncManager, {
  HealthSyncManager,
  ALL_SYNC_METRICS,
} from './HealthSyncManager';
import metricsAggregator, { MetricsAggregator } from './metricsAggregator';

export * from './types';
export * from './normalizer';
export * from './metricsAggregator';
export {
  HealthSyncManager,
  healthSyncManager,
  ALL_SYNC_METRICS,
  metricsAggregator,
  MetricsAggregator,
};

export default healthSyncManager;
