import { getJobStatus } from './api';
import { POLLING_CONFIG } from '../utils/constants';
import type { ComparisonJobStatusResponse } from '../types/api';
let pollingInterval: NodeJS.Timeout | null = null;
let pollingStartTime: number = 0;
export interface PollingCallbacks { onStatusUpdate?: (status: ComparisonJobStatusResponse) => void; onComplete?: (result: ComparisonJobStatusResponse) => void; onError?: (error: Error, retryCount: number) => void; }
function getPollingInterval(elapsedMinutes: number): number {
  if (elapsedMinutes > 10) return 10000;
  if (elapsedMinutes > 5) return 5000;
  return POLLING_CONFIG.initialIntervalMs;
}
export function startPolling(jobId: string, callbacks: PollingCallbacks): NodeJS.Timeout {
  let retryCount = 0;
  pollingStartTime = Date.now();
  const poll = async () => {
    try {
      const status = await getJobStatus(jobId);
      retryCount = 0;
      callbacks.onStatusUpdate?.(status);
      if (status.status === 'completed' || status.status === 'failed') {
        stopPolling();
        callbacks.onComplete?.(status);
      } else {
        const elapsedMinutes = (Date.now() - pollingStartTime) / 60000;
        const interval = getPollingInterval(elapsedMinutes);
        if (pollingInterval) clearInterval(pollingInterval);
        pollingInterval = setTimeout(poll, interval);
      }
    } catch (error) {
      retryCount++;
      if (retryCount > POLLING_CONFIG.maxRetries) {
        stopPolling();
        const err = error instanceof Error ? error : new Error('Polling failed');
        callbacks.onError?.(err, retryCount);
      } else {
        if (pollingInterval) clearInterval(pollingInterval);
        const retryDelay = Math.pow(2, retryCount) * 1000;
        pollingInterval = setTimeout(poll, retryDelay);
        callbacks.onError?.(error instanceof Error ? error : new Error('Polling failed'), retryCount);
      }
    }
  };
  poll();
  return pollingInterval as NodeJS.Timeout;
}
export function stopPolling(): void { if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; } pollingStartTime = 0; }
