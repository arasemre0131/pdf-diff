# Phase 0: Research & Decisions - PDF Comparison Frontend

**Date**: 2025-10-29
**Status**: Complete
**Purpose**: Resolve technical unknowns and document design decisions for frontend implementation

## Research Findings

### 1. Frontend Framework & Build Tool

**Decision**: React 18 + TypeScript + Vite

**Rationale**:
- React provides component-based architecture for reusable UI (FileUploadArea, PDFViewer, DifferenceHighlight)
- TypeScript ensures type safety for API contracts and reduces runtime errors
- Vite offers fast development experience and optimized production builds
- React Router handles SPA navigation between Upload and Results pages

**Alternatives Considered**:
- Next.js: Overly complex for client-side only SPA; better for server-side rendering/API routes
- Vue.js: Equally capable but smaller ecosystem for PDF manipulation libraries
- Plain JavaScript: No type safety; difficult to maintain complex state management

**Technologies**:
- react@18.x
- typescript@5.x
- vite@5.x
- react-router@6.x

---

### 2. PDF Rendering Library

**Decision**: pdfjs-dist (Mozilla's PDF.js)

**Rationale**:
- Industry standard for client-side PDF rendering
- Supports highlighting and custom rendering over PDF content
- Excellent browser compatibility including mobile
- Large community and extensive documentation
- Handles encrypted PDFs (future enhancement)

**Alternatives Considered**:
- react-pdf: Wrapper around pdfjs-dist; adds unnecessary abstraction
- PDF-Lib: Better for PDF generation, not viewing
- Chromium Embedded Framework: Server-side only; not applicable

**Dependencies**:
- pdfjs-dist@4.x
- @react-pdf/renderer (for export reports, P3 feature)

---

### 3. State Management

**Decision**: React Context API + Custom Hooks

**Rationale**:
- No need for Redux/Zustand in MVP scope (only 2 main pages)
- Context API sufficient for sharing:
  - Upload state (selected files, progress, error)
  - Job state (job_id, status, polling state)
- Custom hooks (useFileUpload, useJobPolling) encapsulate complex logic
- Easy to migrate to Redux later if needed

**Structure**:
- `UploadContext`: Manages file selection and upload progress
- `JobContext`: Manages comparison job lifecycle and polling
- Hooks: Encapsulate context logic and side effects

**Alternatives Considered**:
- Redux: Overkill for MVP; complexity not justified
- MobX: Different paradigm; less familiar to most teams
- useState/useReducer everywhere: Props drilling becomes problematic

---

### 4. HTTP Client & API Communication

**Decision**: Axios with custom API service layer

**Rationale**:
- Axios handles multipart/form-data uploads natively (required for file upload)
- Custom `api.ts` service layer provides:
  - Request/response interceptors for error handling
  - Base URL configuration for different environments
  - Type-safe API calls with TypeScript
  - Cancel token support for aborting uploads
- Axios has built-in upload progress tracking

**API Endpoints**:
```
POST /api/v1/upload          - Upload two PDFs
GET  /api/v1/compare/{job_id} - Get comparison results
```

**Alternatives Considered**:
- Fetch API: Requires more boilerplate for upload progress and error handling
- GraphQL: Unnecessary for simple REST endpoints
- RTK Query: Adds Redux dependency; not worth it for MVP

**Dependencies**:
- axios@1.6.x
- axios-retry@2.x (automatic retry on network errors)

---

### 5. PDF Difference Highlighting & Rendering

**Decision**: Canvas-based overlay for highlighting differences

**Rationale**:
- Backend API returns difference metadata (locations, types)
- Frontend renders PDF with pdfjs-dist
- Overlay canvas draws rectangles/shapes over differences
- Color coding: Green (additions), Red (deletions), Yellow (modifications)
- Efficient rendering; doesn't modify original PDF

**Implementation Details**:
- DifferenceHighlight component wraps PDFViewer
- Maintains canvas layer synchronized with PDF canvas
- Responsive to zoom and scroll events

**Alternatives Considered**:
- Embed highlights in PDF server-side: Inflexible; can't change highlighting style
- SVG overlay: Same approach as canvas; canvas simpler
- PDF annotation layer: Complex; limited browser support

---

### 6. Synchronized Scrolling & Zoom

**Decision**: Custom React hook (useSyncedScroll) with shared state

**Rationale**:
- Two PDFs rendered side-by-side must maintain synchronization
- Tracking:
  - Scroll position (Y-axis, page number)
  - Zoom level (percentage)
- Single source of truth in shared context
- Debounced scroll events to prevent excessive re-renders

**Implementation**:
- useSyncedScroll hook manages scroll/zoom state
- MutationObserver watches PDF canvas dimensions
- IntersectionObserver tracks visible page changes
- Debounce (100ms) on scroll events for performance

**Alternatives Considered**:
- CSS Grid with overflow sync: Limited control; can't sync zoom
- Iframe approach: Isolated; can't easily communicate state
- Separate instances: Complex to keep synchronized

---

### 7. File Upload & Validation

**Decision**: Client-side validation + Server-side validation

**Rationale**:
- Client-side (fileValidator.ts):
  - Check exactly 2 files selected
  - Verify PDF mime type (application/pdf)
  - Check file size (max 50MB)
  - Preview filenames before upload
- Server-side: Backend validates again for security
- Feedback before transmission saves bandwidth and time

**Validation Rules**:
```typescript
- File count: exactly 2
- File type: application/pdf only
- File size: each <50MB
- No duplicate files by name
```

**Alternatives Considered**:
- Server-side only: Poor UX; users wait to get feedback
- Client-side only: Security risk; can be bypassed

---

### 8. Upload Progress & Cancellation

**Decision**: Axios with abort controller and progress tracking

**Rationale**:
- Axios provides native upload progress events
- AbortController allows cancelling in-flight requests
- Upload manager handles:
  - Progress callbacks for UI updates
  - Pause/resume (pause only; browsers don't support true resume)
  - Error recovery with retry logic

**API Events**:
- onUploadProgress: Emits progress percentage
- onCancelled: Triggered by user action
- onError: Network or server errors

**Alternatives Considered**:
- XMLHttpRequest: Lower-level; more boilerplate
- WebWorkers: Unnecessary complexity
- Chunked upload: Not needed for 50MB limit

---

### 9. Job Status Polling

**Decision**: Interval-based polling with exponential backoff

**Rationale**:
- Poll `/api/v1/compare/{job_id}` every 3 seconds (per spec)
- Exponential backoff: if job takes >5 min, increase interval to 5s, then 10s
- Prevent overwhelming server if comparison takes very long
- Stop polling when job completes or fails
- Clean up interval on component unmount

**Polling Logic**:
```
Initial: 3 seconds
After 5 minutes: 5 seconds
After 10 minutes: 10 seconds
Max: 60 seconds
```

**Alternatives Considered**:
- WebSocket: Real-time; overkill for comparison time-scale
- Server-Sent Events: Simpler than WebSocket; but polling sufficient for MVP
- Long-polling: Similar complexity to polling; polling simpler

---

### 10. Responsive Design Strategy

**Decision**: Mobile-first with TailwindCSS + CSS Grid

**Rationale**:
- TailwindCSS provides utility classes for responsive design
- Mobile-first approach ensures works on 320px screens first
- CSS Grid for layout:
  - Upload page: Single column on mobile, full width on desktop
  - Results page: Stacked PDFs on mobile, side-by-side on desktop (min-width: 1024px)
- Breakpoints align with spec requirements (320px - 2560px)

**Responsive Breakpoints**:
```
sm:  640px   (tablets)
md:  768px   (tablets, small laptops)
lg:  1024px  (split view for side-by-side)
xl:  1280px  (standard desktop)
2xl: 1536px  (large desktop)
4xl: 2560px+ (ultra-wide)
```

**Alternatives Considered**:
- Bootstrap: Works; less flexible than Tailwind for custom sizing
- CSS Modules: Verbose; Tailwind more maintainable
- Manual media queries: Error-prone; hard to maintain

---

### 11. Error Handling & User Feedback

**Decision**: Error Boundary + Try-catch in async operations

**Rationale**:
- Error Boundary component catches rendering errors
- Try-catch in services catches API/processing errors
- Error types:
  - Validation errors: Show in form (clear, actionable)
  - Network errors: Show retry option
  - API errors: Show error message from server
  - Upload errors: Allow resume/retry
  - Comparison failed: Show error reason, option to restart

**Error Recovery**:
- File validation error → Stay on upload page
- Network error → Show retry button
- Comparison timeout → Offer to save job ID
- Job not found (404) → Link back to upload page

**Alternatives Considered**:
- Silent failures: Poor UX; users confused
- Single error modal: Can't handle multiple error types
- Global error store: Unnecessary; local state sufficient

---

### 12. Testing Strategy

**Decision**: Vitest (unit) + React Testing Library (components) + Playwright (E2E)

**Rationale**:
- Vitest: Fast unit test runner, works with Vite
- React Testing Library: Tests components like users (not implementation details)
- Playwright: Browser automation for E2E tests across Chrome, Firefox, Safari

**Test Coverage**:
- Unit: Services (fileValidator, api, pollingService) - 80%+ coverage
- Integration: Page components, context providers - key flows
- E2E: Complete user journeys (upload → poll → view → export)

**Alternatives Considered**:
- Jest: Slower; doesn't play well with Vite
- Cypress: Good; Playwright more modern, better multi-browser support
- Manual testing only: Not scalable; regression risk

---

### 13. Local State Persistence

**Decision**: Browser LocalStorage for upload form state

**Rationale**:
- Per spec FR-016: "persist file upload state temporarily"
- Users can reload page without losing selected files
- Persists:
  - Selected file names and sizes
  - Last job ID for quick access
- Cleared on upload success or manual clear

**Implementation**:
- uploadManager service wraps localStorage
- Automatic serialization/deserialization
- Type-safe via TypeScript

**Alternatives Considered**:
- IndexedDB: Overkill for simple form state
- No persistence: Poor UX; users frustrated if page reloads
- Cookies: Sent with every request; unnecessary overhead

---

### 14. API Contract & Data Types

**Decision**: TypeScript interfaces matching backend API

**Rationale**:
- Define types/api.ts with interfaces:
  - UploadRequest, UploadResponse
  - ComparisonJob, ComparisonResult
  - ErrorResponse
- Ensures frontend-backend alignment
- Type checking catches mismatches at development time

**API Contracts**:
```typescript
POST /api/v1/upload
Request: FormData (file1, file2)
Response: { job_id: string, status: string }

GET /api/v1/compare/{job_id}
Response: {
  job_id: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  result?: {
    total_differences: number,
    pages_with_changes: number[],
    differences: DifferenceDetail[]
  },
  error_message?: string
}
```

**Alternatives Considered**:
- OpenAPI code generation: Heavy for MVP; manual types simpler
- GraphQL schema: Overkill for REST API
- No type definitions: Fragile; prone to bugs

---

## Summary of Decisions

| Area | Decision | Key Points |
|------|----------|-----------|
| Framework | React 18 + TS + Vite | Component reuse, type safety, fast builds |
| PDF Rendering | pdfjs-dist | Industry standard, highlighting support |
| State | Context API + Hooks | Lightweight, no Redux complexity |
| HTTP | Axios | Native upload progress, multipart support |
| Highlighting | Canvas overlay | Efficient, flexible styling |
| Sync | Custom hook | Debounced, responsive to zoom |
| Validation | Client + Server | UX + security |
| Upload | Axios abort controller | Progress tracking, cancellation |
| Polling | Interval with backoff | Adaptive to comparison time |
| Responsive | Tailwind + CSS Grid | Mobile-first, consistent |
| Errors | Boundary + Try-catch | Graceful degradation |
| Testing | Vitest + RTL + Playwright | Fast dev loop, user-centric |
| Storage | LocalStorage | Temporary persistence |
| Types | TypeScript interfaces | Frontend-backend alignment |

All decisions are made with MVP scope in mind. Future enhancements (WebSocket, persistent storage, OAuth, etc.) can be layered on after core functionality.
