from fastapi import FastAPI

app = FastAPI(
    title="TechWiseAI RAG Service",
    description="Dịch vụ AI RAG cho sản phẩm",
    version="1.0.0",
)


@app.get("/health")
def health_check():
    return {
        "success": True,
        "status": "UP",
        "message": "Chat bot hỗ trợ tư vấn sản phẩm",
        "service": "techwiseai-rag-service",
    }
