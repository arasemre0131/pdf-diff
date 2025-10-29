from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/")
async def root():
    return {"message": "PDF Comparison API"}

@app.post("/api/v1/upload")
async def upload():
    return {"status": "ok"}

@app.get("/api/v1/compare/{job_id}")
async def get_status(job_id: str):
    return {"job_id": job_id, "status": "processing"}
