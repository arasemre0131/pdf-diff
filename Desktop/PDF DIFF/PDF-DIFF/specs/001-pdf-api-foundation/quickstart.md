# Quickstart: Backend API Foundation

**Feature**: 001-pdf-api-foundation
**Date**: 2025-10-29
**Purpose**: Local development setup and first test of PDF comparison API

---

## Prerequisites

- Docker and Docker Compose installed
- Git (with submodule support)
- Python 3.11+ (optional, for manual testing)
- curl or Postman (for API testing)

---

## Local Development Setup

### 1. Clone Repository with Submodules

```bash
git clone --recursive https://github.com/your-org/pdf-diff.git
cd PDF-DIFF
```

If you forgot `--recursive`:

```bash
git submodule update --init --recursive
```

---

### 2. Create Environment File

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Default `.env.local` (for local development):

```
# Backend API
FASTAPI_HOST=0.0.0.0
FASTAPI_PORT=8000
FASTAPI_RELOAD=true

# Redis
REDIS_URL=redis://redis:6379
REDIS_CACHE_DB=0

# Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1

# S3 / MinIO (local development)
S3_BUCKET=pdf-uploads
S3_ENDPOINT_URL=http://minio:9000
S3_REGION=us-east-1
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# File Upload Limits
MAX_FILE_SIZE_MB=100

# Logging
LOG_LEVEL=INFO
```

---

### 3. Start Services with Docker Compose

```bash
docker-compose up -d
```

This starts:
- **Redis**: Message broker + result cache (port 6379)
- **MinIO**: Local S3-compatible storage (port 9000)
- **Backend API**: FastAPI server (port 8000, exposed as /api/ via nginx)
- **Celery Worker**: Background task processor
- **Nginx**: Reverse proxy (port 80 for HTTP, 443 for HTTPS)

Verify services are running:

```bash
docker-compose ps

NAME                COMMAND                  SERVICE      STATUS      PORTS
pdf-diff-backend    "python -m uvicorn…"    backend      Up 2 mins   8000/tcp
pdf-diff-redis      "redis-server…"         redis        Up 2 mins   6379/tcp
pdf-diff-minio      "/mnt/data …"           minio        Up 2 mins   9000/tcp,9001/tcp
pdf-diff-celery     "celery -A …"           celery-worker Up 2 mins   (no ports exposed)
pdf-diff-nginx      "nginx -g …"            nginx        Up 2 mins   0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

---

### 4. Verify Services Are Healthy

**Backend API**:

```bash
curl http://localhost/api/docs
# Should return Swagger UI HTML
```

**Redis**:

```bash
docker-compose exec redis redis-cli ping
# Should return: PONG
```

**MinIO**:

```bash
# Access MinIO console at http://localhost:9001
# Username: minioadmin
# Password: minioadmin
```

---

## First Test: Upload & Compare PDFs

### 1. Create Sample PDFs

Create two test PDF files, or use existing contract samples:

```bash
# Option A: Use existing PDFs
cp ~/Documents/contract_v1.pdf ./test_v1.pdf
cp ~/Documents/contract_v2.pdf ./test_v2.pdf

# Option B: Create simple PDFs (requires pdfkit or similar)
python -c "
from reportlab.pdfgen import canvas
c = canvas.Canvas('test_v1.pdf')
c.drawString(100, 750, 'Contract Version 1')
c.drawString(100, 730, 'Term: January 1, 2024')
c.save()
"

python -c "
from reportlab.pdfgen import canvas
c = canvas.Canvas('test_v2.pdf')
c.drawString(100, 750, 'Contract Version 2')
c.drawString(100, 730, 'Term: January 1, 2025')
c.save()
"
```

---

### 2. Upload PDFs for Comparison

```bash
curl -X POST http://localhost/api/v1/upload \
  -F "file1=@test_v1.pdf" \
  -F "file2=@test_v2.pdf"
```

**Expected Response**:

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "created_at": "2025-10-29T10:15:30Z"
}
```

**Save the `job_id`** for next step.

---

### 3. Poll Job Status

Replace `{job_id}` with the ID from step 2:

```bash
curl http://localhost/api/v1/compare/550e8400-e29b-41d4-a716-446655440000
```

**First Poll Response** (job still queued):

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "created_at": "2025-10-29T10:15:30Z"
}
```

Wait 1-2 seconds, poll again:

```bash
curl http://localhost/api/v1/compare/550e8400-e29b-41d4-a716-446655440000
```

**Second Poll Response** (processing):

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "created_at": "2025-10-29T10:15:30Z",
  "started_at": "2025-10-29T10:15:31Z",
  "estimated_completion_time": "2025-10-29T10:15:50Z"
}
```

Wait 5-30 seconds (depending on PDF complexity), poll again:

**Final Poll Response** (completed):

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
        "x": 100.0,
        "y": 730.0,
        "width": 100.0,
        "height": 12.0
      },
      "description": "Text changed",
      "before_text": "Term: January 1, 2024",
      "after_text": "Term: January 1, 2025"
    }
  ]
}
```

✅ **Success!** Your API is working.

---

## Development Workflow

### Edit Backend Code

Backend code auto-reloads on save (FastAPI development mode):

```bash
# Edit API endpoints
vim backend/app.py

# Edit services
vim backend/services/comparison_service.py

# Changes automatically reload in Docker container
# Check logs:
docker-compose logs -f backend
```

---

### View Celery Worker Logs

Monitor background task processing:

```bash
docker-compose logs -f celery-worker

# You should see log output like:
# [2025-10-29 10:15:31,000: INFO/MainProcess] Received task: ...
# [2025-10-29 10:15:45,000: INFO/MainProcess] Task completed successfully
```

---

### Access Redis CLI

Inspect Redis data directly:

```bash
docker-compose exec redis redis-cli

# Inside Redis CLI:
> KEYS *
# Should show job:{job_id} keys

> GET job:550e8400-e29b-41d4-a716-446655440000
# Shows serialized job JSON
```

---

### Access MinIO Console

View uploaded files:

1. Open browser: `http://localhost:9001`
2. Login: `minioadmin` / `minioadmin`
3. Navigate to `pdf-uploads` bucket
4. View uploaded PDF files with UUID-based keys

---

### Run Tests Manually

Since MVP has no automated tests, perform manual validation:

**Positive Test Case**:

```bash
# Upload valid PDFs
curl -X POST http://localhost/api/v1/upload \
  -F "file1=@valid1.pdf" \
  -F "file2=@valid2.pdf"

# Verify response contains job_id and status="queued"
```

**Error Case - Invalid MIME Type**:

```bash
# Try uploading a non-PDF file
curl -X POST http://localhost/api/v1/upload \
  -F "file1=@notapdf.txt" \
  -F "file2=@valid.pdf"

# Should get 400 error: "File must be application/pdf"
```

**Error Case - File Too Large**:

```bash
# Create a 150MB file
dd if=/dev/zero of=large.bin bs=1M count=150

# Try uploading (need to create dummy PDF header)
# Should get 413 error: "File exceeds 100MB limit"
```

**Error Case - Missing Job**:

```bash
# Query non-existent job
curl http://localhost/api/v1/compare/00000000-0000-0000-0000-000000000000

# Should get 404 error: "Job not found"
```

---

## Troubleshooting

### Redis Connection Error

**Problem**: `redis.exceptions.ConnectionError: Error 111 connecting to redis:6379`

**Solution**:
```bash
docker-compose down
docker-compose up -d redis
docker-compose logs redis
```

---

### MinIO Connection Error

**Problem**: `botocore.exceptions.EndpointConnectionError`

**Solution**:
```bash
# Verify MinIO is running
docker-compose ps minio

# Check MinIO logs
docker-compose logs minio

# Verify S3_ENDPOINT_URL in .env.local is correct
cat .env.local | grep S3_ENDPOINT_URL
```

---

### Celery Worker Not Processing Tasks

**Problem**: Jobs stuck in "queued" status indefinitely

**Solution**:
```bash
# Check worker status
docker-compose logs celery-worker

# Restart worker
docker-compose restart celery-worker

# Verify Redis connection
docker-compose exec redis redis-cli PING
```

---

### PDF Comparison Returns "PDF is corrupted"

**Problem**: All PDFs fail with error "PDF is corrupted or not readable"

**Causes**:
- PDF is actually corrupted (use different PDF)
- pdf-diff library not properly imported
- Python 3.11 compatibility issue

**Solution**:
```bash
# Test pdf-diff library directly
docker-compose exec backend python -c "import pdf_diff; print(pdf_diff.__version__)"

# Check submodule is initialized
ls -la pdf-diff/

# If empty, reinitialize
git submodule update --init --recursive
docker-compose up --build backend
```

---

### Nginx Returns 502 Bad Gateway

**Problem**: `502 Bad Gateway` when accessing http://localhost/api/

**Solution**:
```bash
# Verify backend is running
docker-compose ps backend

# Check backend logs
docker-compose logs backend

# Verify Nginx configuration
docker-compose exec nginx nginx -t

# Check Nginx logs
docker-compose logs nginx
```

---

## Performance Tuning

### Increase Celery Workers

For higher throughput, scale workers:

```bash
# docker-compose.yml
services:
  celery-worker:
    deploy:
      replicas: 3  # Run 3 workers instead of 1
```

Then:

```bash
docker-compose up -d
```

---

### Monitor Resource Usage

```bash
# Watch memory, CPU, network
docker stats
```

---

### Redis Memory Usage

Check Redis memory:

```bash
docker-compose exec redis redis-cli INFO memory

# Output includes:
# used_memory_human: (amount of memory used)
# maxmemory: (maximum memory limit)

# If approaching limit, delete old jobs:
docker-compose exec redis redis-cli EVAL "return redis.call('del', unpack(redis.call('keys', 'job:*')))" 0
```

---

## Next Steps

1. ✅ Verify local dev setup works with test PDFs
2. ⏳ Implement additional features (authentication, persistence, notifications)
3. ⏳ Deploy to staging environment
4. ⏳ Load testing and performance optimization
5. ⏳ Production deployment with AWS S3

---

## Support

- **API Docs**: http://localhost/api/docs (Swagger UI)
- **API Schema**: http://localhost/api/openapi.json
- **MinIO Console**: http://localhost:9001
- **Feature Spec**: See `specs/001-pdf-api-foundation/spec.md`
- **Data Model**: See `specs/001-pdf-api-foundation/data-model.md`
- **API Contracts**: See `specs/001-pdf-api-foundation/contracts/`
