import { SyncQueueEntity } from '../database/types';

export interface SyncQueueProcessResult {
  processedCount: number;
  successCount: number;
  failureCount: number;
  items: Array<{
    id: string;
    success: boolean;
    error?: string;
  }>;
}

export interface SyncQueueProcessorOptions {
  batchSize?: number;
  maxRetries?: number;
}
