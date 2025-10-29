# Research: Backend API Foundation

**Feature**: 001-pdf-api-foundation
**Date**: 2025-10-29
**Status**: Complete

## Resolved Questions

### 1. PDF Comparison Coordinates & pdf-diff Library Integration

**Question**: How does the pdf-diff library return difference locations? What format are coordinates in?

**Decision**: pdf-diff library returns differences as a structured data structure with page numbers and bounding box coordinates. Coordinates are expected in PDF points (1/72 inch), a standard PDF measurement unit.

**Rationale**:
- pdf-diff is the chosen library per specification and constitution (Principle III: Git Submodule Integration)
- PDF points are industry standard for PDF coordinate systems
- Allows frontend to directly map coordinates to pixel positions via DPI conversion (96 DPI typical: points × 96/72)
- No need for intermediate coordinate system transformations

**Alternatives Considered**:
- Custom coordinate parsing: Avoided - unnecessary if pdf-diff provides structured output
- Pixel-based coordinates: Rejected - PDF points are standard; conversion happens in frontend

**Action Items**:
- Validate pdf-diff output schema during implementation (Task: Integration Testing)
- Document coordinate mapping formula in API documentation
- Confirm pdf-diff dependency version compatibility with Python 3.11

---

### 2. Celery + Redis Integration Patterns for FastAPI

**Question**: What are best practices for FastAPI + Celery + Redis integration? How do we store results and implement retries?

**Decision**: Use Celery 5.3+ with Redis as both message broker (task queueing) and result backend (job status/results caching). FastAPI endpoints are async; Celery tasks run synchronously in worker processes. Task results cached in Redis with 24-hour TTL. Implement exponential backoff retries (max 3) for transient failures.

**Rationale**:
- FastAPI async endpoints don't block on I/O, maintaining responsiveness
- Redis dual-purpose (broker + backend) simplifies infrastructure vs. separate solutions
- 24-hour TTL balances result availability with Redis memory usage
- Exponential backoff (1s, 2s, 4s delays) handles transient failures (network blips, temporary S3 outages)
- Task idempotency (same input file pair → same task ID) prevents duplicate processing

**Alternatives Considered**:
- PostgreSQL result backend: Rejected - violates MVP Minimalism constraint (no relational DB)
- In-memory result storage: Rejected - no durability; Redis provides both caching and persistence
- Linear retry strategy: Rejected - exponential backoff more efficient for resource constraints

**Celery Configuration**:
```python
celery_app.conf.update(
    broker_url=settings.CELERY_BROKER_URL,
    result_backend=settings.CELERY_BROKER_URL,  # Redis handles both
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='UTC',
    enable_utc=True,
)

# Task-specific retry configuration
@celery_app.task(bind=True, max_retries=3, autoretry_for=(Exception,),
                 retry_backoff=True, retry_backoff_max=600, retry_jitter=True)
def compare_pdfs(self, file1_key, file2_key, job_id):
    try:
        # Task implementation
        pass
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
```

---

### 3. S3/MinIO Abstraction with boto3

**Question**: How do we abstract storage to work with both MinIO (local) and AWS S3 using boto3?

**Decision**: Use boto3 client with environment-driven endpoint URL configuration. For local dev, set `S3_ENDPOINT_URL=http://minio:9000`. For production, omit `S3_ENDPOINT_URL` to use AWS S3 defaults. File keys use UUID + content hash: `{uuid}_{filename_slug}`.

**Rationale**:
- boto3 supports S3-compatible endpoints via endpoint_url parameter
- Environment configuration enables runtime switching without code changes
- UUID-based keys prevent collisions and user enumeration attacks
- Content hash ensures deduplication (same file contents = same key)
- Aligns with constitution Principle VII: Flexible Storage Strategy

**Implementation Pattern**:
```python
# boto3 client initialization
s3_client = boto3.client(
    's3',
    endpoint_url=settings.S3_ENDPOINT_URL,  # http://minio:9000 (dev) or None (AWS)
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION,
)

# File upload with generated key
import uuid
file_key = f"{uuid.uuid4()}_{hash_filename(original_name)}"
s3_client.put_object(Bucket=settings.S3_BUCKET, Key=file_key, Body=file_bytes)
```

**MinIO Local Dev Setup**:
- Docker Compose includes `minio` service on port 9000
- Initial bucket creation: `aws s3api create-bucket --bucket pdf-uploads --endpoint-url http://localhost:9000`
- Credentials: `MINIO_ROOT_USER=minioadmin`, `MINIO_ROOT_PASSWORD=minioadmin`

**AWS Production Setup**:
- S3 bucket pre-created: `pdf-uploads` (or parameterized per tenant post-MVP)
- IAM role/credentials with s3:GetObject, s3:PutObject, s3:DeleteObject permissions
- Optional: CloudFront CDN for file downloads (future enhancement)

---

### 4. FastAPI File Upload Validation

**Question**: What are best practices for validating multipart file uploads in FastAPI?

**Decision**: Implement three-layer validation: (1) FastAPI UploadFile content_type check, (2) file size check before storage, (3) PDF magic bytes validation (header verification).

**Rationale**:
- MIME type check (`application/pdf`) filters obviously invalid files
- Size check (<100MB) prevents resource exhaustion and timeout before storage
- Magic bytes verification (`%PDF-`) ensures actual PDF format (prevents spoofing)
- FastAPI UploadFile streaming prevents loading full file into memory

**Implementation**:
```python
from fastapi import UploadFile, HTTPException

async def validate_pdf_upload(file: UploadFile):
    # Check MIME type
    if file.content_type not in ['application/pdf', 'application/x-pdf']:
        raise HTTPException(status_code=400, detail="File must be application/pdf")

    # Check file size (read in chunks)
    max_size = 100 * 1024 * 1024  # 100MB
    size = 0
    file_bytes = b''
    async for chunk in file.file:
        size += len(chunk)
        file_bytes += chunk  # For magic bytes check
        if size > max_size:
            raise HTTPException(status_code=413, detail="File exceeds 100MB limit")

    # Check PDF magic bytes
    if not file_bytes.startswith(b'%PDF-'):
        raise HTTPException(status_code=400, detail="File is not a valid PDF")

    return file_bytes
```

**Validation Response Codes** (per FR specification):
- 400 Bad Request: Invalid MIME type, invalid PDF format, missing files
- 413 Payload Too Large: File > 100MB
- 200 OK: Valid files accepted and queued

---

### 5. Celery Task Failure Handling & Error Messages

**Question**: How do we handle task failures gracefully and provide meaningful error messages to users?

**Decision**: On task failure, catch exceptions, extract error context, store error_message in Redis job record. Distinguish between PDF processing errors (corrupted file), storage errors (S3 failure), and system errors (worker crash). Return error_message in GET /compare/:id response with status="failed".

**Rationale**:
- Users need visibility into failure reasons for debugging (FR-011)
- Different error types inform retry strategies (corrupted PDF: no retry; S3 timeout: retry)
- Meaningful messages reduce support burden (FR-008: distinguish "PDF corrupted" vs. generic "Processing failed")
- Aligns with constitution Principle IV: Async-First Backend (handle failures gracefully)

**Error Categories**:

| Error Type | Cause | User Message | Retry? |
|-----------|-------|--------------|--------|
| PDFProcessingError | pdf-diff exception, corrupted file | "PDF is corrupted or not readable" | No |
| FileSizeError | File exceeds limits | "Uploaded file exceeds 100MB limit" | No |
| StorageError | S3/MinIO unavailable | "Storage service temporarily unavailable" | Yes (via Celery retry) |
| TimeoutError | Processing > 30s | "Comparison took too long; try smaller files" | No |
| UnknownError | Unexpected exception | "An unexpected error occurred; please retry later" | Yes (via Celery retry) |

**Implementation**:
```python
@celery_app.task(bind=True, max_retries=3)
def compare_pdfs(self, file1_key, file2_key, job_id):
    try:
        # Storage retrieval
        file1 = storage_service.download(file1_key)
        file2 = storage_service.download(file2_key)

        # PDF comparison
        diffs = pdf_processor.compare(file1, file2)

        # Cache results
        cache_service.set_job_status(job_id, 'completed', results=diffs)
    except PDFProcessingError as e:
        cache_service.set_job_status(job_id, 'failed', error=str(e))
    except StorageError as e:
        # Retry for transient storage failures
        raise self.retry(exc=e, countdown=2 ** self.request.retries)
    except Exception as e:
        cache_service.set_job_status(job_id, 'failed', error=f"Unexpected error: {type(e).__name__}")
```

---

## Technology Stack Confirmation

### Python 3.11+
- Chosen for FastAPI compatibility, async/await support, type hints
- Docker image: `python:3.11-slim`

### FastAPI 0.100+
- Async web framework aligned with Celery async workers
- Built-in request validation (Pydantic)
- Auto-generated OpenAPI schema

### Celery 5.3+
- Async task queue supporting Redis broker
- Built-in retry logic with exponential backoff
- Task result backend support (Redis)

### Redis 7.0+
- Message broker for Celery task queueing
- Result backend for job status and cached results
- Efficient TTL management for 24-hour result retention

### boto3 (AWS SDK)
- S3-compatible API for MinIO and AWS S3
- Environment-driven endpoint configuration

### pdf-diff (Git Submodule)
- PDF comparison library per specification
- Local dependency via editable pip install

### python-dotenv
- Environment variable loading from .env file
- Development convenience (not suitable for production secrets)

### Dependencies Minimal Per MVP:
- fastapi==0.100.1
- uvicorn==0.23.0 (ASGI server)
- celery==5.3.0
- redis==5.0.0 (Python Redis client)
- boto3==1.26.0
- python-dotenv==1.0.0
- pydantic==2.0.0 (included with FastAPI)

---

## Outstanding Assumptions

1. **pdf-diff Library Output**: Assumption that pdf-diff returns structured differences with page numbers and coordinates. Will be validated during implementation (Task: Integration Testing Phase).

2. **30-Second Processing Time**: Success Criterion SC-003 assumes typical contracts (10-50 pages) process within 30 seconds. Actual time depends on PDF complexity and hardware. May require task timeout adjustment post-MVP.

3. **Redis Persistence**: Assumption that Redis-only job storage (no database) is acceptable for MVP. Results lost if Redis restarts; acceptable risk for MVP validation.

4. **pdf-diff Coordinate Accuracy**: Assumption that pdf-diff provides accurate page coordinates for highlight rendering. Frontend will need DPI conversion and layout testing to validate pixel-perfect rendering.

---

## Next Steps

All research questions resolved. Ready for Phase 1 (Design & Contracts) tasks:
1. ✅ Plan.md updated with research findings
2. ⏳ Generate data-model.md with entity schemas
3. ⏳ Create API contracts (OpenAPI schema)
4. ⏳ Write quickstart.md development guide
5. ⏳ Update agent context with technology stack

Proceed with `/speckit.tasks` to generate implementation task list.
