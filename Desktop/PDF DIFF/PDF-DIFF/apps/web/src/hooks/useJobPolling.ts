/**
 * useJobPolling Hook
 * Manages job polling and results
 */

import { useContext } from 'react';
import { JobContext } from '../context/JobContext';

export function useJobPolling() {
  const context = useContext(JobContext);

  if (!context) {
    throw new Error('useJobPolling must be used within a JobProvider');
  }

  return {
    jobId: context.jobId,
    job: context.job,
    result: context.result,
    isPolling: context.isPolling,
    pollError: context.pollError,
    currentPageNumber: context.currentPageNumber,
    zoomLevel: context.zoomLevel,
    startPolling: context.startPolling,
    stopPolling: context.stopPolling,
    loadJobFromUrl: context.loadJobFromUrl,
    clearJob: context.clearJob,
    setCurrentPage: context.setCurrentPage,
    setZoomLevel: context.setZoomLevel,
  };
}
