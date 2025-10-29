/**
 * API Contract Definitions
 *
 * This file defines the TypeScript interfaces for all frontend-backend communication.
 * These are derived from the backend API specification and ensure type safety.
 */

// ============================================================================
// REQUEST TYPES
// ============================================================================

/**
 * POST /api/v1/upload
 *
 * Upload two PDF files for comparison
 * Content-Type: multipart/form-data
 *
 * Fields:
 *   - file1: File (PDF document)
 *   - file2: File (PDF document)
 */
export interface UploadRequest {
  // Sent as FormData in client
  // file1: File;
  // file2: File;
  // No explicit TS interface needed; use FormData directly
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

/**
 * POST /api/v1/upload - Success Response
 *
 * HTTP 201 Created
 */
export interface UploadSuccessResponse {
  job_id: string;              // Unique job identifier (UUID)
  status: 'pending';           // Job starts in pending state
  created_at: string;          // ISO 8601 timestamp
}

/**
 * GET /api/v1/compare/{job_id}
 *
 * Poll for comparison job status and results
 */
export interface ComparisonJobStatusResponse {
  job_id: string;
  status: JobStatus;
  created_at: string;         // ISO 8601 timestamp
  updated_at: string;         // ISO 8601 timestamp
  result?: ComparisonResultData;
  error_message?: string;     // Present when status = 'failed'
}

/**
 * Job status lifecycle values
 */
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Comparison result data (present when status = 'completed')
 */
export interface ComparisonResultData {
  total_differences: number;
  pages_affected: number;
  differences_by_page: {
    [pageNumber: number]: PageDifferences;
  };
  generated_at: string;       // ISO 8601 timestamp
}

/**
 * Differences on a single page
 */
export interface PageDifferences {
  page_number: number;
  additions: Difference[];
  deletions: Difference[];
  modifications: Difference[];
  total_on_page: number;
}

/**
 * Individual difference location and metadata
 */
export interface Difference {
  id: string;
  type: 'addition' | 'deletion' | 'modification';
  location: DifferenceLocation;
  content?: string;           // Text content if applicable (additions/deletions)
  confidence?: number;        // 0-100 confidence score
}

/**
 * Canvas coordinates for highlighting difference
 *
 * Coordinates are relative to the PDF page in rendering space (post-zoom)
 */
export interface DifferenceLocation {
  x: number;                  // Left position in points
  y: number;                  // Top position in points
  width: number;              // Width in points
  height: number;             // Height in points
}

// ============================================================================
// ERROR RESPONSES
// ============================================================================

/**
 * Error response for all endpoints
 *
 * HTTP 4xx or 5xx status codes
 */
export interface ErrorResponse {
  error: string;              // Error type/code
  message: string;            // Human-readable description
  details?: Record<string, any>;  // Additional error context
  timestamp?: string;         // ISO 8601 timestamp
}

/**
 * Specific error codes the frontend should handle
 */
export enum ErrorCode {
  // 400 Bad Request
  InvalidFile = 'INVALID_FILE',
  FileTooLarge = 'FILE_TOO_LARGE',
  UnsupportedFormat = 'UNSUPPORTED_FORMAT',
  MissingFiles = 'MISSING_FILES',

  // 404 Not Found
  JobNotFound = 'JOB_NOT_FOUND',

  // 409 Conflict
  InvalidJobStatus = 'INVALID_JOB_STATUS',

  // 413 Payload Too Large
  PayloadTooLarge = 'PAYLOAD_TOO_LARGE',

  // 500 Server Error
  ComparisonFailed = 'COMPARISON_FAILED',
  InternalError = 'INTERNAL_ERROR',

  // Network errors (frontend)
  NetworkError = 'NETWORK_ERROR',
  RequestTimeout = 'REQUEST_TIMEOUT',
  AbortedByUser = 'ABORTED_BY_USER',
}

// ============================================================================
// FRONTEND WRAPPER TYPES
// ============================================================================

/**
 * Internal representation of an upload result
 * Wraps API response with additional frontend metadata
 */
export interface UploadResult {
  jobId: string;
  status: JobStatus;
  createdAt: Date;
}

/**
 * Internal representation of comparison result
 * Wraps API response with additional frontend metadata
 */
export interface ComparisonJob {
  id: string;
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
  result?: ComparisonResult;
  errorMessage?: string;
}

/**
 * Frontend-friendly comparison result
 * Transforms API response for rendering
 */
export interface ComparisonResult {
  jobId: string;
  totalDifferences: number;
  pagesAffected: number;
  pages: Page[];
  generatedAt: Date;
}

/**
 * Single page from comparison result
 * Combines API data with rendering-friendly structure
 */
export interface Page {
  number: number;
  additions: DifferenceHighlight[];
  deletions: DifferenceHighlight[];
  modifications: DifferenceHighlight[];
}

/**
 * Difference ready for rendering
 * Includes styling information
 */
export interface DifferenceHighlight {
  id: string;
  type: 'addition' | 'deletion' | 'modification';
  location: DifferenceLocation;
  color: string;             // CSS color (determined by type)
  zIndex: number;            // For layering
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Color mapping for difference types
 * Used by frontend for highlighting
 */
export const DIFFERENCE_COLORS = {
  addition: '#22c55e',        // Green
  deletion: '#ef4444',        // Red
  modification: '#eab308',    // Yellow
} as const;

/**
 * API endpoints base path
 */
export const API_BASE_PATH = '/api/v1';

/**
 * File upload constraints
 */
export const FILE_CONSTRAINTS = {
  maxSizeBytes: 50 * 1024 * 1024,    // 50MB
  maxSizeMB: 50,
  acceptedMimeTypes: ['application/pdf'],
  acceptedExtensions: ['.pdf'],
} as const;

/**
 * Polling configuration
 */
export const POLLING_CONFIG = {
  initialIntervalMs: 3000,           // 3 seconds
  maxIntervalMs: 60000,              // 60 seconds
  exponentialBackoffMinutes: [5, 10], // Increase interval after these minutes
  maxRetries: 3,
  timeoutMs: 30000,                  // Request timeout
} as const;

/**
 * UI timeout thresholds
 */
export const TIMEOUT_THRESHOLDS = {
  longProcessingMinutes: 10,         // Warn after 10 minutes
  veryLongProcessingMinutes: 30,    // Very long after 30 minutes
} as const;
