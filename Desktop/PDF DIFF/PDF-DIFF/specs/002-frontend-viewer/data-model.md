# Phase 1: Data Model & Domain Design

**Date**: 2025-10-29
**Status**: Complete
**Purpose**: Define data structures, domain entities, and state management model

## Domain Entities

### 1. ComparisonJob

**Purpose**: Represents a PDF comparison task across its lifecycle

**Fields**:
```typescript
{
  id: string;                    // Unique identifier (UUID from backend)
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;              // When job was created
  completedAt?: Date;           // When job finished (completed/failed)
  errorMessage?: string;        // Error details if status='failed'
  resultUrl?: string;           // S3/MinIO URL to result data
}
```

**Relationships**:
- Has-one UploadedFile pair (before upload)
- Has-one ComparisonResult (after completion)
- Owned by browser session (no persistence)

**State Transitions**:
```
pending → processing → completed
          ↓
         failed
```

**Validation**:
- `id`: Non-empty string, UUID format
- `status`: Must be one of allowed values
- `createdAt`: Valid ISO timestamp
- `errorMessage`: Present only when status='failed'

**Usage Context**:
- Created when files are uploaded
- Persisted in URL for bookmarking/sharing
- Polled until completion
- Displayed in results page

---

### 2. UploadedFile

**Purpose**: Represents a file selected by user for upload

**Fields**:
```typescript
{
  id: string;                  // Internal ID for UI tracking
  name: string;               // Original filename
  size: number;               // File size in bytes
  type: string;              // MIME type (should be 'application/pdf')
  file: File;                // HTML5 File object (for upload)
  progress: number;          // Upload progress 0-100
  error?: string;           // Validation error if any
  uploadedAt?: Date;        // When upload completed
}
```

**Validation Rules**:
- `name`: Non-empty, no path characters
- `size`: > 0 and < 50MB (52,428,800 bytes)
- `type`: Must be 'application/pdf'
- `progress`: 0 ≤ progress ≤ 100
- No duplicate files (by name + size combination)

**State Machine**:
```
pending (selected)
  ↓
validating
  ↓
uploading (0-100% progress)
  ↓
uploaded
```

**Error States**:
- InvalidSize: File > 50MB
- InvalidType: Not a PDF
- Duplicate: Same file already selected
- Network: Upload failed, user can retry

**Usage Context**:
- Selected by user via drag-drop or file picker
- Validated before upload starts
- Progress tracked during upload
- Persisted in UploadContext

---

### 3. ComparisonResult

**Purpose**: Represents the output of a completed PDF comparison

**Fields**:
```typescript
{
  jobId: string;                        // Reference to ComparisonJob
  totalDifferences: number;            // Sum of all differences
  pagesWithChanges: number[];          // Array of affected page numbers
  differencesByPage: {
    [pageNumber: number]: {
      additions: DifferenceDetail[];
      deletions: DifferenceDetail[];
      modifications: DifferenceDetail[];
    }
  };
  generatedAt: Date;
}
```

**Nested Type: DifferenceDetail**:
```typescript
{
  id: string;                 // Unique ID within page
  type: 'addition' | 'deletion' | 'modification';
  location: {
    x: number;               // Canvas X coordinate
    y: number;               // Canvas Y coordinate
    width: number;
    height: number;
  };
  content?: string;          // Text content if applicable
  pageNumber: number;
  confidence?: number;       // 0-100 confidence score (if applicable)
}
```

**Validation**:
- `totalDifferences`: >= 0
- `pagesWithChanges`: Sorted array of valid page numbers
- `differencesByPage`: Keys must be valid page numbers
- Each DifferenceDetail must have valid location coordinates

**State**:
- Immutable after creation
- Cached in JobContext after fetch
- Used to render highlighting overlays

**Usage Context**:
- Fetched from `/api/v1/compare/{job_id}` when job completes
- Drives rendering of DifferenceHighlight component
- Powers page navigation ("next difference" feature)
- Exported in reports (P3 feature)

---

### 4. UIState

**Purpose**: Manages component-level UI state (not domain entities)

**Fields**:
```typescript
{
  // Upload page
  uploadError?: string;            // Current upload error message
  selectedFiles: UploadedFile[];  // Currently selected files
  uploadInProgress: boolean;       // Is upload happening?
  cancelledByUser: boolean;       // Did user cancel upload?

  // Results page
  currentPageNumber: number;       // 1-indexed page number in both PDFs
  zoomLevel: number;              // Zoom percentage (100 = 100%)
  highlightColor: {
    additions: string;    // CSS color
    deletions: string;
    modifications: string;
  };

  // Polling
  isPolling: boolean;
  pollError?: string;
  lastPolledAt: Date;
  pollRetryCount: number;
}
```

**Defaults**:
```typescript
{
  uploadError: undefined,
  selectedFiles: [],
  uploadInProgress: false,
  cancelledByUser: false,
  currentPageNumber: 1,
  zoomLevel: 100,
  highlightColor: {
    additions: '#22c55e',      // Green
    deletions: '#ef4444',      // Red
    modifications: '#eab308'   // Yellow
  },
  isPolling: false,
  pollError: undefined,
  lastPolledAt: new Date(),
  pollRetryCount: 0
}
```

**Usage**:
- Stored in React Context (UploadContext, JobContext)
- Updated by event handlers and effects
- Drives conditional rendering (error messages, loading states)

---

## Context Structure

### UploadContext

**Purpose**: Manages file selection and upload state

**Shape**:
```typescript
{
  // State
  files: UploadedFile[];
  isUploading: boolean;
  uploadProgress: number;      // Average of all files
  error?: string;

  // Actions
  selectFiles: (fileList: FileList) => void;
  removeFile: (fileId: string) => void;
  clearAllFiles: () => void;
  submitUpload: () => Promise<string>;  // Returns job_id
  cancelUpload: () => void;
}
```

**Lifecycle**:
1. User selects files → selectFiles() called
2. Files validated → errors shown if invalid
3. User clicks upload → submitUpload() called
4. Files uploaded with progress tracking
5. Success → navigate to results page with job_id
6. Error → show error message, allow retry or file selection

---

### JobContext

**Purpose**: Manages comparison job lifecycle and polling

**Shape**:
```typescript
{
  // State
  jobId?: string;
  job?: ComparisonJob;
  result?: ComparisonResult;
  isPolling: boolean;
  pollError?: string;

  // Actions
  startPolling: (jobId: string) => void;
  stopPolling: () => void;
  loadJobFromUrl: (jobId: string) => Promise<void>;
  clearJob: () => void;
}
```

**Lifecycle**:
1. UploadPage submits → passes job_id to ResultsPage
2. ResultsPage calls loadJobFromUrl(job_id)
3. If job not found → show 404 page
4. If job pending/processing → startPolling()
5. Polling interval triggers API request every 3 seconds
6. On completion → update result, render viewer
7. User navigates away → stopPolling() called

---

## Type Definitions

### API Request/Response Types

```typescript
// File Upload Request
FormData {
  file1: File;    // First PDF
  file2: File;    // Second PDF
}

// File Upload Response
UploadResponse {
  job_id: string;
  status: 'pending' | 'processing';
}

// Job Status Request
GET /api/v1/compare/{job_id}

// Job Status Response
JobStatusResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: {
    total_differences: number;
    pages_with_changes: number[];
    differences: Array<{
      page: number;
      type: 'addition' | 'deletion' | 'modification';
      location: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
  };
  error_message?: string;
}

// Error Response
ErrorResponse {
  error: string;
  details?: string;
  code?: string;
}
```

---

## Storage & Persistence

### Browser LocalStorage Schema

**Key**: `pdf-comparison:upload-state`
**Value**: Serialized UploadFormState (when user hasn't submitted)

```typescript
UploadFormState {
  fileNames: string[];       // Just names, not full File objects (not serializable)
  fileSizes: number[];
  timestamp: Date;
}
```

**Cleared on**:
- Upload success
- Manual "clear files" action
- User closes tab
- 24 hours (expiration check)

**Key**: `pdf-comparison:last-job-id`
**Value**: String with UUID

**Usage**: Quick access to last comparison for "View Previous" feature

---

## State Constraints & Rules

### File Count Validation
- Must have exactly 2 files
- Validate before upload button enabled
- Error if user tries to upload with ≠2 files

### File Size Validation
- Each file < 50MB
- Total < 100MB (not checked by frontend, but mentioned in error)
- Provide feedback immediately on selection

### PDF Type Validation
- Check MIME type: application/pdf
- Check file extension as fallback
- Show clear error if invalid type

### Job Lifecycle Rules
- Once job_id generated, cannot be changed during this session
- Polling must stop on navigation away
- Never re-upload same files for same job
- Allow polling from different browser/device using job_id URL

### Comparison Status Rules
- Status never goes backward (pending → processing → completed)
- Failed status is terminal (cannot resume, must start new job)
- Processing timeout > 10 minutes: warn user, suggest saving job_id

---

## Error Handling Model

### File Validation Errors
- **FileNotSelected**: Show instruction to select file
- **InvalidFileType**: "Only PDF files are supported"
- **FileTooLarge**: "File exceeds 50MB limit"
- **DuplicateFile**: "This file is already selected"
- **ExactlyTwoFilesRequired**: "Please select exactly 2 PDF files"

### Upload Errors
- **NetworkError**: "Network error. Check connection and retry."
- **ServerError**: "Server error. Please try again later."
- **UploadCancelled**: "Upload was cancelled. Select files to try again."

### Job Status Errors
- **JobNotFound**: "Comparison job not found. Start a new comparison."
- **JobFailed**: "Comparison failed: [error reason from server]"
- **PollingTimeout**: "Comparison is taking longer than expected. Job ID: [id]"
- **PollingError**: "Failed to check status. Retrying... (3/3 retries)"

---

## Summary

The data model defines:
- **3 domain entities**: ComparisonJob, UploadedFile, ComparisonResult
- **2 contexts**: UploadContext (file selection/upload), JobContext (polling/viewing)
- **UI state**: Component-level state for errors, progress, display settings
- **Type safety**: TypeScript interfaces for all API contracts
- **Storage**: LocalStorage for temporary form state and last job ID
- **Error handling**: Specific error types for each failure scenario

This structure ensures:
- Clear separation of concerns (domain vs UI state)
- Type-safe communication with backend
- Predictable state transitions
- Graceful error recovery
- Responsive user feedback
