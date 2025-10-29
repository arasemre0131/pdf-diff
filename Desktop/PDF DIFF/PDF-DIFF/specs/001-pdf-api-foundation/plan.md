# Implementation Plan: Backend API Foundation

**Branch**: `001-pdf-api-foundation` | **Date**: 2025-10-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-pdf-api-foundation/spec.md`

**Note**: This plan follows the `/speckit.plan` workflow with Phase 0 (Research), Phase 1 (Design), and Phase 2 (Tasks generation).

## Summary

Build a FastAPI-based REST API for asynchronous PDF comparison. The API accepts two PDF files via POST /api/v1/upload, stores them in S3/MinIO, queues a Celery background task using the pdf-diff library for comparison, and provides GET /api/v1/compare/:id for status polling. Results are returned as JSON with page coordinates and difference metadata. Core MVP feature with no authentication, no database persistence, minimal dependencies.

## Technical Context

**Language/Version**: Python 3.11+
**Primary Dependencies**: FastAPI 0.100+, Celery 5.3+, Redis 7.0+, boto3, pdf-diff (git submodule)
**Storage**: MinIO (local dev) / AWS S3 (production) via boto3
**Testing**: No automated tests in MVP (manual testing only per constitution)
**Target Platform**: Linux server (Docker containerized)
**Project Type**: Web API backend service (REST)
**Performance Goals**: 2-second upload response, 100 jobs/minute throughput, 30-second comparison for typical contracts
**Constraints**: 100MB max file size per PDF, 24-hour result caching, no blocking API calls
**Scale/Scope**: Single-tenant MVP, 3 core endpoints, 2 primary entities, Redis-backed job tracking

## Constitution Check

**GATE: Phase 0 Research Prerequisites**

✅ **Docker-First Architecture**: API will run in containerized FastAPI service with health checks
✅ **Modular Microservices Design**: Backend API service with independent Celery workers, Redis broker, S3 storage
✅ **Git Submodule Integration**: pdf-diff library integrated as submodule, imported via local pip dependency
✅ **Async-First Backend**: FastAPI async endpoints, Celery task queueing, 3-retry task resilience per constitution
✅ **MVP Minimalism**: No authentication, no PostgreSQL, no tests, minimal dependencies (FastAPI, Celery, boto3, redis-py, python-dotenv)
✅ **Environment Configuration**: S3_BUCKET, REDIS_URL, CELERY_BROKER_URL via .env per FR-014
✅ **Result Caching**: Redis-based 24-hour TTL per FR-010 and constitution Principle IV

**No violations detected.** All design choices align with constitution principles.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-pdf-api-foundation/
├── plan.md                  # This file
├── research.md              # Phase 0 research findings
├── data-model.md            # Phase 1 data model + entities
├── quickstart.md            # Phase 1 local dev setup
├── contracts/               # Phase 1 API contract specs
│   ├── openapi.json
│   └── upload.md
└── checklists/
    └── requirements.md      # Specification quality checklist
```

### Source Code (repository root)

```text
backend/
├── app.py                   # FastAPI application entry point
├── models/                  # Pydantic schemas and entities
│   ├── job.py              # ComparisonJob model
│   └── difference.py       # PDFDifference model
├── services/               # Business logic
│   ├── storage_service.py  # S3/MinIO file operations (boto3)
│   ├── comparison_service.py # Celery task coordination
│   └── pdf_processor.py    # pdf-diff library integration
├── api/                    # API routes
│   └── routes.py           # POST /upload, GET /compare/:id
├── requirements.txt        # Python dependencies
├── Dockerfile              # Multi-stage build, Python 3.11
└── .dockerignore           # Exclude venv, cache, tests

docker-compose.yml          # Services: backend, redis, celery-worker, minio

pdf-diff/                   # Git submodule (external)

nginx/
└── nginx.conf              # Reverse proxy config (routes /api/ to backend)
```

**Structure Decision**: Web application backend service model. API-only (no frontend in this feature), containerized backend with separate Celery worker and Redis. MinIO for local development, boto3 abstracting S3/MinIO differences.

---

## Complexity Tracking

> No violations to justify. All design decisions align with constitution MVP minimalism and async-first principles.

---

## Phase 0: Research & Unknowns

### Research Tasks

1. **PDF Comparison Coordinates**: Validate that pdf-diff library returns difference locations in PDF points (1/72 inch) and determine exact JSON structure for coordinates object
2. **Celery + Redis Integration Patterns**: Best practices for FastAPI + Celery + Redis setup, task result storage, retry strategies with exponential backoff
3. **S3/MinIO Abstraction**: Verify boto3 configuration supports both MinIO (local) and AWS S3 with environment-based endpoint switching
4. **File Upload Validation**: Best practices for multipart/form-data file validation (MIME type, size, format) in FastAPI
5. **Error Recovery**: Celery task failure handling, Redis caching of failed job states, meaningful error messages for users

### Research Findings

**PDF Comparison Coordinates** (pdf-diff library):
- Decision: pdf-diff returns diffs as structured dict with page numbers and bounding boxes
- Rationale: Standard library for PDF text extraction; supports page-level and coordinate-level diffs
- Assumption: Coordinates available in PDF points; if not, conversion from pixels needed post-integration

**Celery + Redis Patterns**:
- Decision: Use Celery 5.3+ with Redis broker, store task results in Redis with 24-hour TTL
- Rationale: Redis enables both message brokering and result caching; simple for MVP without database
- Pattern: FastAPI endpoint queues task, immediately returns job_id; polling endpoint retrieves status + cached results
- Retry strategy: Exponential backoff (1s, 2s, 4s) max 3 retries per FR-012
- Task idempotency: Celery task ID derived from input file keys to prevent re-processing identical pairs

**S3/MinIO Abstraction** (boto3):
- Decision: Use boto3 with endpoint_url parameter for MinIO (local), environment-driven for AWS S3
- Rationale: boto3 supports S3-compatible APIs; simple env-based configuration
- MinIO dev config: `S3_ENDPOINT_URL=http://minio:9000` (docker-compose), `S3_BUCKET=pdf-uploads`
- AWS prod config: `S3_ENDPOINT_URL` omitted (defaults to AWS), bucket in `S3_BUCKET`
- File keys: UUID-based (`{uuid}_{filename_hash}`) to prevent collisions

**File Upload Validation** (FastAPI):
- Decision: Validate MIME type (application/pdf), file size (<100MB), and PDF header magic bytes
- Rationale: MIME type check filters obvious non-PDFs; size check prevents resource exhaustion; magic bytes verify PDF format
- FastAPI approach: Use `UploadFile`, check `content_type`, validate `size` before storage

**Error Recovery**:
- Decision: Store error_message in Redis job record on task failure; include error context (pdf-diff exception, timeout, storage failure)
- Rationale: Users can inspect errors via GET /api/v1/compare/:id with status="failed"
- Meaningful messages: Distinguish "PDF corrupted" (pdf-diff error), "File too large" (validation), "Storage failed" (S3 error)

---

## Phase 1: Design & Contracts

### Data Model

**ComparisonJob** (Redis hash key: `job:{job_id}`)
```
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",  # UUID v4
  "status": "completed",                              # queued | processing | completed | failed
  "file1_key": "550e8400-e29b-41d4-a716-446655440000_contract_v1.pdf",
  "file2_key": "550e8400-e29b-41d4-a716-446655440001_contract_v2.pdf",
  "created_at": "2025-10-29T10:15:30Z",              # ISO 8601
  "started_at": "2025-10-29T10:15:31Z",
  "completed_at": "2025-10-29T10:15:45Z",
  "results": "{...JSON with differences}",           # Serialized JSON
  "error_message": null,
  "retry_count": 0
}
```

**PDFDifference** (part of results JSON)
```
{
  "page_number": 2,
  "diff_type": "modified",                           # added | removed | modified | page_change
  "coordinates": {
    "x": 50.5,                                        # PDF points (1/72 inch)
    "y": 100.25,
    "width": 200.0,
    "height": 20.5
  },
  "description": "Text changed in Section 2.1",
  "before_text": "Original text here",               # Optional, only for modified
  "after_text": "Updated text here"                 # Optional, only for modified
}
```

### API Contracts

**POST /api/v1/upload** - Upload PDFs for comparison

Request:
```
POST /api/v1/upload HTTP/1.1
Content-Type: multipart/form-data

file1: (binary PDF, max 100MB)
file2: (binary PDF, max 100MB)
```

Response (200 OK):
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "created_at": "2025-10-29T10:15:30Z"
}
```

Error Responses:
- 400 Bad Request: Missing files, invalid MIME type
- 413 Payload Too Large: File exceeds 100MB
- 500 Internal Server Error: Storage/queueing failure

---

**GET /api/v1/compare/:id** - Poll job status and results

Request:
```
GET /api/v1/compare/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
```

Response (200 OK - Processing):
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "created_at": "2025-10-29T10:15:30Z",
  "started_at": "2025-10-29T10:15:31Z",
  "estimated_completion_time": "2025-10-29T10:15:50Z"
}
```

Response (200 OK - Completed):
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "created_at": "2025-10-29T10:15:30Z",
  "started_at": "2025-10-29T10:15:31Z",
  "completed_at": "2025-10-29T10:15:45Z",
  "differences": [
    {
      "page_number": 1,
      "diff_type": "modified",
      "coordinates": { "x": 50.5, "y": 100.25, "width": 200.0, "height": 20.5 },
      "description": "Text changed",
      "before_text": "Original",
      "after_text": "Updated"
    }
  ]
}
```

Response (200 OK - Failed):
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "created_at": "2025-10-29T10:15:30Z",
  "error_message": "PDF is corrupted or not readable"
}
```

Error Responses:
- 404 Not Found: Job ID does not exist

---

### OpenAPI Schema

Generated at: `specs/001-pdf-api-foundation/contracts/openapi.json`

Full OpenAPI 3.0.0 spec with:
- POST /api/v1/upload endpoint with file upload parameters
- GET /api/v1/compare/{id} endpoint with UUID path parameter
- Response schemas for queued, processing, completed, failed states
- Error response schemas with status codes and messages
- Component schemas for ComparisonJob and PDFDifference

---

### Development Workflow (Quickstart)

**Local Development Setup**:

1. Clone with submodules: `git clone --recursive <repo>`
2. Copy `.env.example` to `.env`:
   ```
   REDIS_URL=redis://redis:6379
   CELERY_BROKER_URL=redis://redis:6379/0
   S3_BUCKET=pdf-uploads
   S3_ENDPOINT_URL=http://minio:9000
   MINIO_ROOT_USER=minioadmin
   MINIO_ROOT_PASSWORD=minioadmin
   ```
3. Start services: `docker-compose up -d`
4. API accessible at `http://localhost/api/` (via Nginx)
5. MinIO console: `http://localhost:9001`
6. Redis CLI: `docker-compose exec redis redis-cli`

**Development Workflow**:
- Edit `backend/app.py`, `backend/models/`, `backend/services/`
- FastAPI auto-reloads on file changes (if dev mode enabled)
- Celery worker logs: `docker-compose logs -f celery-worker`
- Test upload: `curl -F "file1=@test1.pdf" -F "file2=@test2.pdf" http://localhost/api/v1/upload`
- Test status: `curl http://localhost/api/v1/compare/{job_id}`

**Docker Build**:
```dockerfile
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0"]
```

---

## Phase 2: Tasks Generation

Tasks will be generated via `/speckit.tasks` command based on:
- User stories from spec.md (3 P1 user stories)
- Functional requirements (FR-001 through FR-015)
- Data model entities (ComparisonJob, PDFDifference)
- API contracts (POST /upload, GET /compare/:id)

Expected task phases:
1. **Setup**: Project initialization, Docker structure
2. **Foundational**: Core services (storage, celery, redis integration)
3. **User Story 1** (P1): File upload endpoint + validation
4. **User Story 2** (P1): Status polling endpoint + caching
5. **User Story 3** (P1): JSON response structure with coordinates
6. **Polish**: Error handling, logging, documentation

---

## Next Steps

✅ Plan complete. Ready for task generation via `/speckit.tasks`.

Run: `speckit.tasks` to generate actionable task list with dependency ordering.
