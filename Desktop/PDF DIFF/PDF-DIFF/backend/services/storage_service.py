import boto3
import os
from pathlib import Path
from backend.config import S3_BUCKET, S3_ENDPOINT_URL


class StorageService:
    """S3/MinIO için dosya yükleme/indirme servisi"""

    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=S3_ENDPOINT_URL,
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID', 'minioadmin'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY', 'minioadmin'),
        )
        self.bucket = S3_BUCKET

    def upload_file(self, file_bytes: bytes, file_key: str):
        """Dosyayı S3'e yükle"""
        self.s3_client.put_object(
            Bucket=self.bucket,
            Key=file_key,
            Body=file_bytes
        )
        return file_key

    def download_file(self, file_key: str, local_path: str):
        """S3'ten dosyayı indir"""
        self.s3_client.download_file(
            Bucket=self.bucket,
            Key=file_key,
            Filename=local_path
        )
        return local_path

    def generate_file_key(self, job_id: str, filename: str) -> str:
        """Unique dosya key'i oluştur"""
        return f"{job_id}/{filename}"


# Global instance
storage_service = StorageService()
