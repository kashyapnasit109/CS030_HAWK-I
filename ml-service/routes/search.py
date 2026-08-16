from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from models.loader import get_embedder
import logging

logger = logging.getLogger("hawk-ml.search")

router = APIRouter()


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: List[float]


class BatchEmbedRequest(BaseModel):
    texts: List[str]


class BatchEmbedResponse(BaseModel):
    embeddings: List[List[float]]


@router.post("/embed", response_model=EmbedResponse)
async def embed_text(request: EmbedRequest):
    """
    Generate a vector embedding for a given text string.
    Uses sentence-transformers (all-MiniLM-L6-v2).
    """
    model = get_embedder()
    if not model:
        raise HTTPException(
            status_code=503,
            detail="Embedding model is not loaded or failed to initialize."
        )

    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    try:
        vector = model.encode(request.text.strip())
        return {"embedding": vector.tolist()}
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/embed/batch", response_model=BatchEmbedResponse)
async def embed_batch(request: BatchEmbedRequest):
    """
    Generate vector embeddings for a list of text strings.
    """
    model = get_embedder()
    if not model:
        raise HTTPException(
            status_code=503,
            detail="Embedding model is not loaded or failed to initialize."
        )

    if not request.texts:
        return {"embeddings": []}

    try:
        clean_texts = [t.strip() for t in request.texts if t and t.strip()]
        if not clean_texts:
            return {"embeddings": []}
            
        vectors = model.encode(clean_texts)
        return {"embeddings": vectors.tolist()}
    except Exception as e:
        logger.error(f"Error generating batch embeddings: {e}")
        raise HTTPException(status_code=500, detail=str(e))
