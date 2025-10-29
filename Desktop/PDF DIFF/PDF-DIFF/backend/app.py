from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uuid
from datetime import datetime
import os
import shutil
from pathlib import Path
import logging

# Import pdf-diff1 engine
from pdf_diff_engine import compute_changes, render_changes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PDF Comparison API",
    description="REST API for comparing PDF documents using pdf-diff1",
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
    """Upload two PDF files for comparison using pdf-diff1"""
    job_id = str(uuid.uuid4())
    job_dir = UPLOAD_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Save file1
        file1_path = job_dir / "file1.pdf"
        with open(file1_path, "wb") as buffer:
            shutil.copyfileobj(file1.file, buffer)

        # Save file2
        file2_path = job_dir / "file2.pdf"
        with open(file2_path, "wb") as buffer:
            shutil.copyfileobj(file2.file, buffer)

        logger.info(f"✓ Job {job_id}: Files uploaded")

        # Compute changes using pdf-diff1
        try:
            changes = compute_changes(
                str(file1_path),
                str(file2_path),
                top_margin=0,
                bottom_margin=100
            )

            logger.info(f"✓ Job {job_id}: Changes computed ({len(changes)} boxes)")

            # Render changes as image (side-by-side with red boxes)
            styles = ["box", "box"]  # box style for both PDFs
            result_image = render_changes(changes, styles, width=900)

            # Save result image
            result_path = job_dir / "result.png"
            result_image.save(result_path, "PNG")

            logger.info(f"✓ Job {job_id}: Result image rendered and saved")

            # Create job record
            changes_count = len([c for c in changes if c != "*"])
            jobs[job_id] = {
                "job_id": job_id,
                "status": "completed",
                "file1_name": file1.filename,
                "file2_name": file2.filename,
                "file1_path": str(file1_path),
                "file2_path": str(file2_path),
                "result_path": str(result_path),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "changes_count": changes_count,
                "result": {
                    "total_differences": changes_count,
                    "pages_affected": 1,
                    "generated_at": datetime.now().isoformat()
                },
                "changes": changes,
                "error_message": None
            }

            return {
                "job_id": job_id,
                "status": "completed",
                "message": "PDFs compared successfully",
                "changes_count": changes_count,
                "result_url": f"/api/v1/jobs/{job_id}/result.png"
            }

        except Exception as e:
            logger.error(f"✗ Job {job_id}: Comparison failed: {str(e)}")
            jobs[job_id] = {
                "job_id": job_id,
                "status": "failed",
                "error_message": str(e),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
            }
            raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        # Cleanup on error
        if job_dir.exists():
            shutil.rmtree(job_dir)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get job status and metadata"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]

    # Return in the format expected by the frontend
    response = {
        "job_id": job["job_id"],
        "status": job["status"],
        "created_at": job["created_at"],
        "updated_at": job["updated_at"],
        "error_message": job.get("error_message"),
    }

    # Include result if available
    if "result" in job and job["result"]:
        response["result"] = job["result"]

    return response


@app.get("/api/v1/jobs/{job_id}/result.png")
async def get_job_result(job_id: str):
    """Download result image (side-by-side comparison)"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]

    if job.get("status") != "completed" or "result_path" not in job:
        raise HTTPException(status_code=400, detail="Result not available")

    result_path = job.get("result_path")
    if not result_path or not Path(result_path).exists():
        raise HTTPException(status_code=404, detail="Result image not found")

    return FileResponse(result_path, media_type="image/png")

@app.get("/api/v1/jobs")
async def list_jobs():
    """List all jobs"""
    jobs_list = []
    for job in jobs.values():
        job_copy = job.copy()
        # Don't return raw changes in list response
        if "changes" in job_copy:
            job_copy.pop("changes")
        jobs_list.append(job_copy)

    return {
        "jobs": jobs_list,
        "total": len(jobs)
    }


@app.get("/api/v1/jobs/{job_id}/files/{file_type}")
async def get_job_file(job_id: str, file_type: str):
    """Download uploaded PDF file"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]

    if file_type == "file1":
        file_path = job.get("file1_path")
    elif file_type == "file2":
        file_path = job.get("file2_path")
    else:
        raise HTTPException(status_code=400, detail="Invalid file type")

    if not file_path or not Path(file_path).exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path, media_type="application/pdf")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
