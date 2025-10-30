import type { JobStatus } from './api';
export interface UploadedFile { id: string; name: string; size: number; type: string; file: File; progress: number; error?: string; uploadedAt?: Date; }
export interface ComparisonJob { id: string; status: JobStatus; createdAt: Date; updatedAt: Date; result?: ComparisonResult; errorMessage?: string; }
export interface DifferenceHighlight { id: string; type: 'addition' | 'deletion' | 'modification'; location: { x: number; y: number; width: number; height: number; }; color: string; zIndex: number; }
export interface Page { number: number; additions: DifferenceHighlight[]; deletions: DifferenceHighlight[]; modifications: DifferenceHighlight[]; }
export interface ComparisonResult { jobId: string; totalDifferences: number; changesCount?: number; pagesAffected: number; pages: Page[]; generatedAt: Date; }
export interface UIState { uploadError?: string; selectedFiles: UploadedFile[]; uploadInProgress: boolean; cancelledByUser: boolean; currentPageNumber: number; zoomLevel: number; highlightColor: { additions: string; deletions: string; modifications: string; }; isPolling: boolean; pollError?: string; lastPolledAt: Date; pollRetryCount: number; }
