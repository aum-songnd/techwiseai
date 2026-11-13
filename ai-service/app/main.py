from fastapi import FastAPI

from app.api.embeddings import router as embeddings_router
from app.api.image_search import router as image_search_router


app = FastAPI(
    title="TechWiseAI AI & Embedding Service",
    description="Dịch vụ AI tìm kiếm sản phẩm bằng hình ảnh & sinh embedding văn bản (all-MiniLM-L6-v2)",
    version="1.0.0",
)

app.include_router(image_search_router)
app.include_router(embeddings_router)


@app.get("/health")
def health_check():
    return {
        "success": True,
        "status": "UP",
        "service": "techwiseai-ai-service",
        "models": {
            "image": "google/siglip-base-patch16-224",
            "text_embedding": "sentence-transformers/all-MiniLM-L6-v2",
        },
    }
