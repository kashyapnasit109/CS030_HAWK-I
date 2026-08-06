from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from models.loader import get_embedder
import logging

logger = logging.getLogger("hawk-ml.search")

router = APIRouter()

class EmbedRequest(BaseModel):
    text: str

class EmbedResponse(BaseModel):
    embedding: list[float]

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
        # Encode returns a numpy array, convert to list of floats for JSON serialization
        vector = model.encode(request.text.strip())
        return {"embedding": vector.tolist()}
    except Exception as e:
        logger.error(f"Error generating embedding: {e}")
        raise HTTPException(status_code=500, detail=str(e))
