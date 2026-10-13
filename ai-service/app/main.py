from fastapi import FastAPI

from app.api.image_search import router as image_search_router


app = FastAPI(
    title="TechWiseAI Image Search Service",
    description="Dịch vụ AI tìm kiếm sản phẩm bằng hình ảnh",
    version="1.0.0",
)

app.include_router(image_search_router)


@app.get("/health")
def health_check():
    return {
        "success": True,
        "status": "UP",
        "service": "techwiseai-ai-service",
    }