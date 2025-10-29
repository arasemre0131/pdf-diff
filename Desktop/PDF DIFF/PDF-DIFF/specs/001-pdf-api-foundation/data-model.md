# Data Model: Backend API Foundation

**Feature**: 001-pdf-api-foundation
**Date**: 2025-10-29
**Status**: Final

## Entity Overview

The system manages two primary entities:

1. **ComparisonJob** - Represents a PDF comparison task from upload to completion
2. **PDFDifference** - Represents a single difference detected between two PDFs

No relational database used in MVP; entities stored in Redis as serialized JSON.

---

## ComparisonJob

**Purpose**: Tracks state and results of a single PDF comparison operation

**Storage**: Redis hash key: `job:{job_id}` with automatic 24-hour expiration

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|-----------|
| job_id | UUID string | Yes | Unique identifier for comparison job | UUID v4 format, immutable |
| status | Enum | Yes | Current job state | One of: queued, processing, completed, failed |
| file1_key | String | Yes | S3/MinIO object key for first PDF | Non-empty, max 255 chars |
| file2_key | String | Yes | S3/MinIO object key for second PDF | Non-empty, max 255 chars |
| created_at | ISO 8601 string | Yes | Timestamp when job created | UTC timezone, immutable |
| started_at | ISO 8601 string | No | Timestamp when processing started | UTC timezone, set during transition to "processing" |
| completed_at | ISO 8601 string | No | Timestamp when job completed | UTC timezone, set on completion or failure |
| results | JSON object | No | Comparison results (array of PDFDifference) | Present only when status="completed" |
| error_message | String | No | Human-readable error description | Present only when status="failed", max 500 chars |
| retry_count | Integer | No | Number of Celery retry attempts | 0-3, incremented on each retry |

**State Transitions**:

```
[Initial]
   ↓
[queued] ← (after file upload + storage)
   ↓
[processing] ← (Celery task starts)
   ↓
[completed] ← (pdf-diff comparison succeeds) OR
[failed] ← (exception or timeout occurs)
   ↓
[Expired] ← (24 hours in Redis, auto-deleted)
```

**Example**:

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "file1_key": "550e8400-e29b-41d4-a716-446655440000_contract_v1.pdf",
  "file2_key": "550e8400-e29b-41d4-a716-446655440001_contract_v2.pdf",
  "created_at": "2025-10-29T10:15:30Z",
  "started_at": "2025-10-29T10:15:31Z",
  "completed_at": "2025-10-29T10:15:45Z",
  "results": {
    "differences": [
      {
        "page_number": 2,
        "diff_type": "modified",
        "coordinates": {"x": 50.5, "y": 100.25, "width": 200.0, "height": 20.5},
        "description": "Text changed in Section 2.1",
        "before_text": "Original text",
        "after_text": "Updated text"
      }
    ]
  },
  "error_message": null,
  "retry_count": 0
}
```

---

## PDFDifference

**Purpose**: Represents a single detected difference between two PDFs (part of comparison results)

**Storage**: Nested within ComparisonJob results JSON; NOT stored separately

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|-----------|
| page_number | Integer | Yes | Page number (1-indexed) where difference detected | >= 1, <= 999 |
| diff_type | Enum | Yes | Type of difference | One of: added, removed, modified, page_change |
| coordinates | Object | Yes | Bounding box of difference in PDF points | See Coordinates object below |
| description | String | Yes | Human-readable description of difference | Max 500 chars, non-empty |
| before_text | String | No | Original text (only for diff_type="modified") | Max 1000 chars |
| after_text | String | No | Updated text (only for diff_type="modified") | Max 1000 chars |
| page_level | Boolean | No | True if difference is entire page (added/removed) | Default: false |

**Coordinates Object**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|-----------|
| x | Float | Yes | X position in PDF points (1/72 inch) | >= 0 |
| y | Float | Yes | Y position in PDF points (1/72 inch) | >= 0 |
| width | Float | Yes | Width of bounding box in PDF points | > 0, <= 612 (standard page) |
| height | Float | Yes | Height of bounding box in PDF points | > 0, <= 792 (standard page) |

**Examples**:

Text modification:
```json
{
  "page_number": 1,
  "diff_type": "modified",
  "coordinates": {"x": 50.5, "y": 100.25, "width": 200.0, "height": 20.5},
  "description": "Clause 2.1 text updated",
  "before_text": "The term shall commence on January 1, 2024.",
  "after_text": "The term shall commence on January 1, 2025."
}
```

Page added:
```json
{
  "page_number": 5,
  "diff_type": "added",
  "page_level": true,
  "coordinates": {"x": 0, "y": 0, "width": 612, "height": 792},
  "description": "New page added: Schedule B - Additional Terms"
}
```

Page removed:
```json
{
  "page_number": 3,
  "diff_type": "removed",
  "page_level": true,
  "coordinates": {"x": 0, "y": 0, "width": 612, "height": 792},
  "description": "Page removed: Old Appendix A"
}
```

---

## Relationships

**ComparisonJob → PDFDifference**: One-to-Many

- A ComparisonJob contains zero or more PDFDifference objects in its `results` array
- PDFDifference objects only exist within the context of a completed ComparisonJob
- Differences are ordered by page_number (ascending) in the results array

---

## Storage Implementation Details

### Redis Schema

**Key Pattern**: `job:{job_id}`

**Data Type**: Redis String (JSON serialized)

**TTL**: 86400 seconds (24 hours) — Auto-expiration per FR-010

**Example Redis Operations**:

```bash
# Store job after upload
SET job:550e8400-e29b-41d4-a716-446655440000 '{"job_id":"550e8400-e29b-41d4-a716-446655440000","status":"queued",...}' EX 86400

# Update job status during processing
SET job:550e8400-e29b-41d4-a716-446655440000 '{"job_id":"550e8400-e29b-41d4-a716-446655440000","status":"processing",...}' EX 86400

# Retrieve job status (polling endpoint)
GET job:550e8400-e29b-41d4-a716-446655440000

# Job auto-expires after 24 hours (no explicit DELETE needed)
```

### Python Pydantic Schemas

```python
# models/job.py
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID

class Coordinates(BaseModel):
    x: float = Field(..., ge=0)
    y: float = Field(..., ge=0)
    width: float = Field(..., gt=0)
    height: float = Field(..., gt=0)

class PDFDifference(BaseModel):
    page_number: int = Field(..., ge=1, le=999)
    diff_type: str = Field(..., pattern="^(added|removed|modified|page_change)$")
    coordinates: Coordinates
    description: str = Field(..., max_length=500, min_length=1)
    before_text: Optional[str] = Field(None, max_length=1000)
    after_text: Optional[str] = Field(None, max_length=1000)
    page_level: bool = False

class ComparisonJobResponse(BaseModel):
    job_id: str  # UUID format
    status: str = Field(..., pattern="^(queued|processing|completed|failed)$")
    file1_key: Optional[str] = None
    file2_key: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    results: Optional[List[PDFDifference]] = None
    error_message: Optional[str] = Field(None, max_length=500)
    retry_count: int = 0

class UploadResponse(BaseModel):
    job_id: str  # UUID format
    status: str = "queued"
    created_at: datetime
```

---

## Validation Rules

**ComparisonJob**:
- `job_id`: Must be valid UUID v4
- `status`: Immutable after initial creation; transitions follow state machine
- `file1_key`, `file2_key`: Must reference existing S3 objects
- `created_at`: Immutable, set at creation; UTC timezone
- `started_at`, `completed_at`: Set during transitions; UTC timezone
- `completed_at` must be >= `started_at` if both present
- `results`: JSON array, present only when status="completed"
- `error_message`: Non-empty only when status="failed"
- `retry_count`: 0-3 (per Celery configuration)

**PDFDifference**:
- `page_number`: 1-indexed; must be within PDF page count
- `diff_type`: Constrained to enum values
- `coordinates`: All values must be positive; width/height must be non-zero
- `description`: Required, max 500 chars
- `before_text`, `after_text`: Only for diff_type="modified"; optional fields
- `page_level`: True only for diff_type="added" or "removed"

---

## Constraints & Assumptions

1. **No Database**: Job data stored in Redis only; data loss on Redis restart acceptable for MVP
2. **Single TTL**: All jobs expire after 24 hours regardless of size or completion status
3. **No Sharding**: Redis single-instance sufficient for MVP scale (100 jobs/minute)
4. **PDF Points Coordinates**: Coordinates in PDF points (1/72 inch); frontend responsible for DPI conversion
5. **No Deduplication**: Same PDFs compared twice = separate jobs; future optimization can add content hash dedup
6. **Immutable Results**: Results frozen at completion; no updates after status="completed"

---

## Migration Path (Post-MVP)

When moving beyond MVP, consider:

1. **PostgreSQL Persistence**: Replace Redis storage with PostgreSQL for durable job history
   - Add schema: `comparison_jobs`, `pdf_differences` tables
   - Indexes: `(job_id, created_at)` for efficient queries
   - Retention policy: Keep jobs for 90 days; archive older records

2. **User Association**: Add `user_id` field to ComparisonJob (requires MVP auth constraint lift)

3. **Result Compression**: Compress `results` JSON if large diff arrays
   - Gzip compress before storage; decompress on retrieval

4. **Idempotency Keys**: Add client-provided `idempotency_key` to prevent duplicate processing
   - Index on `(idempotency_key, user_id)` for exactly-once semantics

5. **Async Result Notifications**: Add `webhook_url` field for callback notifications (replaces polling)
