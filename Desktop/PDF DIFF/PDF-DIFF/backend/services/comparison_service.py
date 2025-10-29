import redis
import json
from datetime import datetime
from backend.config import REDIS_URL


class ComparisonService:
    """Redis ile job yönetimi"""

    def __init__(self):
        self.redis_client = redis.from_url(REDIS_URL)

    def create_job(self, job_id: str, file1_key: str, file2_key: str):
        """Yeni job oluştur"""
        job_data = {
            'job_id': job_id,
            'status': 'queued',
            'file1_key': file1_key,
            'file2_key': file2_key,
            'created_at': datetime.utcnow().isoformat()
        }
        self.redis_client.setex(
            f"job:{job_id}",
            86400,  # 24 saat TTL
            json.dumps(job_data)
        )

    def update_job_status(self, job_id: str, status: str, result=None, error=None):
        """Job durumunu güncelle"""
        job_data = json.loads(self.redis_client.get(f"job:{job_id}"))
        job_data['status'] = status

        if status == 'completed':
            job_data['completed_at'] = datetime.utcnow().isoformat()
            job_data['result'] = result
        elif status == 'failed':
            job_data['completed_at'] = datetime.utcnow().isoformat()
            job_data['error_message'] = error

        self.redis_client.setex(
            f"job:{job_id}",
            86400,
            json.dumps(job_data)
        )

    def get_job(self, job_id: str):
        """Job bilgilerini getir"""
        data = self.redis_client.get(f"job:{job_id}")
        return json.loads(data) if data else None


# Global instance
comparison_service = ComparisonService()
