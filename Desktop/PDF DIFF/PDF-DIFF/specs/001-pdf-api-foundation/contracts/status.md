# API Contract: GET /api/v1/compare/:id

**Endpoint**: `GET /api/v1/compare/{job_id}`
**Purpose**: Poll job status and retrieve comparison results
**Authentication**: None (MVP single-tenant)
**Content-Type**: `application/json`

## Request

### Headers

```
GET /api/v1/compare/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: localhost
Accept: application/json
```

### Path Parameters

| Parameter | Type | Required | Description | Constraints |
|-----------|------|----------|-------------|-----------|
| job_id | String (UUID) | Yes | Unique identifier from upload response | Valid UUID v4 format |

### Example Request (curl)

```bash
curl -X GET http://localhost/api/v1/compare/550e8400-e29b-41d4-a716-446655440000
```

### Example Request (JavaScript/Fetch)

```javascript
const response = await fetch('/api/v1/compare/550e8400-e29b-41d4-a716-446655440000');
const data = await response.json();
```

---

## Responses

### 200 OK - Queued

Job received but not yet processed.

**Response Body**:

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "created_at": "2025-10-29T10:15:30Z"
}
```

---

### 200 OK - Processing

Job is currently being processed by Celery worker.

**Response Body**:

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "created_at": "2025-10-29T10:15:30Z",
  "started_at": "2025-10-29T10:15:31Z",
  "estimated_completion_time": "2025-10-29T10:15:50Z"
}
```

**Schema**:

| Field | Type | Description |
|-------|------|-------------|
| job_id | String (UUID) | Unique job identifier |
| status | String | "processing" |
| created_at | String (ISO 8601) | When job was created |
| started_at | String (ISO 8601) | When Celery worker started processing |
| estimated_completion_time | String (ISO 8601) | Estimated time when results available |

---

### 200 OK - Completed

Comparison finished successfully. Results available.

**Response Body**:

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
      "coordinates": {
        "x": 50.5,
        "y": 100.25,
        "width": 200.0,
        "height": 20.5
      },
      "description": "Clause 2.1 text updated",
      "before_text": "The term shall commence on January 1, 2024.",
      "after_text": "The term shall commence on January 1, 2025."
    },
    {
      "page_number": 5,
      "diff_type": "added",
      "page_level": true,
      "coordinates": {
        "x": 0,
        "y": 0,
        "width": 612,
        "height": 792
      },
      "description": "New page added: Schedule B - Additional Terms"
    }
  ]
}
```

**Schema**:

| Field | Type | Description |
|-------|------|-------------|
| job_id | String (UUID) | Unique job identifier |
| status | String | "completed" |
| created_at | String (ISO 8601) | When job was created |
| started_at | String (ISO 8601) | When processing started |
| completed_at | String (ISO 8601) | When processing finished |
| differences | Array | Array of PDFDifference objects |

**Difference Object Schema**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| page_number | Integer | Yes | 1-indexed page number |
| diff_type | String | Yes | One of: added, removed, modified, page_change |
| coordinates | Object | Yes | Bounding box in PDF points {x, y, width, height} |
| description | String | Yes | Human-readable description of change |
| before_text | String | No | Original text (only for diff_type="modified") |
| after_text | String | No | Updated text (only for diff_type="modified") |
| page_level | Boolean | No | True if entire page added/removed |

---

### 200 OK - Failed

Comparison encountered error and cannot continue.

**Response Body**:

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "created_at": "2025-10-29T10:15:30Z",
  "started_at": "2025-10-29T10:15:31Z",
  "completed_at": "2025-10-29T10:15:45Z",
  "error_message": "PDF is corrupted or not readable"
}
```

**Possible Error Messages**:

| Error | Cause | Recoverable |
|-------|-------|-----------|
| "PDF is corrupted or not readable" | pdf-diff exception, invalid PDF | No |
| "File exceeds 100MB limit" | Validation failure during upload | No |
| "Storage service temporarily unavailable" | S3/MinIO timeout/failure | Yes |
| "Processing took too long; try smaller files" | Celery task timeout | No |
| "Unexpected error occurred; please retry later" | Unknown exception | Yes |

---

### 404 Not Found

Job ID does not exist or has expired.

**Response Body**:

```json
{
  "detail": "Job not found"
}
```

**Possible Causes**:
- Invalid job_id (typo, wrong UUID)
- Job expired (older than 24 hours)
- Job never created (upload failed)

---

## Polling Strategy

### Recommended Frontend Implementation

```typescript
async function pollComparison(jobId: string, maxWaitMs: number = 60000): Promise<ComparisonResult> {
  const startTime = Date.now();
  const pollIntervalMs = 500; // Poll every 500ms

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(`/api/v1/compare/${jobId}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Job not found');
      }
      throw new Error('Request failed');
    }

    const data = await response.json();

    if (data.status === 'completed') {
      return data;
    }

    if (data.status === 'failed') {
      throw new Error(data.error_message);
    }

    // Still queued or processing, wait and retry
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error('Polling timeout exceeded');
}
```

### Polling Performance

- **Initial Response**: < 100ms if job still in Redis
- **Typical Poll Frequency**: 500ms-1s (balance responsiveness vs. load)
- **Success Rate**: ~95% on first or second poll for typical 10-50 page contracts
- **Timeout**: ~30 seconds for typical contracts (per SC-003)

### Exponential Backoff (Advanced)

For production robustness:

```typescript
async function pollWithBackoff(jobId: string): Promise<ComparisonResult> {
  let interval = 500; // Start at 500ms
  const maxInterval = 5000; // Cap at 5s
  const maxRetries = 120; // Max 10 minutes total

  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(`/api/v1/compare/${jobId}`);
    const data = await response.json();

    if (data.status === 'completed' || data.status === 'failed') {
      return data;
    }

    await new Promise(resolve => setTimeout(resolve, interval));
    interval = Math.min(interval * 1.5, maxInterval); // Increase interval
  }

  throw new Error('Polling timeout exceeded');
}
```

---

## Caching

**Backend**: Results cached in Redis with 24-hour TTL
- Multiple polls within 24 hours return identical results
- No re-processing of identical file pairs (per FR-010)

**Frontend**: No HTTP caching headers sent (results may change if job retried)
- Client-side cache not recommended
- Always poll for fresh status

---

## Performance Characteristics

- **Response Time**: < 100ms (Redis lookup only, no processing)
- **Throughput**: 1000s of concurrent polls supported
- **Cache Hit Rate**: 100% after job completion (24-hour window)

---

## Example Integration

### React Component with Polling

```typescript
import { useState, useEffect } from 'react';

interface ComparisonResult {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  differences?: any[];
  error_message?: string;
}

export function ComparisonResults({ jobId }: { jobId: string }) {
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function poll() {
      try {
        const response = await fetch(`/api/v1/compare/${jobId}`);
        const data = await response.json();

        if (isActive) {
          setResult(data);

          if (data.status === 'completed' || data.status === 'failed') {
            return; // Stop polling
          }

          // Continue polling
          setTimeout(poll, 500);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      }
    }

    poll();
    return () => {
      isActive = false;
    };
  }, [jobId]);

  if (error) return <div>Error: {error}</div>;
  if (!result) return <div>Loading...</div>;

  if (result.status === 'queued') {
    return <div>Waiting to be processed...</div>;
  }

  if (result.status === 'processing') {
    return <div>Processing... Estimated completion: {result.estimated_completion_time}</div>;
  }

  if (result.status === 'failed') {
    return <div>Error: {result.error_message}</div>;
  }

  return (
    <div>
      <h2>Comparison Results ({result.differences.length} differences)</h2>
      {result.differences.map((diff, i) => (
        <div key={i}>
          <h3>Page {diff.page_number}: {diff.description}</h3>
          {diff.before_text && (
            <div>
              <strong>Before:</strong> {diff.before_text}
            </div>
          )}
          {diff.after_text && (
            <div>
              <strong>After:</strong> {diff.after_text}
            </div>
          )}
          <div>Coordinates: ({diff.coordinates.x}, {diff.coordinates.y}) {diff.coordinates.width}x{diff.coordinates.height}</div>
        </div>
      ))}
    </div>
  );
}
```

---

## Changelog

- **v1.0.0** (2025-10-29): Initial release, MVP specification
