# API Contract: POST /api/v1/upload

**Endpoint**: `POST /api/v1/upload`
**Purpose**: Upload two PDF files for comparison and queue asynchronous processing
**Authentication**: None (MVP single-tenant)
**Content-Type**: `multipart/form-data`

## Request

### Headers

```
POST /api/v1/upload HTTP/1.1
Host: localhost
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary
```

### Body Parameters

| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-----------|
| file1 | File (binary) | Yes | First PDF document | Content-Type: application/pdf, Max: 100MB |
| file2 | File (binary) | Yes | Second PDF document | Content-Type: application/pdf, Max: 100MB |

### Example Request (curl)

```bash
curl -X POST http://localhost/api/v1/upload \
  -F "file1=@contract_v1.pdf" \
  -F "file2=@contract_v2.pdf"
```

### Example Request (JavaScript/Fetch)

```javascript
const formData = new FormData();
formData.append('file1', file1Blob, 'contract_v1.pdf');
formData.append('file2', file2Blob, 'contract_v2.pdf');

const response = await fetch('http://localhost/api/v1/upload', {
  method: 'POST',
  body: formData,
});

const data = await response.json();
```

---

## Responses

### 200 OK - Success

Files validated, stored, and comparison job queued.

**Response Body**:

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "created_at": "2025-10-29T10:15:30Z"
}
```

**Schema**:

| Field | Type | Description |
|-------|------|-------------|
| job_id | String (UUID) | Unique identifier for this comparison job |
| status | String | Always "queued" on successful upload |
| created_at | String (ISO 8601) | Server timestamp when job created (UTC) |

---

### 400 Bad Request - Invalid Input

One or both files failed validation.

**Possible Causes**:
- Missing file parameter (file1 or file2)
- Invalid MIME type (not application/pdf)
- File is not a valid PDF (invalid magic bytes)
- Empty file (0 bytes)

**Response Body**:

```json
{
  "detail": "File must be application/pdf"
}
```

Or:

```json
{
  "detail": "File is not a valid PDF"
}
```

---

### 413 Payload Too Large

One or both files exceed 100MB size limit.

**Response Body**:

```json
{
  "detail": "File exceeds 100MB limit"
}
```

---

### 500 Internal Server Error

Server encountered unexpected error during file storage or job queueing.

**Response Body**:

```json
{
  "detail": "Failed to store files or queue comparison job. Please retry."
}
```

**Possible Causes**:
- S3/MinIO storage service unavailable
- Redis/Celery broker unavailable
- Disk space exhausted

---

## Processing Flow

1. **Validation** (request handler)
   - Check both file1 and file2 present
   - Validate MIME type = application/pdf
   - Validate file size < 100MB
   - Validate PDF magic bytes (%PDF-)

2. **Storage** (storage service)
   - Generate UUID for job_id
   - Generate unique S3 keys for each file: `{uuid}_{filename_hash}`
   - Upload file1 to S3/MinIO, store key
   - Upload file2 to S3/MinIO, store key

3. **Job Creation** (job service)
   - Create ComparisonJob record in Redis with status="queued"
   - Set TTL=86400 seconds (24 hours)
   - Store file1_key and file2_key in job record

4. **Task Queueing** (comparison service)
   - Queue Celery task: `compare_pdfs(file1_key, file2_key, job_id)`
   - Task starts asynchronously in Celery worker

5. **Response**
   - Return job_id and status="queued" to client
   - Client polls GET /api/v1/compare/{job_id} for results

---

## Idempotency

**Not idempotent**: Same files uploaded twice will create two separate jobs with different job_ids. This is acceptable for MVP.

Post-MVP enhancement: Add optional `idempotency_key` header for exactly-once semantics (prevent duplicate uploads from network retries).

---

## Performance Characteristics

- **Response Time**: < 2 seconds (per SC-001)
  - File validation: < 100ms
  - File storage: < 1.5s (S3/MinIO upload)
  - Job creation + task queueing: < 400ms

- **Concurrent Capacity**: 100 jobs/minute (per SC-002)
  - Horizontal scaling: Add Nginx load balancer in docker-compose for multiple API instances

- **File Size**: Streaming upload (not buffered in memory)
  - Large files don't cause memory spikes

---

## Example Integration

### React Component (Frontend)

```typescript
async function uploadPDFs(file1: File, file2: File): Promise<string> {
  const formData = new FormData();
  formData.append('file1', file1);
  formData.append('file2', file2);

  const response = await fetch('/api/v1/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Upload failed');
  }

  const data = await response.json();
  return data.job_id; // Use for polling status
}
```

### Python Client (Backend Integration)

```python
import requests

def upload_pdfs(file1_path: str, file2_path: str) -> str:
    """Upload PDFs and return job_id"""
    with open(file1_path, 'rb') as f1, open(file2_path, 'rb') as f2:
        files = {
            'file1': ('contract_v1.pdf', f1, 'application/pdf'),
            'file2': ('contract_v2.pdf', f2, 'application/pdf'),
        }
        response = requests.post('http://localhost:8000/api/v1/upload', files=files)
        response.raise_for_status()
        return response.json()['job_id']
```

---

## Security Considerations

- **File Validation**: Magic bytes check prevents disguised executables
- **Size Limits**: 100MB per file prevents DoS via disk exhaustion
- **Unique Keys**: UUID-based storage prevents enumeration attacks
- **MIME Type**: application/pdf only (no arbitrary file types)
- **No Path Traversal**: S3 keys generated server-side, not from user input

---

## Changelog

- **v1.0.0** (2025-10-29): Initial release, MVP specification
