# Hawk-I ML Service

## Overview
Python-based ML microservice using FastAPI that handles all AI/ML detection modules.

## Setup
```bash
cd ml-service
python -m venv venv
venv\Scripts\activate          # Windows
# or: source venv/bin/activate # Linux/Mac
pip install -r requirements.txt
```

## Run
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Endpoints
- `GET /health` — Model readiness status
- `POST /detect/anpr` — Number plate detection (image upload)

## Models Used
- **YOLOv8n** (ultralytics) — Vehicle/object detection
- **EasyOCR** — Optical character recognition for plate text extraction
