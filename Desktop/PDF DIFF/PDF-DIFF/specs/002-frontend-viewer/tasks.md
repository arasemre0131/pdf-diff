# Tasks: PDF Comparison Frontend - Upload & Viewer

**Input**: Design documents from `/specs/002-frontend-viewer/`
**Prerequisites**: plan.md (tech stack), spec.md (4 user stories), data-model.md (entities), contracts/api.ts (API contract), research.md (decisions), quickstart.md (dev setup)

**Tests**: Test tasks are OPTIONAL and NOT included in this MVP scope. Implementation focuses on delivering user story functionality first.

**Organization**: Tasks are grouped by user story (US1-US4) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend (this feature)**: `frontend/src/`, `frontend/tests/`
- **Backend (separate)**: `backend/` (unchanged)
- **Specs**: `specs/002-frontend-viewer/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

**Scope**: Foundation for all user stories

- [ ] T001 Initialize React + TypeScript + Vite project with `npm create vite@latest frontend -- --template react-ts`
- [ ] T002 Install core dependencies: react-router-dom, pdfjs-dist, axios, axios-retry, date-fns, tailwindcss in `frontend/package.json`
- [ ] T003 Install testing dependencies: vitest, @testing-library/react, @vitest/ui, @playwright/test in `frontend/package.json`
- [ ] T004 [P] Configure Vite with proxy to backend API at `frontend/vite.config.ts` (proxy `/api` to `http://localhost:8000`)
- [ ] T005 [P] Configure TypeScript compiler options in `frontend/tsconfig.json` (ES2020 target, React JSX, path aliases)
- [ ] T006 [P] Setup TailwindCSS with configuration in `frontend/tailwind.config.js` and `frontend/src/index.css`
- [ ] T007 [P] Configure Vitest in `frontend/vitest.config.ts` with jsdom environment and test setup file
- [ ] T008 Create directory structure per plan.md in `frontend/src/` (components, pages, services, hooks, types, context, utils)
- [ ] T009 Create root component and routing setup in `frontend/src/App.tsx` with React Router

**Checkpoint**: Frontend project structure initialized and dependencies installed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T010 Create API contract types matching backend in `frontend/src/types/api.ts` (UploadResponse, JobStatusResponse, ComparisonResult, ErrorResponse)
- [ ] T011 [P] Create domain types for entities in `frontend/src/types/domain.ts` (ComparisonJob, UploadedFile, ComparisonResult, UIState)
- [ ] T012 [P] Create component prop types in `frontend/src/types/ui.ts` (component interfaces for all major components)
- [ ] T013 [P] Create constants file in `frontend/src/utils/constants.ts` (file constraints, colors, polling config, endpoints)
- [ ] T014 Create axios API service instance in `frontend/src/services/api.ts` with request/response interceptors and base configuration
- [ ] T015 [P] Create file validation service in `frontend/src/services/fileValidator.ts` (validateFileType, validateFileSize, validateFileCount functions)
- [ ] T016 [P] Create localStorage utility service in `frontend/src/utils/storage.ts` (saveUploadState, loadUploadState, clearUploadState)
- [ ] T017 Create upload manager service in `frontend/src/services/uploadManager.ts` (uploadFiles function with progress and cancellation)
- [ ] T018 [P] Create polling service in `frontend/src/services/pollingService.ts` (startPolling, stopPolling with exponential backoff)
- [ ] T019 [P] Create error handling utility in `frontend/src/utils/errors.ts` (error type detection, user-friendly messages)
- [ ] T020 Create React Context for upload state in `frontend/src/context/UploadContext.tsx` (UploadContext with provider)
- [ ] T021 Create React Context for job state in `frontend/src/context/JobContext.tsx` (JobContext with provider)
- [ ] T022 [P] Create custom hook for upload in `frontend/src/hooks/useFileUpload.ts` (wraps UploadContext)
- [ ] T023 [P] Create custom hook for polling in `frontend/src/hooks/useJobPolling.ts` (wraps JobContext with polling logic)
- [ ] T024 [P] Create custom hook for synced scroll in `frontend/src/hooks/useSyncedScroll.ts` (manages scroll/zoom sync state)
- [ ] T025 Create Error Boundary component in `frontend/src/components/ErrorBoundary.tsx` (catches rendering errors)
- [ ] T026 [P] Create environment configuration in `frontend/.env` (API_BASE_URL, PDF worker path)
- [ ] T027 Update app entrypoint in `frontend/src/main.tsx` to include context providers (UploadContext, JobContext)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Upload Two PDF Files for Comparison (Priority: P1) 🎯 MVP

**Goal**: Enable users to select two PDF files, validate them, and submit for comparison

**Independent Test**: Access upload page → select 2 valid PDFs → click upload → see job ID and redirect to results page

### Implementation for User Story 1

- [ ] T028 [P] [US1] Create UploadPage component in `frontend/src/pages/UploadPage.tsx` (main upload layout with form)
- [ ] T029 [P] [US1] Create FileUploadArea component in `frontend/src/components/FileUploadArea.tsx` (drag-drop zone with file picker)
- [ ] T030 [P] [US1] Create FileList component in `frontend/src/components/FileList.tsx` (shows selected files with remove buttons)
- [ ] T031 [P] [US1] Create ProgressIndicator component in `frontend/src/components/ProgressIndicator.tsx` (displays upload progress)
- [ ] T032 [US1] Implement file selection logic in UploadPage (validate on select, show errors, display in FileList)
- [ ] T033 [US1] Implement upload submission in UploadPage using uploadManager service (calls `/api/v1/upload`, handles progress)
- [ ] T034 [US1] Implement navigation to ResultsPage with job_id URL param after successful upload
- [ ] T035 [US1] Implement cancel upload functionality (abort controller, reset UI, return to file selection)
- [ ] T036 [US1] Add file size and type validation messages in FileUploadArea (clear, actionable errors)
- [ ] T037 [US1] Add localStorage persistence for selected files in UploadPage (save on select, load on mount, clear on upload)
- [ ] T038 [US1] Style UploadPage for responsive design in `frontend/src/pages/UploadPage.tsx` (mobile to 2560px, TailwindCSS)
- [ ] T039 [US1] Add loading state while upload in progress (disable buttons, show spinner)
- [ ] T040 [US1] Add error state display with retry option on upload failure

**Checkpoint**: User Story 1 complete - users can upload files and get job ID

---

## Phase 4: User Story 2 - View PDF Comparison Results (Priority: P1)

**Goal**: Display side-by-side PDF comparison with polling for job status and difference highlighting

**Independent Test**: Navigate to results page with valid job_id → see job status polling → view PDFs side-by-side when ready → see differences highlighted

### Implementation for User Story 2

- [ ] T041 [P] [US2] Create ResultsPage component in `frontend/src/pages/ResultsPage.tsx` (main results layout with polling)
- [ ] T042 [P] [US2] Create PDFViewer component in `frontend/src/components/PDFViewer.tsx` (renders single PDF with pdfjs-dist)
- [ ] T043 [P] [US2] Create DifferenceHighlight component in `frontend/src/components/DifferenceHighlight.tsx` (canvas overlay for highlighting)
- [ ] T044 [P] [US2] Create SyncedScroll component wrapper in `frontend/src/components/SyncedScroll.tsx` (manages synced scrolling/zoom)
- [ ] T045 [P] [US2] Create ProcessingPage component in `frontend/src/pages/ProcessingPage.tsx` (processing state with spinner)
- [ ] T046 [US2] Implement job status polling in ResultsPage using pollingService (polls every 3 seconds with exponential backoff)
- [ ] T047 [US2] Implement PDF rendering in PDFViewer (fetch PDF from backend, render with pdfjs-dist on canvas)
- [ ] T048 [US2] Implement difference highlighting in DifferenceHighlight (draw rectangles for each difference with color-coding)
- [ ] T049 [US2] Implement synchronized scrolling between two PDFViewers using useSyncedScroll hook
- [ ] T050 [US2] Implement synchronized zoom between two PDFViewers using useSyncedScroll hook
- [ ] T051 [US2] Add processing state display while job is pending/processing (show "Checking status..." message, polling indicator)
- [ ] T052 [US2] Add results state display when job completes (show PDFs with differences)
- [ ] T053 [US2] Style ResultsPage for responsive side-by-side layout (stacked on mobile <1024px, side-by-side on desktop)
- [ ] T054 [US2] Add polling error handling with retry option (max 3 retries, then show error)
- [ ] T055 [US2] Add long-processing notification if job takes > 10 minutes (notify user, allow saving job_id)

**Checkpoint**: User Story 2 complete - users can view results with differences highlighted

---

## Phase 5: User Story 3 - Navigate PDF Pages and View Difference Summary (Priority: P2)

**Goal**: Enable page navigation and display summary statistics

**Independent Test**: Load multi-page comparison → click next/previous → see page numbers update in both viewers → see difference summary

### Implementation for User Story 3

- [ ] T056 [P] [US3] Create PageNavigation component in `frontend/src/components/PageNavigation.tsx` (prev/next/jump page controls)
- [ ] T057 [P] [US3] Create DifferenceSummary component in `frontend/src/components/DifferenceSummary.tsx` (shows total differences, pages affected)
- [ ] T058 [US3] Implement page navigation logic in ResultsPage (update currentPageNumber state, re-render PDFViewers)
- [ ] T059 [US3] Implement "next difference" button in PageNavigation (jumps to next page with differences)
- [ ] T060 [US3] Add page indicator showing current page in PageNavigation (e.g., "Page 3 of 10")
- [ ] T061 [US3] Calculate and display difference summary in DifferenceSummary (total_differences, pages_with_changes from result)
- [ ] T062 [US3] Add keyboard navigation support (arrow keys for prev/next page)
- [ ] T063 [US3] Style PageNavigation and DifferenceSummary components with TailwindCSS

**Checkpoint**: User Story 3 complete - users can navigate pages and see summaries

---

## Phase 6: User Story 4 - Export Comparison Report (Priority: P3)

**Goal**: Allow users to download comparison results as PDF report

**Independent Test**: View results → click "Export Report" → download PDF with summary of differences

### Implementation for User Story 4

- [ ] T064 [P] [US4] Create ExportButton component in `frontend/src/components/ExportButton.tsx` (button with export functionality)
- [ ] T065 [US4] Implement PDF generation using @react-pdf/renderer in `frontend/src/services/reportGenerator.ts`
- [ ] T066 [US4] Create report template with summary data in reportGenerator (title, file names, total differences, per-page breakdown)
- [ ] T067 [US4] Implement download functionality in ExportButton (generate PDF, trigger browser download)
- [ ] T068 [US4] Add loading state while generating report (disable button, show spinner)
- [ ] T069 [US4] Add error handling for report generation (show error message if generation fails)

**Checkpoint**: User Story 4 complete - users can export results

---

## Phase 7: Supporting Views & Navigation

**Purpose**: Complete UI with error and not-found pages

- [ ] T070 [P] Create NotFoundPage component in `frontend/src/pages/NotFoundPage.tsx` (for invalid job_id with link back to upload)
- [ ] T071 [P] Create ErrorPage component in `frontend/src/pages/ErrorPage.tsx` (for comparison failures)
- [ ] T072 Add route for `/` → UploadPage in `frontend/src/App.tsx`
- [ ] T073 Add route for `/results/:jobId` → ResultsPage in `frontend/src/App.tsx`
- [ ] T074 Add route for `*` (catch-all) → NotFoundPage in `frontend/src/App.tsx`
- [ ] T075 Add navigation from UploadPage to ResultsPage with job_id
- [ ] T076 Add "Start New Comparison" link in ResultsPage (navigate back to UploadPage, clear upload state)

**Checkpoint**: All navigation working between pages

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final quality improvements

### Styling & Responsive Design

- [ ] T077 [P] Review and test responsive layout on mobile (320px), tablet (768px), laptop (1024px), desktop (1920px), ultra-wide (2560px)
- [ ] T078 [P] Ensure TailwindCSS classes applied consistently across all components
- [ ] T079 [P] Add focus states and hover effects for accessibility
- [ ] T080 [P] Test color contrast for WCAG A compliance (green/red/yellow difference colors)

### Loading & Empty States

- [ ] T081 [P] Add loading skeleton for PDF pages while rendering
- [ ] T082 [P] Add empty state message when no files selected on UploadPage
- [ ] T083 [P] Add empty state for no differences found (show "0 differences" clearly)

### Error Messages & Validation

- [ ] T084 [P] Review all error messages for clarity and actionability
- [ ] T085 [P] Add validation error summary at top of form
- [ ] T086 [P] Test all edge cases (>50MB file, wrong format, timeout, etc.)

### Performance Optimization

- [ ] T087 [P] Implement code splitting for upload vs results pages in `frontend/vite.config.ts`
- [ ] T088 [P] Lazy-load PDF.js worker to avoid blocking initial load
- [ ] T089 [P] Memoize expensive components (PDFViewer, DifferenceHighlight) with React.memo
- [ ] T090 [P] Debounce scroll events in useSyncedScroll hook (100ms debounce)
- [ ] T091 [P] Cache PDF document objects to avoid re-fetching

### Accessibility

- [ ] T092 [P] Add ARIA labels to interactive elements (upload button, file input, navigation)
- [ ] T093 [P] Ensure keyboard navigation works (tab, enter, arrow keys)
- [ ] T094 [P] Test with screen reader (VoiceOver on Mac)
- [ ] T095 [P] Add alt text for images and decorative elements

### Documentation

- [ ] T096 Create deployment guide in `frontend/DEPLOYMENT.md` (build, serve, environment config)
- [ ] T097 Create testing guide in `frontend/TESTING.md` (how to run unit/integration/E2E tests)
- [ ] T098 Create troubleshooting guide in `frontend/TROUBLESHOOTING.md` (common issues and solutions)

### Final QA

- [ ] T099 Manual end-to-end testing: upload files → see results → navigate → export
- [ ] T100 Test on actual browsers (Chrome, Firefox, Safari, Edge)
- [ ] T101 Test on actual devices (iPhone, iPad, Android phone, large desktop)
- [ ] T102 Performance audit using Lighthouse (target: >90 across all categories)
- [ ] T103 Security audit: CORS headers, no sensitive data in localStorage
- [ ] T104 Verify all acceptance scenarios from spec.md pass

**Checkpoint**: Frontend is production-ready

---

## Dependencies & Execution Order

### Critical Path (Must complete in order)

1. **Phase 1** (Setup) → Must complete before anything else
2. **Phase 2** (Foundational) → Must complete before user stories
3. **Phase 3** (US1) → MVP starts here, can parallel with Phase 4
4. **Phase 4** (US2) → Can run parallel with Phase 3
5. **Phase 5** (US3) → Depends on Phase 4 (needs ResultsPage)
6. **Phase 6** (US4) → Depends on Phase 4 (needs results data)
7. **Phase 7** (Navigation) → Depends on all story phases
8. **Phase 8** (Polish) → Last phase, no dependencies

### Parallelization Opportunities

**Within Phase 1**:
- T004-T007 can run in parallel (all setup configuration)

**Within Phase 2**:
- T011, T012, T013 (types) can run in parallel
- T015, T016, T019 (services) can run in parallel
- T022, T023, T024 (hooks) can run in parallel

**Within Phase 3 (US1)**:
- T028-T031 (components) can run in parallel
- Then T032-T040 (component logic) can run in parallel after

**Within Phase 4 (US2)**:
- T041-T045 (components) can run in parallel
- Then T046-T055 (component logic) can run in parallel after

**Within Phase 8**:
- T077-T095 (all polish tasks) can run in parallel

---

## MVP Scope (Minimum to Ship)

**Essential for Users**:
✅ Phase 1: Setup
✅ Phase 2: Foundational
✅ Phase 3: User Story 1 (Upload)
✅ Phase 4: User Story 2 (View Results)

**Nice to have but not MVP**:
⚠️ Phase 5: User Story 3 (Page Navigation) - Can ship without
⚠️ Phase 6: User Story 4 (Export) - Can ship without
⚠️ Phase 7: Supporting Views - Can use simple 404
⚠️ Phase 8: Polish - Basic version acceptable

**Suggested first release**: Complete Phase 1-4 (~60 tasks, ~2 week sprint)

---

## Task Summary Statistics

- **Total Tasks**: 104
- **Phase 1 (Setup)**: 9 tasks
- **Phase 2 (Foundational)**: 18 tasks
- **Phase 3 (US1)**: 13 tasks
- **Phase 4 (US2)**: 15 tasks
- **Phase 5 (US3)**: 8 tasks
- **Phase 6 (US4)**: 6 tasks
- **Phase 7 (Navigation)**: 7 tasks
- **Phase 8 (Polish)**: 28 tasks

**Parallelizable Tasks**: ~45 tasks (marked with [P])
**Sequential Tasks**: ~59 tasks (dependent on others)

---

## File Paths Reference

### Core Components
- `frontend/src/pages/UploadPage.tsx`
- `frontend/src/pages/ResultsPage.tsx`
- `frontend/src/pages/NotFoundPage.tsx`
- `frontend/src/pages/ErrorPage.tsx`
- `frontend/src/pages/ProcessingPage.tsx`

### Upload Components
- `frontend/src/components/FileUploadArea.tsx`
- `frontend/src/components/FileList.tsx`
- `frontend/src/components/ProgressIndicator.tsx`

### Results Components
- `frontend/src/components/PDFViewer.tsx`
- `frontend/src/components/DifferenceHighlight.tsx`
- `frontend/src/components/SyncedScroll.tsx`
- `frontend/src/components/PageNavigation.tsx`
- `frontend/src/components/DifferenceSummary.tsx`
- `frontend/src/components/ExportButton.tsx`
- `frontend/src/components/ErrorBoundary.tsx`

### Services
- `frontend/src/services/api.ts`
- `frontend/src/services/fileValidator.ts`
- `frontend/src/services/uploadManager.ts`
- `frontend/src/services/pollingService.ts`
- `frontend/src/services/reportGenerator.ts`

### State Management
- `frontend/src/context/UploadContext.tsx`
- `frontend/src/context/JobContext.tsx`
- `frontend/src/hooks/useFileUpload.ts`
- `frontend/src/hooks/useJobPolling.ts`
- `frontend/src/hooks/useSyncedScroll.ts`

### Types & Utilities
- `frontend/src/types/api.ts`
- `frontend/src/types/domain.ts`
- `frontend/src/types/ui.ts`
- `frontend/src/utils/constants.ts`
- `frontend/src/utils/storage.ts`
- `frontend/src/utils/errors.ts`

### Configuration
- `frontend/src/App.tsx`
- `frontend/src/main.tsx`
- `frontend/vite.config.ts`
- `frontend/tsconfig.json`
- `frontend/vitest.config.ts`
- `frontend/tailwind.config.js`
- `frontend/.env`

---

## Implementation Notes

1. **Backend Assumption**: Backend API running at `http://localhost:8000` with endpoints:
   - `POST /api/v1/upload` (takes 2 PDFs, returns job_id)
   - `GET /api/v1/compare/{job_id}` (returns job status and results)

2. **Testing Strategy**: No unit/integration tests in MVP. Can add in Phase 2 enhancement:
   - Component tests with React Testing Library
   - Service tests with Vitest
   - E2E tests with Playwright

3. **Incremental Delivery**: Each phase produces a testable increment:
   - After Phase 2: Can start Phase 3 or 4 in parallel
   - After Phase 3: Users can upload files
   - After Phase 4: Users can view results
   - After Phase 5: Users can navigate multi-page PDFs
   - After Phase 6: Users can export reports

4. **Performance Targets** (from success criteria):
   - Page load < 2 seconds
   - PDF render < 1 second per page
   - Upload < 10 seconds for 50MB
   - Polling < 3 seconds between requests

5. **Browser Support**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

## Ready to Execute

All 104 tasks are organized, sequenced, and ready for implementation. Start with Phase 1 to initialize the project, then proceed through phases in order. Phases 3-4 can run in parallel for faster delivery.

Next step: `npm run dev` in frontend directory and begin with T001! 🚀
