# Implementation Plan: PDF Comparison Frontend - Upload & Viewer

**Branch**: `002-frontend-viewer` | **Date**: 2025-10-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-frontend-viewer/spec.md`

## Summary

Build a modern, responsive web frontend for the PDF Comparison API that enables users to upload two PDF files and view side-by-side comparison results with highlighted differences. The frontend will consist of two main views:

1. **Upload Page**: Drag-and-drop file input with validation, supporting files up to 50MB
2. **Results Viewer**: Real-time polling of job status with side-by-side PDF rendering, synchronized scrolling, and difference highlighting

The implementation uses modern web technologies (React, TypeScript, Vite) with a focus on performance, accessibility, and responsive design across all device sizes.

## Technical Context

**Language/Version**: TypeScript 5.x with React 18.x
**Primary Dependencies**: React, React Router, Vite, pdfjs-dist (PDF rendering), axios (HTTP client), TailwindCSS (styling)
**Storage**: Browser LocalStorage for temporary upload state persistence, no persistent backend storage required
**Testing**: Vitest (unit tests), React Testing Library (component tests), Playwright (E2E tests)
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge) supporting ES2020+ and CSS Grid/Flexbox
**Project Type**: Single-page application (SPA) - web frontend
**Performance Goals**:
- Page load: <2 seconds (LCP)
- PDF rendering: <1 second per page
- Upload: <10 seconds for 50MB file
- Results polling: ~3 second refresh interval
**Constraints**:
- Max file upload: 50MB client-side validation
- Browser support: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Responsive: 320px mobile to 2560px ultra-wide desktop
- Network: Support for slow/intermittent connections with pause/resume
**Scale/Scope**: MVP with 2 main pages + 4 supporting views (error, not-found, processing, success)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS (No constitution file restrictions apply - frontend is scoped as single SPA project)

- ✅ Complexity justified: Frontend SPA is necessary companion to backend API
- ✅ No multi-service architecture: Single frontend project required
- ✅ Clear boundaries: Frontend-only responsibility (UI, client-side logic, file handling)
- ✅ Backend separation: Backend API exists separately (002-pdf-api-foundation)

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
frontend/                      # New React SPA frontend
├── src/
│   ├── components/           # Reusable React components
│   │   ├── FileUploadArea.tsx
│   │   ├── PDFViewer.tsx
│   │   ├── DifferenceHighlight.tsx
│   │   ├── SyncedScroll.tsx
│   │   ├── ProgressIndicator.tsx
│   │   └── ErrorBoundary.tsx
│   ├── pages/                # Page-level components
│   │   ├── UploadPage.tsx
│   │   ├── ResultsPage.tsx
│   │   ├── NotFoundPage.tsx
│   │   └── ProcessingPage.tsx
│   ├── services/             # API and utility services
│   │   ├── api.ts           # Axios instance & API calls
│   │   ├── fileValidator.ts # File validation logic
│   │   ├── uploadManager.ts # Upload state management
│   │   └── pollingService.ts # Job status polling
│   ├── hooks/                # Custom React hooks
│   │   ├── useFileUpload.ts
│   │   ├── useJobPolling.ts
│   │   └── useSyncedScroll.ts
│   ├── types/                # TypeScript type definitions
│   │   ├── api.ts
│   │   ├── domain.ts
│   │   └── ui.ts
│   ├── context/              # React context for state
│   │   ├── UploadContext.tsx
│   │   └── JobContext.tsx
│   ├── utils/                # Helper functions
│   │   ├── storage.ts       # LocalStorage utilities
│   │   ├── formatting.ts    # Date/number formatting
│   │   └── errors.ts        # Error handling
│   ├── App.tsx              # Root component with routing
│   └── main.tsx             # Vite entry point
├── tests/
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # Playwright E2E tests
├── public/                   # Static assets
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
├── vitest.config.ts         # Vitest configuration
└── package.json

backend/                       # Existing backend (unchanged)
├── app.py
├── config.py
├── Dockerfile
└── requirements.txt
```

**Structure Decision**: Web application structure (Option 2) with separate `frontend/` and `backend/` directories. Frontend is a standalone React SPA that communicates with the backend API via HTTP. Each layer has clear responsibilities with no cross-contamination.

## Complexity Tracking

**No violations** - Constitution Check passed. No complexity justification needed.
