
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer


MODEL_NAME = "BAAI/bge-m3"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load model once when service starts
    app.state.model = SentenceTransformer(MODEL_NAME)
    yield
    # Release model reference when service stops
    del app.state.model


app = FastAPI(
    title="TechWise Embedding Service",
    lifespan=lifespan,
)


class EmbeddingRequest(BaseModel):
    text: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/embed")
def embed(request: EmbeddingRequest):
    text = request.text.strip()

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty",
        )

    vector = app.state.model.encode(
        text,
        normalize_embeddings=True,
    ).tolist()

    return {
        "embedding": vector,
        "dimension": len(vector),
        "model": MODEL_NAME,
    }
