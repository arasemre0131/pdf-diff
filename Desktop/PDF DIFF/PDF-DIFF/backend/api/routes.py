from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.services.storage_service import storage_service
from backend.services.comparison_service import comparison_service
from backend.services.celery_tasks import compare_pdfs_task
import uuid

router = APIRouter()


@router.post("/api/v1/upload")
async def upload_files(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...)
):
    """İki PDF dosyasını yükle"""
    # Job ID oluştur
    job_id = str(uuid.uuid4())

    # Dosyaları oku
    file1_bytes = await file1.read()
    file2_bytes = await file2.read()

    # S3'e yükle
    file1_key = storage_service.generate_file_key(job_id, file1.filename)
    file2_key = storage_service.generate_file_key(job_id, file2.filename)

    storage_service.upload_file(file1_bytes, file1_key)
    storage_service.upload_file(file2_bytes, file2_key)

    # Redis'te job oluştur
    comparison_service.create_job(job_id, file1_key, file2_key)

    # Celery task'ını kuyruğa ekle
    compare_pdfs_task.delay(file1_key, file2_key, job_id)

    return {
        "job_id": job_id,
        "status": "queued"
    }


@router.get("/api/v1/compare/{job_id}")
async def get_comparison_status(job_id: str):
    """Job durumunu kontrol et"""
    job = comparison_service.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job
