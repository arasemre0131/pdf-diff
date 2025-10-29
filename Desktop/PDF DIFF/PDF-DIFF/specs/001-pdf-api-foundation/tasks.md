---

description: "Task list for Backend API Foundation feature implementation"

---

# Tasks: Backend API Foundation

**Input**: Design documents from `specs/001-pdf-api-foundation/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), data-model.md, research.md

**Tests**: NO automated tests in MVP (per constitution MVP minimalism constraint). Manual testing and visual validation acceptable.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. Each story is independently testable and can be deployed separately.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions
- Each task follows strict format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

## Path Conventions

- **Backend**: `backend/src/`, `backend/models/`, `backend/services/`, `backend/api/`
- **Docker**: `docker-compose.yml`, `backend/Dockerfile`, `.env.example`
- **Config**: `backend/requirements.txt`, `backend/.dockerignore`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create backend directory structure with subdirectories: models/, services/, api/, __init__.py files
- [ ] T002 Create Dockerfile in backend/ with multi-stage build (Python 3.11-slim base, pip dependencies in builder stage)
- [ ] T003 Create .dockerignore in backend/ to exclude __pycache__, *.pyc, .env, venv/
- [ ] T004 [P] Create docker-compose.yml with 5 services: redis (port 6379), minio (port 9000), backend (port 8000), celery-worker, nginx (port 80/443)
- [ ] T005 [P] Create .env.example with required environment variables: REDIS_URL, CELERY_BROKER_URL, S3_BUCKET, S3_ENDPOINT_URL, MINIO credentials, LOG_LEVEL
- [ ] T006 Create requirements.txt in backend/ with dependencies: fastapi==0.100.1, uvicorn==0.23.0, celery==5.3.0, redis==5.0.0, boto3==1.26.0, python-dotenv==1.0.0, pydantic==2.0.0
- [ ] T007 Create backend/__init__.py as empty package marker
- [ ] T008 Create backend/config.py to load environment variables via python-dotenv (REDIS_URL, CELERY_BROKER_URL, S3_BUCKET, S3_ENDPOINT_URL, etc.)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 [P] Create backend/models/__init__.py as empty package marker
- [ ] T010 [P] Create backend/models/job.py with Pydantic schemas: Coordinates (x, y, width, height), PDFDifference (page_number, diff_type, coordinates, description, before_text, after_text, page_level), ComparisonJobResponse (job_id, status, file1_key, file2_key, created_at, started_at, completed_at, results, error_message, retry_count), UploadResponse (job_id, status, created_at)
- [ ] T011 [P] Create backend/services/__init__.py as empty package marker
- [ ] T012 Create backend/services/storage_service.py to handle S3/MinIO operations: upload_file() method using boto3 (endpoint_url from config for dev/prod), generate_file_key() method using UUID + filename hash, abstract S3/MinIO differences via environment config
- [ ] T013 Create backend/services/comparison_service.py to coordinate Celery tasks: queue_comparison() method to enqueue compare_pdfs task and return job_id, get_job_status() method to retrieve job from Redis, store_job_status() method to save job record in Redis with 24-hour TTL
- [ ] T014 Create backend/services/pdf_processor.py to integrate pdf-diff library: import pdf_diff library from git submodule (from pdf_diff import compare), implement compare_pdfs() function to call pdf_diff.compare() and extract differences with page numbers and coordinates
- [ ] T015 Create backend/services/celery_app.py to initialize Celery: create Celery app instance with Redis broker (from CELERY_BROKER_URL), configure result backend (Redis), set serializer to JSON, implement error handling for task failures (store error_message in job record)
- [ ] T016 Create backend/services/celery_tasks.py to define Celery tasks: implement @celery_app.task decorated compare_pdfs() function with parameters (file1_key, file2_key, job_id), configure max_retries=3 with exponential backoff, handle exceptions (PDFProcessingError, StorageError, TimeoutError), update job status in Redis to "processing" → "completed" or "failed"
- [ ] T017 [P] Create backend/api/__init__.py as empty package marker
- [ ] T018 Create backend/api/routes.py to define API endpoints (routers will be imported in app.py later)
- [ ] T019 Create backend/app.py as FastAPI entry point: initialize FastAPI app instance, set up CORS, configure logging, register routers from api/routes.py, define health check endpoint at GET /health

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Upload PDF Files for Comparison (Priority: P1) 🎯 MVP

**Goal**: Users can upload two PDF files and receive a job ID; files are validated, stored to S3/MinIO, and job is queued for processing

**Independent Test**: Upload two valid PDFs via POST /api/v1/upload → receive HTTP 200 with job_id and status="queued" → verify files exist in MinIO console or via S3 API

### Implementation for User Story 1

- [ ] T020 [P] [US1] Create Pydantic model in backend/models/job.py for FileUploadRequest (file1: UploadFile, file2: UploadFile) if not already present
- [ ] T021 [P] [US1] Implement file validation in backend/services/storage_service.py: validate_pdf_upload() function to check MIME type (application/pdf), file size (<100MB), PDF magic bytes (%PDF-)
- [ ] T022 [US1] Implement POST /api/v1/upload endpoint in backend/api/routes.py: accept multipart/form-data with file1 and file2, call validate_pdf_upload() for each file, call storage_service.upload_file() to store both files to S3/MinIO, call comparison_service.queue_comparison() to queue Celery task, return UploadResponse (job_id, status="queued", created_at)
- [ ] T023 [US1] Implement error handling for POST /api/v1/upload: return HTTP 400 for invalid MIME type, return HTTP 413 for file > 100MB, return HTTP 500 for storage failures, ensure error responses include descriptive detail field
- [ ] T024 [US1] Update backend/app.py to register upload route from api/routes.py (from .api.routes import router; app.include_router(router, prefix="/api/v1"))
- [ ] T025 [US1] Test manually: upload two valid PDFs → verify job_id returned → verify HTTP 200 status → verify files appear in MinIO (docker-compose exec minio aws s3 ls s3://pdf-uploads --endpoint-url http://localhost:9000)

**Checkpoint**: User Story 1 complete and independently testable

---

## Phase 4: User Story 2 - Poll Job Status for Comparison Results (Priority: P1)

**Goal**: Users can poll the API for job status and retrieve cached comparison results without re-processing

**Independent Test**: Upload files (US1) → poll GET /api/v1/compare/:id multiple times → observe status transitions (queued → processing → completed) → verify results include differences array with coordinates

### Implementation for User Story 2

- [ ] T026 [P] [US2] Create Pydantic model in backend/models/job.py for ComparisonResultResponse (job_id, status, created_at, started_at, completed_at, differences, error_message) if not already present
- [ ] T027 [US2] Implement GET /api/v1/compare/:id endpoint in backend/api/routes.py: accept path parameter job_id (UUID), call comparison_service.get_job_status() to retrieve from Redis, return appropriate response based on status (queued, processing, completed, failed)
- [ ] T028 [US2] Implement status="queued" response: return job_id, status="queued", created_at
- [ ] T029 [US2] Implement status="processing" response: return job_id, status="processing", created_at, started_at, estimated_completion_time (started_at + 30s for typical contracts)
- [ ] T030 [US2] Implement status="completed" response: return job_id, status="completed", created_at, started_at, completed_at, differences array (from Redis cached results)
- [ ] T031 [US2] Implement status="failed" response: return job_id, status="failed", created_at, started_at, completed_at, error_message
- [ ] T032 [US2] Implement 404 Not Found error: return HTTP 404 with detail="Job not found" when job_id does not exist or has expired
- [ ] T033 [US2] Update backend/app.py to register status route in api/routes.py
- [ ] T034 [US2] Implement Redis result caching in comparison_service.py: store comparison results in Redis with key `job:{job_id}`, set TTL=86400 (24 hours), ensure subsequent polls return cached results (FR-010)
- [ ] T035 [US2] Test manually: upload files → wait 1 second → poll status (should be "queued" or "processing") → wait 5 seconds → poll again (should be "processing" or "completed") → verify differences appear when completed

**Checkpoint**: User Stories 1 AND 2 complete and independently testable

---

## Phase 5: User Story 3 - Frontend Receives Diff Results with Page Coordinates (Priority: P1)

**Goal**: Comparison results include properly structured differences with page coordinates for frontend highlighting

**Independent Test**: Complete comparison (US2) → examine GET /api/v1/compare/:id response → verify differences array contains required fields (page_number, diff_type, coordinates with x/y/width/height, description, before_text/after_text) → verify coordinates are valid PDF points

### Implementation for User Story 3

- [ ] T036 [US3] Implement pdf-diff integration in backend/services/pdf_processor.py: download file1 and file2 from S3, call pdf_diff.compare(file1_bytes, file2_bytes), extract differences from pdf_diff output (verify coordinate system is PDF points)
- [ ] T037 [US3] Implement Celery task in backend/services/celery_tasks.py to invoke pdf_processor.compare_pdfs(): parse pdf_diff output into PDFDifference objects, handle errors (PDFProcessingError, StorageError, TimeoutError), store results in Redis job record as JSON
- [ ] T038 [US3] Implement difference extraction from pdf_diff: map pdf_diff output fields to PDFDifference schema (page_number, diff_type, coordinates object with x/y/width/height, description, before_text, after_text)
- [ ] T039 [US3] Implement coordinate validation: ensure all coordinates are valid PDF points (x >= 0, y >= 0, width > 0, height > 0), ensure coordinates fit within standard page bounds (612x792 points = 8.5"x11" letter)
- [ ] T040 [US3] Implement page-level differences: for added/removed pages, set page_level=true, coordinates={x:0, y:0, width:612, height:792}
- [ ] T041 [US3] Implement before_text and after_text extraction: for diff_type="modified", extract before and after text from pdf_diff output, limit to 1000 chars each
- [ ] T042 [US3] Implement description generation: create human-readable descriptions for each difference (e.g., "Text changed in Section 2.1" for modified, "New page added: Schedule B" for added)
- [ ] T043 [US3] Implement error handling for PDF comparison: catch pdf-diff exceptions, distinguish between corrupted PDFs ("PDF is corrupted or not readable"), storage failures ("Storage service unavailable"), timeouts ("Processing took too long")
- [ ] T044 [US3] Test manually: upload two similar PDFs → wait for comparison → query results → verify differences array is non-empty → verify each difference has required fields → verify coordinates are valid numbers → verify diff_type is one of (added, removed, modified)

**Checkpoint**: All user stories 1, 2, 3 complete and independently functional

---

## Phase 6: Celery Worker Task Processing

**Purpose**: Ensure background tasks process correctly and results are stored

- [ ] T045 [P] Implement Celery task idempotency in compare_pdfs(): derive task_id from file1_key + file2_key hash to prevent duplicate processing of identical file pairs
- [ ] T046 [P] Implement task state transitions in celery_tasks.py: update job status to "processing" when task starts, update to "completed" on success, update to "failed" on exception
- [ ] T047 Implement exponential backoff retry logic in @celery_app.task: configure retry_backoff=True, retry_backoff_max=600 (10 minutes), max_retries=3, countdown = 2^(retry_count) seconds
- [ ] T048 Implement task failure handling: catch all exceptions, extract error context, store meaningful error_message in job record (distinguish "PDF corrupted", "File too large", "Storage failed", etc.)
- [ ] T049 Test manually: monitor Celery worker logs (docker-compose logs -f celery-worker) → upload files → observe task processing in logs → verify job status transitions → verify results appear in Redis after completion

---

## Phase 7: Integration & Error Handling

**Purpose**: Ensure all services work together and errors are handled gracefully

- [ ] T050 [P] Implement Redis connection error handling: wrap Redis operations in try/except, return meaningful HTTP 500 errors to client if Redis unavailable
- [ ] T051 [P] Implement S3/MinIO connection error handling: wrap boto3 operations in try/except, distinguish between upload failures (HTTP 500), file not found (HTTP 404), access denied (HTTP 403)
- [ ] T052 [P] Implement Celery connection error handling: wrap task queueing in try/except, return HTTP 500 if Celery broker unavailable
- [ ] T053 Implement comprehensive error logging: log all exceptions with context (job_id, file names, error type, stack trace) to stdout (docker-compose logs backend)
- [ ] T054 Implement timeout handling: configure Celery task timeout = 60 seconds (2x success criterion of 30s), catch TimeoutError and update job status to "failed" with message "Processing took too long"
- [ ] T055 Test manually: stop Redis (docker-compose stop redis) → attempt upload → verify HTTP 500 error → restart Redis → verify uploads work again

---

## Phase 8: Environment Configuration & Docker

**Purpose**: Ensure local dev and production configurations work correctly

- [ ] T056 Create .env.local for local development: set REDIS_URL=redis://redis:6379, CELERY_BROKER_URL=redis://redis:6379/0, S3_BUCKET=pdf-uploads, S3_ENDPOINT_URL=http://minio:9000, MINIO credentials
- [ ] T057 Create nginx/nginx.conf to reverse proxy: route /api/ to backend:8000, route / to frontend (placeholder), configure SSL (self-signed for dev), set security headers (HSTS, CSP, X-Frame-Options)
- [ ] T058 Update docker-compose.yml: configure backend service to use .env file, set environment variables, mount backend code volume for auto-reload, configure Celery worker to use same environment
- [ ] T059 Test docker build: docker-compose build → verify no errors → docker-compose up -d → verify all services start → docker-compose ps
- [ ] T060 Test against local docker setup: curl -F "file1=@test.pdf" -F "file2=@test.pdf" http://localhost/api/v1/upload → verify response → curl http://localhost/api/v1/compare/{job_id} → verify status polling works

---

## Phase 9: Documentation & Quickstart Validation

**Purpose**: Verify setup instructions and documentation are correct

- [ ] T061 Create README.md in backend/ with: setup instructions, dependencies list, Docker startup commands, API endpoints documentation, example curl requests
- [ ] T062 Validate quickstart.md from specs/001-pdf-api-foundation/: follow all steps (clone, .env setup, docker-compose up) → verify all steps work → verify first test completes successfully → update any outdated instructions
- [ ] T063 Create DEVELOPMENT.md with: code structure overview, where to add new endpoints, where to add new services, Celery task pattern examples, testing procedures
- [ ] T064 Document environment variables: create .env.example with all required vars and defaults, document purpose of each variable
- [ ] T065 Test documentation: have someone new follow README.md and quickstart.md → verify they can get the system running → document any missing steps

---

## Phase 10: Manual Testing & Validation

**Purpose**: Ensure feature works end-to-end and meets success criteria

- [ ] T066 Test SC-001 (2-second upload): measure time from upload request to response → time < 2 seconds for typical PDF files
- [ ] T067 Test SC-002 (100 jobs/minute): queue 100 uploads in rapid succession → verify no timeouts or dropped requests → check all jobs are queued
- [ ] T068 Test SC-003 (30-second comparison): upload 10-page PDF → measure time from upload to completed status → time < 30 seconds for typical contracts
- [ ] T069 Test SC-004 (99% availability): run upload/poll/complete cycle 100 times → count failures → availability >= 99% (< 1 failure)
- [ ] T070 Test SC-005 (result caching): upload same two PDFs twice → first time: measure processing → second time: verify instant return from cache (no reprocessing)
- [ ] T071 Test SC-007 (JSON response structure): inspect GET /api/v1/compare response → verify all required fields present → verify data types correct → verify coordinates are valid numbers
- [ ] T072 Test SC-008 (meaningful error messages): upload corrupted PDF → verify error message is specific ("PDF is corrupted") not generic → test multiple error types (invalid MIME, file too large, etc.)
- [ ] T073 Test edge case: upload identical PDFs → verify no duplicate processing (idempotent task execution)
- [ ] T074 Test edge case: upload very large PDF (50+ pages) → verify processing completes within 60s timeout
- [ ] T075 Test edge case: request non-existent job ID → verify HTTP 404 with "Job not found" message

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements and final cleanup

- [ ] T076 [P] Add structured logging in all services: log upload start/end, S3 operations, Celery task start/end, results storage
- [ ] T077 [P] Add health check endpoints: GET /health returns {status: "ok"}, GET /health/redis checks Redis connection, GET /health/celery checks Celery worker availability
- [ ] T078 Add request validation error responses: FastAPI automatic validation errors return HTTP 422 with field validation details
- [ ] T079 Add CORS configuration in app.py: allow requests from localhost:3000 (frontend), allow credentials, allow typical methods (GET, POST)
- [ ] T080 Add request logging middleware: log all incoming requests (method, path, response status, response time)
- [ ] T081 Code cleanup: remove debug print statements, ensure consistent formatting, verify no unused imports
- [ ] T082 Create API documentation: verify FastAPI Swagger UI at /api/docs is accessible and correct, generate OpenAPI schema, test Swagger UI against actual API
- [ ] T083 Validate all success criteria: run through SC-001 through SC-008 checklist → verify all passing → document any failures
- [ ] T084 Final integration test: upload test PDFs → poll results → verify full end-to-end flow works → test error scenarios → test edge cases

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS all user stories**
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) or sequentially (P1 → P1 → P1)
  - Each story is independently testable
- **Celery Worker (Phase 6)**: Depends on Foundational + US1+US2 (needs task definitions)
- **Integration (Phase 7)**: Depends on all user stories complete
- **Environment/Docker (Phase 8)**: Can proceed in parallel with user stories
- **Documentation (Phase 9)**: Can start after Foundational, finalized after all phases
- **Testing (Phase 10)**: Depends on Phases 3-7 complete
- **Polish (Phase 11)**: Final phase, depends on Phases 1-10

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
  - Tests: Upload endpoint, file validation, S3 storage

- **User Story 2 (P1)**: Can start after Foundational - May depend on US1 results, but independently testable
  - Tests: Status polling, Redis caching, error retrieval

- **User Story 3 (P1)**: Can start after Foundational - May depend on US1+US2, but independently testable
  - Tests: Difference extraction, coordinate validation, response structure

### Within Each User Story

- Tests (if included): Write and verify they FAIL before implementation ✅
- Models before services
- Services before endpoints
- Core implementation before error handling
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 Setup** (all marked [P]):
- All setup tasks can run in parallel (independent files, no dependencies)

**Phase 2 Foundational** (some marked [P]):
- T009-T011, T017 can run in parallel (independent __init__.py files)
- T012-T016 depend on each other (storage → comparison → processor → celery)

**After Foundational** (all user stories):
- US1, US2, US3 can proceed in parallel by different team members
- Each story develops independently, then integrates

**Phases 6-8**:
- Celery worker, integration, environment can run in parallel with finishing user stories

---

## Parallel Example: User Story 1

```bash
# Launch all independent models for US1 together:
Task: "Create file validation models in models/job.py"

# Launch all service tasks (with dependencies):
Task 1: "Create storage_service.py"
Task 2: "Create comparison_service.py" (depends on Task 1 complete)
Task 3: "Create POST /api/v1/upload endpoint" (depends on Task 2 complete)

# Launch error handling and testing:
Task: "Implement error handling for POST /upload"
Task: "Test upload manually"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. ✅ Complete Phase 1: Setup
2. ✅ Complete Phase 2: Foundational (CRITICAL)
3. ✅ Complete Phase 3: User Story 1 (upload + validate + store)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. If working: Deploy/demo
6. If not working: Debug Phase 3

**Time estimate**: 15-20 hours

### Incremental Delivery (Full MVP)

1. ✅ Phases 1-2: Foundation (20h)
2. ✅ Phase 3: User Story 1 - Upload (10h) → Deploy
3. ✅ Phase 4: User Story 2 - Poll Status (10h) → Deploy
4. ✅ Phase 5: User Story 3 - Diff Results (10h) → Deploy
5. ✅ Phase 6: Celery Worker (5h)
6. ✅ Phases 7-11: Integration, testing, polish (20h)

**Total time estimate**: 75-90 hours for full MVP

### Parallel Team Strategy (3 developers)

With multiple developers after Phase 2:

1. **Dev A**: Phase 1-2 foundation (20h)
2. Once foundation done:
   - **Dev A**: User Story 1 (upload)
   - **Dev B**: User Story 2 (polling)
   - **Dev C**: User Story 3 (differences)
   - **All**: Integration + testing (10-15h each)

---

## Notes

- `[P]` tasks = different files/no dependencies, can run in parallel
- Each user story should be independently completable and testable
- Stop at any checkpoint to validate story independently
- Deploy after each story if working
- Avoid: vague tasks, same file conflicts, undeclared dependencies
- No automated tests in MVP - manual testing sufficient per constitution

---

## Task Summary

**Total Tasks**: 84 tasks across 11 phases
- Phase 1 (Setup): 8 tasks
- Phase 2 (Foundational): 11 tasks
- Phase 3 (US1): 6 tasks
- Phase 4 (US2): 10 tasks
- Phase 5 (US3): 9 tasks
- Phase 6 (Celery Worker): 5 tasks
- Phase 7 (Integration): 6 tasks
- Phase 8 (Environment/Docker): 5 tasks
- Phase 9 (Documentation): 5 tasks
- Phase 10 (Manual Testing): 10 tasks
- Phase 11 (Polish): 8 tasks

**Parallel Opportunities**: 14 tasks can run in parallel ([P] marked)
- Phase 1: 5 parallelizable
- Phase 2: 4 parallelizable
- Phase 7: 3 parallelizable

**MVP Scope (US1 only)**: Tasks T001-T025 (25 tasks, ~20 hours)
**Full MVP (US1+US2+US3)**: Tasks T001-T044 (44 tasks, ~50 hours)
**Production-Ready (all tasks)**: Tasks T001-T084 (84 tasks, ~90 hours)
