"""
Hawk-I ML Service — FastAPI Entrypoint

Loads all ML models at startup and exposes detection endpoints.
"""

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models.loader import load_models, get_model_status
from routes.anpr import router as anpr_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("hawk-ml")

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load models once. Shutdown: cleanup."""
    logger.info("═" * 50)
    logger.info("  HAWK-I ML Service — Starting Up")
    logger.info("═" * 50)
    load_models()
    status = get_model_status()
    logger.info(f"Model Status: {status}")
    logger.info("═" * 50)
    logger.info("  ML Service ready to accept requests.")
    logger.info("═" * 50)
    yield
    logger.info("HAWK-I ML Service shutting down.")


app = FastAPI(
    title="Hawk-I ML Service",
    description="AI/ML detection microservice for the Hawk-I CCTV Intelligence Platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the Node backend and Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """
    Health check endpoint. Reports which models are loaded and ready.
    Used by the Node backend and operators to verify the ML service is alive.
    """
    status = get_model_status()
    all_ok = all(m["loaded"] for m in status.values())
    return {
        "status": "healthy" if all_ok else "degraded",
        "service": "hawk-i-ml",
        "models": status,
    }


# Mount detection routes
app.include_router(anpr_router, prefix="/detect", tags=["Detection"])
