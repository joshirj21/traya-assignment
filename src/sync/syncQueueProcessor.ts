import syncQueueDao, {
  SyncQueueDao,
} from '../database/repositories/syncQueueDao';
import mockNetworkClient, { MockNetworkClient } from '../lib/mockNetworkClient';
import { SyncQueueProcessorOptions, SyncQueueProcessResult } from './types';

export class SyncQueueProcessor {
  private queueDao: SyncQueueDao;
  private networkClient: MockNetworkClient;
  private isProcessing: boolean = false;
  private hasRecoveredOnStartup: boolean = false;
  private listeners = new Set<() => void>();

  constructor(
    queueDao: SyncQueueDao = syncQueueDao,
    networkClient: MockNetworkClient = mockNetworkClient,
  ) {
    this.queueDao = queueDao;
    this.networkClient = networkClient;
  }

  public async initialize(): Promise<void> {
    if (!this.hasRecoveredOnStartup) {
      const recovered = await this.queueDao.resetStuckSyncingItems();
      if (recovered > 0) {
        console.log(
          `Reset ${recovered} stuck syncing items to pending status.`,
        );
      }
      this.hasRecoveredOnStartup = true;
    }
  }

  public async processPendingQueue(
    options: SyncQueueProcessorOptions = {},
  ): Promise<SyncQueueProcessResult> {
    await this.initialize();

    if (this.isProcessing) {
      return { processedCount: 0, successCount: 0, failureCount: 0, items: [] };
    }

    this.isProcessing = true;
    const batchSize = options.batchSize ?? 20;
    const maxRetries = options.maxRetries ?? 5;

    const result: SyncQueueProcessResult = {
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
      items: [],
    };

    try {

      await this.queueDao.retryFailedItems(maxRetries);

      const pendingItems = await this.queueDao.getPendingItems(batchSize);
      if (pendingItems.length === 0) {
        return result;
      }

      const itemIds = pendingItems.map(item => item.id);
      await this.queueDao.markAsSyncing(itemIds);

      for (const item of pendingItems) {
        result.processedCount++;
        try {

          let payloadData: any;
          try {
            payloadData = JSON.parse(item.payload);
          } catch {
            payloadData = item.payload;
          }

          await this.networkClient.post(
            `/api/v1/sync/entities/${item.entity_type}`,
            {
              operation: item.operation,
              entityId: item.entity_id,
              data: payloadData,
              timestamp: new Date().toISOString(),
            },
            { success: true, entityId: item.entity_id },
            { idempotencyKey: item.id },
          );

          await this.queueDao.markAsCompleted(item.id);
          result.successCount++;
          result.items.push({ id: item.id, success: true });
        } catch (error: any) {
          result.failureCount++;
          const newRetryCount = item.retry_count + 1;
          const errorMsg = error?.message || 'Network sync error';

          console.warn(
            `SyncQueue item ${item.id} failed (attempt ${newRetryCount}):`,
            errorMsg,
          );

          await this.queueDao.markAsFailed(item.id, errorMsg, newRetryCount);
          result.items.push({ id: item.id, success: false, error: errorMsg });
        }
      }
    } catch (globalErr) {
      console.error('Unexpected error processing sync queue:', globalErr);
    } finally {
      this.isProcessing = false;
      this.listeners.forEach(listener => listener());
      this.queueDao
        .getPendingItems(1)
        .then(pending => {
          if (pending.length > 0) {
            setTimeout(() => {
              this.processPendingQueue(options).catch(error =>
                console.warn('Continuing queued sync work failed:', error),
              );
            }, 0);
          }
        })
        .catch(error => console.warn('Could not check remaining sync work:', error));
    }

    return result;
  }

  public getIsProcessing(): boolean {
    return this.isProcessing;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const syncQueueProcessor = new SyncQueueProcessor();
export default syncQueueProcessor;
