# Feature Specification: Backend API Foundation

**Feature Branch**: `001-pdf-api-foundation`
**Created**: 2025-10-29
**Status**: Draft
**Input**: User description: "Backend API foundation - REST API for PDF comparison using pdf-diff library. Accept two PDF files via POST /api/v1/upload, validate and store to S3, queue Celery background task for comparison using pdf-diff, provide GET /api/v1/compare/:id for status polling, return diff results as JSON with page coordinates for highlighting. Use FastAPI async, Celery with Redis broker, boto3 for S3 storage. Structure: app.py entry, services/ folder (pdf_processor.py imports pdf-diff, comparison_service.py, storage_service.py), models/ folder for schemas."

## User Scenarios & Testing

### User Story 1 - Upload PDF Files for Comparison (Priority: P1)

A developer or client application uploads two PDF documents (contract versions) to the API and receives confirmation that the files are ready for processing.

**Why this priority**: Core MVP feature. Users cannot compare PDFs without uploading them first. This is the entry point for the entire system.

**Independent Test**: Can be fully tested by uploading two valid PDFs via POST /api/v1/upload, receiving a job ID, and confirming files are stored in object storage.

**Acceptance Scenarios**:

1. **Given** the API is running and accessible, **When** a user POSTs two PDF files to /api/v1/upload with proper multipart form data, **Then** the API returns HTTP 200 with a JSON response containing a job ID (UUID) and status "queued"

2. **Given** two valid PDF files are uploaded, **When** the storage service processes the request, **Then** both files are stored in S3/MinIO with unique object keys and remain accessible for at least 24 hours

3. **Given** a user uploads files with invalid MIME types, **When** validation occurs, **Then** the API returns HTTP 400 with a descriptive error message (e.g., "File must be application/pdf")

4. **Given** a user uploads PDF files larger than 100MB, **When** validation occurs, **Then** the API returns HTTP 413 with appropriate error message

---

### User Story 2 - Poll Job Status for Comparison Results (Priority: P1)

A client application polls the API for comparison job status and retrieves the PDF diff results once processing is complete.

**Why this priority**: Equally critical to upload functionality. Users need a way to retrieve comparison results asynchronously. This is the core value delivery mechanism.

**Independent Test**: Can be fully tested by uploading files (US1), waiting for background processing, then polling GET /api/v1/compare/:id multiple times until results are available and verifying the response structure.

**Acceptance Scenarios**:

1. **Given** a job is queued after file upload, **When** a user GETs /api/v1/compare/:id, **Then** the API returns HTTP 200 with status "processing" and estimated_completion_time (if available)

2. **Given** a PDF comparison is complete, **When** a user GETs /api/v1/compare/:id, **Then** the API returns HTTP 200 with status "completed" and a JSON diff object containing highlighted differences

3. **Given** a comparison job failed during processing, **When** a user GETs /api/v1/compare/:id, **Then** the API returns HTTP 200 with status "failed" and an error_message describing the failure reason

4. **Given** a user requests a non-existent job ID, **When** a GET request is made to /api/v1/compare/:invalid-id, **Then** the API returns HTTP 404 with error message "Job not found"

5. **Given** a comparison is complete, **When** a user GETs /api/v1/compare/:id multiple times within 24 hours, **Then** the API returns the same cached results each time (no re-processing)

---

### User Story 3 - Frontend Receives Diff Results with Page Coordinates (Priority: P1)

The frontend receives comparison results in a structured JSON format that includes page-level and coordinate information for highlighting differences on the UI.

**Why this priority**: Critical for frontend integration and user visibility. Without proper data structure, the frontend cannot display highlighted differences.

**Independent Test**: Can be fully tested by examining the JSON response structure after a successful comparison (US2), validating that it contains required fields (page numbers, coordinates, diff types) without needing to render UI.

**Acceptance Scenarios**:

1. **Given** a PDF comparison is complete, **When** results are retrieved via GET /api/v1/compare/:id, **Then** the response includes a "differences" array with objects containing: page_number (int), diff_type (enum: added/removed/modified), coordinates (object with x, y, width, height in points), and description (string)

2. **Given** multiple differences exist on a single page, **When** results are returned, **Then** differences are grouped by page_number and include distinct bounding boxes for each difference

3. **Given** text content differs between PDFs, **When** comparison results are returned, **Then** diff_type is "modified" and the response includes before_text and after_text fields for that difference

4. **Given** a page is added or removed in the newer PDF, **When** results are returned, **Then** a difference object is included with page_level=true and diff_type "added" or "removed" (as appropriate)

---

### Edge Cases

- What happens when a user uploads the same PDF file twice (identical file contents)?
- How does the system handle PDFs with scanned images vs. searchable text?
- What happens if one PDF file is corrupted or unreadable?
- How does the system handle very large PDFs (hundreds of pages)?
- What happens if the Celery worker crashes during processing?

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST accept POST requests to /api/v1/upload with two PDF files in multipart/form-data format

- **FR-002**: System MUST validate uploaded files are in PDF format (application/pdf MIME type) before storing

- **FR-003**: System MUST store uploaded PDF files to S3 or MinIO object storage with unique UUID-based keys

- **FR-004**: System MUST queue a Celery background task immediately after successful file storage

- **FR-005**: System MUST return a unique job ID (UUID) to the client after file upload with status "queued"

- **FR-006**: System MUST provide a GET /api/v1/compare/:id endpoint for status polling

- **FR-007**: System MUST return job status as one of: "queued", "processing", "completed", "failed"

- **FR-008**: System MUST invoke pdf-diff library to compare two PDFs and extract differences with page and coordinate information

- **FR-009**: System MUST return comparison results as JSON with structure: { status, job_id, created_at, completed_at, differences: [{ page_number, diff_type, coordinates, description, before_text?, after_text? }] }

- **FR-010**: System MUST cache comparison results in Redis for at least 24 hours to avoid re-processing identical file pairs

- **FR-011**: System MUST handle PDF processing errors gracefully and store error message with job record for user retrieval

- **FR-012**: System MUST support Celery task retries with exponential backoff (max 3 retries) for transient failures

- **FR-013**: System MUST provide FastAPI async endpoints (no blocking calls in request/response handlers)

- **FR-014**: System MUST use environment variables for configuration: S3_BUCKET, REDIS_URL, CELERY_BROKER_URL

- **FR-015**: System MUST validate PDF file size before processing (maximum 100MB per file)

---

### Key Entities

- **ComparisonJob**: Represents a PDF comparison task. Attributes: job_id (UUID), status (enum: queued/processing/completed/failed), uploaded_file_1_key (string), uploaded_file_2_key (string), created_at (datetime), started_at (datetime), completed_at (datetime), results (JSON), error_message (string)

- **PDFDifference**: Represents a single difference between two PDFs. Attributes: page_number (int), diff_type (enum: added/removed/modified), coordinates (object with x, y, width, height), description (string), before_text (string, optional), after_text (string, optional)

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can upload two PDF files and receive a job ID within 2 seconds of submission

- **SC-002**: System can queue up to 100 comparison jobs per minute without timeouts or dropped requests

- **SC-003**: Comparison results are available to the client within 30 seconds for PDFs under 10 pages

- **SC-004**: API maintains 99% availability with proper error handling and no unhandled exceptions leaking to client

- **SC-005**: Cached comparison results are reused (no re-processing) when identical file pairs are compared again within 24 hours

- **SC-006**: System successfully processes and returns differences for PDFs with varying complexity (text-only, text+images, scanned documents where readable)

- **SC-007**: JSON response structure conforms to specification (all required fields present, proper data types, valid coordinates in points)

- **SC-008**: Failed jobs provide meaningful error messages to users (e.g., "PDF is corrupted" vs. generic "Processing failed")

---

## Assumptions

- **PDF file size**: Maximum 100MB per file (standard for web uploads, confirmed by user)
- **Processing time**: PDF comparison is expected to complete within 30 seconds for typical contracts (10-50 pages); more complex PDFs may take longer
- **Coordinate system**: Diff coordinates are returned in PDF points (1/72 inch), a standard in PDF specifications, allowing frontend to map to pixel coordinates
- **Text content focus**: Initial implementation prioritizes text-level differences; image-only differences may not be detected if PDFs are scanned without OCR
- **Single-tenant MVP**: No multi-tenancy, user authentication, or rate limiting in MVP (per constitution MVP minimalism constraints)
- **Result retention**: Comparison results cached for 24 hours; older results are deleted from Redis to manage memory
