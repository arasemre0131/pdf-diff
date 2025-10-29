from celery import Celery
from backend.config import CELERY_BROKER_URL
from backend.services.pdf_processor import pdf_processor
from backend.services.storage_service import storage_service
from backend.services.comparison_service import comparison_service
import tempfile
import os

# Celery app oluştur
celery_app = Celery('pdf_comparison', broker=CELERY_BROKER_URL)


@celery_app.task(bind=True, max_retries=3)
def compare_pdfs_task(self, file1_key: str, file2_key: str, job_id: str):
    """PDF karşılaştırma background task'ı"""
    try:
        # Durum güncelle: processing
        comparison_service.update_job_status(job_id, 'processing')

        # Geçici klasör oluştur
        with tempfile.TemporaryDirectory() as tmpdir:
            file1_path = os.path.join(tmpdir, 'file1.pdf')
            file2_path = os.path.join(tmpdir, 'file2.pdf')

            # S3'ten dosyaları indir
            storage_service.download_file(file1_key, file1_path)
            storage_service.download_file(file2_key, file2_path)

            # pdf-diff ile karşılaştır
            result = pdf_processor.compare_pdfs(file1_path, file2_path)

            # Sonucu Redis'e kaydet
            comparison_service.update_job_status(job_id, 'completed', result=result)

    except Exception as exc:
        # Hata durumu
        comparison_service.update_job_status(job_id, 'failed', error=str(exc))
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
