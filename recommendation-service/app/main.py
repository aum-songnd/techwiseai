from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.recommendation import router as recommendation_router

app = FastAPI(
    title="TechWiseAI Recommendation Service",
    description="Dịch vụ AI Đề xuất sản phẩm thông minh (Tách riêng biệt)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recommendation_router)


@app.get("/health")
def health_check():
    return {
        "success": True,
        "status": "UP",
        "service": "techwiseai-recommendation-service",
    }
