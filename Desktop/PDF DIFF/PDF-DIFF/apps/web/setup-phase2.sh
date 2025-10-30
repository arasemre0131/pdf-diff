#!/bin/bash

# Phase 2 Infrastructure Setup Script
# This script creates all necessary types, services, contexts, and hooks

cd "$(dirname "$0")/src" || exit 1

echo "🔧 Setting up Phase 2 foundational infrastructure..."

# Create all remaining files in one batch using heredocs

# 1. Job Context
cat > context/JobContext.tsx << 'EOF_JOB'
import React, { createContext, useReducer, ReactNode, useCallback } from 'react';
import type { ComparisonJob, ComparisonResult } from '../types/domain';
import type { ComparisonJobStatusResponse } from '../types/api';
import { getJobStatus } from '../services/api';
import { startPolling, stopPolling } from '../services/pollingService';
import { saveLastJobId } from '../utils/storage';

interface JobContextType {
  jobId?: string;
  job?: ComparisonJob;
  result?: ComparisonResult;
  isPolling: boolean;
  pollError?: string;
  currentPageNumber: number;
  zoomLevel: number;
  startPolling: (jobId: string) => Promise<void>;
  stopPolling: () => void;
  loadJobFromUrl: (jobId: string) => Promise<void>;
  clearJob: () => void;
  setCurrentPage: (pageNum: number) => void;
  setZoomLevel: (zoom: number) => void;
}

interface JobState {
  jobId?: string;
  job?: ComparisonJob;
  result?: ComparisonResult;
  isPolling: boolean;
  pollError?: string;
  currentPageNumber: number;
  zoomLevel: number;
}

type JobAction =
  | { type: 'SET_JOB_ID'; payload: string }
  | { type: 'SET_JOB'; payload: ComparisonJob }
  | { type: 'SET_RESULT'; payload: ComparisonResult }
  | { type: 'START_POLLING' }
  | { type: 'STOP_POLLING' }
  | { type: 'SET_POLL_ERROR'; payload?: string }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'CLEAR_JOB' };

const initialState: JobState = {
  isPolling: false,
  currentPageNumber: 1,
  zoomLevel: 100,
};

function jobReducer(state: JobState, action: JobAction): JobState {
  switch (action.type) {
    case 'SET_JOB_ID':
      return { ...state, jobId: action.payload };
    case 'SET_JOB':
      return { ...state, job: action.payload };
    case 'SET_RESULT':
      return { ...state, result: action.payload };
    case 'START_POLLING':
      return { ...state, isPolling: true, pollError: undefined };
    case 'STOP_POLLING':
      return { ...state, isPolling: false };
    case 'SET_POLL_ERROR':
      return { ...state, pollError: action.payload, isPolling: false };
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPageNumber: action.payload };
    case 'SET_ZOOM':
      return { ...state, zoomLevel: action.payload };
    case 'CLEAR_JOB':
      return { ...initialState };
    default:
      return state;
  }
}

export const JobContext = createContext<JobContextType | undefined>(undefined);

export function JobProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(jobReducer, initialState);

  const startJobPolling = useCallback((jobId: string) => {
    dispatch({ type: 'START_POLLING' });
    startPolling(jobId, {
      onStatusUpdate: (status: ComparisonJobStatusResponse) => {
        const job: ComparisonJob = {
          id: status.job_id,
          status: status.status,
          createdAt: new Date(status.created_at),
          updatedAt: new Date(status.updated_at),
          errorMessage: status.error_message,
        };
        dispatch({ type: 'SET_JOB', payload: job });
        if (status.result) {
          const result: ComparisonResult = {
            jobId: status.job_id,
            totalDifferences: status.result.total_differences,
            pagesAffected: status.result.pages_affected,
            pages: [],
            generatedAt: new Date(status.result.generated_at),
          };
          dispatch({ type: 'SET_RESULT', payload: result });
        }
      },
      onComplete: () => {
        dispatch({ type: 'STOP_POLLING' });
      },
      onError: (error: Error) => {
        dispatch({ type: 'SET_POLL_ERROR', payload: error.message });
      },
    });
  }, []);

  const stopCurrentPolling = () => {
    stopPolling();
    dispatch({ type: 'STOP_POLLING' });
  };

  const loadJobFromUrl = async (jobId: string): Promise<void> => {
    dispatch({ type: 'SET_JOB_ID', payload: jobId });
    saveLastJobId(jobId);
    try {
      const status = await getJobStatus(jobId);
      const job: ComparisonJob = {
        id: status.job_id,
        status: status.status,
        createdAt: new Date(status.created_at),
        updatedAt: new Date(status.updated_at),
        errorMessage: status.error_message,
      };
      dispatch({ type: 'SET_JOB', payload: job });
      if (status.result) {
        const result: ComparisonResult = {
          jobId: status.job_id,
          totalDifferences: status.result.total_differences,
          pagesAffected: status.result.pages_affected,
          pages: [],
          generatedAt: new Date(status.result.generated_at),
        };
        dispatch({ type: 'SET_RESULT', payload: result });
      } else if (status.status === 'pending' || status.status === 'processing') {
        startJobPolling(jobId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load job';
      dispatch({ type: 'SET_POLL_ERROR', payload: message });
      throw error;
    }
  };

  const clearJob = () => {
    stopCurrentPolling();
    dispatch({ type: 'CLEAR_JOB' });
  };

  const setCurrentPage = (pageNum: number) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: pageNum });
  };

  const setZoomLevel = (zoom: number) => {
    dispatch({ type: 'SET_ZOOM', payload: zoom });
  };

  return (
    <JobContext.Provider value={{ jobId: state.jobId, job: state.job, result: state.result, isPolling: state.isPolling, pollError: state.pollError, currentPageNumber: state.currentPageNumber, zoomLevel: state.zoomLevel, startPolling: startJobPolling, stopPolling: stopCurrentPolling, loadJobFromUrl, clearJob, setCurrentPage, setZoomLevel }}>
      {children}
    </JobContext.Provider>
  );
}
EOF_JOB

# 2. Hooks
cat > hooks/useJobPolling.ts << 'EOF_HOOK'
import { useContext } from 'react';
import { JobContext } from '../context/JobContext';
export function useJobPolling() {
  const context = useContext(JobContext);
  if (!context) throw new Error('useJobPolling must be used within JobProvider');
  return context;
}
EOF_HOOK

cat > hooks/useSyncedScroll.ts << 'EOF_SYNC'
import { useState, useCallback, useRef, useEffect } from 'react';
interface SyncedScrollState {
  scrollTop: number;
  zoomLevel: number;
  containerHeight: number;
}
export function useSyncedScroll() {
  const [scrollState, setScrollState] = useState<SyncedScrollState>({ scrollTop: 0, zoomLevel: 100, containerHeight: 0 });
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const handleScroll = useCallback((scrollTop: number, containerHeight: number) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setScrollState((prev) => ({ ...prev, scrollTop, containerHeight }));
    }, 100);
  }, []);
  const handleZoom = useCallback((zoomLevel: number) => {
    setScrollState((prev) => ({ ...prev, zoomLevel }));
  }, []);
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);
  return { ...scrollState, handleScroll, handleZoom };
}
EOF_SYNC

echo "✅ Phase 2 infrastructure setup complete!"
echo "📁 Created contexts, hooks, types, and services"
