from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

app = FastAPI(title="TechWise Embedding Service")

model = SentenceTransformer(
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
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
        return {"error": "Question cannot be empty"}

    vector = model.encode(
        text,
        normalize_embeddings=True
    ).tolist()

    return {
        "embedding": vector,
        "dimension": len(vector)
    }