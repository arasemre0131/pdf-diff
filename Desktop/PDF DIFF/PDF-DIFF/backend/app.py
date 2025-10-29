from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uuid
from datetime import datetime
import os
import shutil
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PDF Comparison API",
    description="REST API for comparing PDF documents",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup file storage
UPLOAD_DIR = Path("/tmp/pdf_uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# In-memory storage for demo
jobs = {}

@app.on_event("startup")
async def load_existing_jobs():
    """Load existing jobs from disk on application startup"""
    try:
        # List of known job directories
        job_dirs = [
            "09f0c3cb-b4f6-4651-a821-0770fe9418b4",
            "0a195733-ddbf-4b51-a09a-dd70595a6878",
            "1a1d280c-522e-47fb-9746-6f9c696f7d22",
            "ac4c5d31-cebf-4c25-8747-ae00fa32e161",
            "b9e8048c-ed93-4422-867f-ea5c86783d51",
            "cc10823b-f405-4ab5-9159-a0c421105196",
            "cf922d4f-66b9-4aff-97d8-119d56b4f246"
        ]

        for job_id in job_dirs:
            file1_path = UPLOAD_DIR / job_id / "file1.pdf"
            file2_path = UPLOAD_DIR / job_id / "file2.pdf"

            if file1_path.exists() and file2_path.exists():
                jobs[job_id] = {
                    "job_id": job_id,
                    "status": "completed",
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                    "file1_name": "file1.pdf",
                    "file2_name": "file2.pdf",
                    "file1_path": str(file1_path),
                    "file2_path": str(file2_path),
                    "error_message": None,
                    "result": {
                        "total_differences": 42,
                        "pages_affected": 5,
                        "generated_at": datetime.now().isoformat(),
                        "differences": []
                    }
                }
                logger.info(f"✓ Loaded job: {job_id}")

        logger.info(f"✓ Startup complete: {len(jobs)} jobs loaded from disk")
    except Exception as e:
        logger.error(f"✗ Error loading jobs on startup: {e}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "pdf-comparison-api"}

@app.get("/")
async def root():
    return {"message": "PDF Comparison API v1.0.0"}

@app.get("/api/v1/jobs")
async def list_jobs():
    """List all available jobs"""
    return {
        "jobs": [
            {
                "job_id": j["job_id"],
                "status": j["status"],
                "created_at": j["created_at"],
                "updated_at": j["updated_at"],
                "file1_name": j["file1_name"],
                "file2_name": j["file2_name"],
            }
            for j in jobs.values()
        ],
        "total": len(jobs)
    }

@app.get("/api/v1/worker")
async def get_worker():
    """Serve PDF.js worker file from backend static directory"""
    worker_path = Path(__file__).parent / "static" / "pdf.worker.min.mjs"

    if not worker_path.exists():
        return {"error": "Worker file not found"}

    return FileResponse(
        worker_path,
        media_type="application/javascript",
        headers={"Cache-Control": "public, max-age=31536000"}
    )

@app.post("/api/v1/upload")
async def upload_pdfs(file1: UploadFile = File(...), file2: UploadFile = File(...)):
    """Upload two PDF files for comparison"""
    job_id = str(uuid.uuid4())
    job_dir = UPLOAD_DIR / job_id
    job_dir.mkdir(exist_ok=True)

    try:
        # Save file1
        file1_path = job_dir / "file1.pdf"
        with open(file1_path, "wb") as buffer:
            shutil.copyfileobj(file1.file, buffer)

        # Save file2
        file2_path = job_dir / "file2.pdf"
        with open(file2_path, "wb") as buffer:
            shutil.copyfileobj(file2.file, buffer)

        # Store job info
        jobs[job_id] = {
            "job_id": job_id,
            "status": "processing",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "file1_name": file1.filename,
            "file2_name": file2.filename,
            "file1_path": str(file1_path),
            "file2_path": str(file2_path),
            "error_message": None,
            "result": None
        }

        return {
            "job_id": job_id,
            "status": "processing",
            "message": "Files received, starting comparison..."
        }
    except Exception as e:
        # Cleanup on error
        if job_dir.exists():
            shutil.rmtree(job_dir)
        return {
            "error": str(e),
            "status": "failed"
        }

@app.get("/api/v1/jobs/{job_id}/status")
async def get_job_status(job_id: str):
    """Get job status"""
    if job_id not in jobs:
        return {
            "job_id": job_id,
            "status": "not_found",
            "error_message": "Job not found"
        }

    job = jobs[job_id]

    # Simulate completion after a few requests
    request_count = getattr(get_job_status, f'count_{job_id}', 0)
    setattr(get_job_status, f'count_{job_id}', request_count + 1)

    if request_count >= 3:  # Complete after 3 requests
        if job["status"] == "processing":
            job["status"] = "completed"
            job["result"] = {
                "total_differences": 42,
                "pages_affected": 5,
                "generated_at": datetime.now().isoformat(),
                "differences": []
            }

    return {
        "job_id": job["job_id"],
        "status": job["status"],
        "created_at": job["created_at"],
        "updated_at": datetime.now().isoformat(),
        "error_message": job["error_message"],
        "result": job["result"]
    }

@app.get("/api/v1/jobs/{job_id}/files/{file_type}")
async def get_job_file(job_id: str, file_type: str):
    """Serve PDF file from job"""
    if job_id not in jobs:
        return {"error": "Job not found"}

    job = jobs[job_id]
    file_path = None

    if file_type == "file1":
        file_path = job.get("file1_path")
    elif file_type == "file2":
        file_path = job.get("file2_path")

    if not file_path or not Path(file_path).exists():
        return {"error": "File not found"}

    return FileResponse(file_path, media_type="application/pdf")

@app.get("/api/v1/jobs/{job_id}/diff")
async def get_diff(job_id: str):
    """Get visual diff information between two PDFs"""
    if job_id not in jobs:
        return {"error": "Job not found"}

    # Mock diff data: regions that differ between the two PDFs
    return {
        "job_id": job_id,
        "pages": [
            {
                "pageNumber": 1,
                "changes": [
                    {
                        "type": "removed",
                        "bbox": [100, 220, 240, 236],
                        "text": "Old clause text that was deleted"
                    },
                    {
                        "type": "added",
                        "bbox": [105, 260, 255, 276],
                        "text": "New clause text that was added"
                    },
                    {
                        "type": "changed",
                        "bbox": [150, 150, 350, 180],
                        "text": "Modified text content",
                        "original": "Old text content"
                    }
                ]
            },
            {
                "pageNumber": 2,
                "changes": [
                    {
                        "type": "added",
                        "bbox": [80, 100, 400, 150],
                        "text": "Entire new paragraph was inserted here"
                    }
                ]
            }
        ]
    }

@app.get("/api/v1/jobs/{job_id}/export")
async def export_job(job_id: str, format: str = "pdf"):
    """Export comparison results"""
    if job_id not in jobs:
        return {"error": "Job not found"}

    return {
        "message": f"Export as {format} not yet implemented",
        "job_id": job_id
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
