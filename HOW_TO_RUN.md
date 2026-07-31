# VisionCCTV — Complete Run Guide (Windows + RTX 4060)

> Open **two separate PowerShell/Terminal windows** — one for the backend, one for the frontend.
> Both must stay open while the app is running.

---

## Prerequisites (install once, skip if already done)

### 1. Python 3.11
Download from https://www.python.org/downloads/release/python-3119/
> During install, tick **"Add Python to PATH"**

Verify:
```powershell
python --version
# Should say: Python 3.11.x
```

### 2. Node.js v20 LTS
Download from https://nodejs.org/en/download
Verify:
```powershell
node --version   # v20.x.x
npm --version    # 10.x.x
```

### 3. FFmpeg (required for video clip extraction)
1. Download from https://www.gyan.dev/ffmpeg/builds/ (ffmpeg-release-essentials.zip)
2. Extract it, e.g. to C:\ffmpeg
3. Add C:\ffmpeg\bin to Windows PATH:
   Search "Environment Variables" → Edit System Variables → Path → New → C:\ffmpeg\bin
4. Verify in a NEW terminal:
```powershell
ffmpeg -version
```

---

## TERMINAL 1 — Backend (FastAPI + AI)

### Step 1 — Open terminal in the backend folder
```powershell
cd "C:\Users\DC\Downloads\VisionCCTV-main\backend"
```

### Step 2 — Create virtual environment (first time only)
```powershell
python -m venv .venv
```

### Step 3 — Activate the virtual environment
```powershell
.\.venv\Scripts\Activate.ps1
```
If you get an "execution policy" error, run this first then retry Step 3:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Your prompt will show (.venv) when active.

### Step 4 — Install PyTorch with CUDA 12.1 (RTX 4060, first time only)
Do NOT use plain pip install — that gives CPU-only PyTorch.
```powershell
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```
This is ~2.5 GB. Wait for it to finish, then verify:
```powershell
python -c "import torch; print('CUDA:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0))"
```
Expected output:
  CUDA: True
  GPU: NVIDIA GeForce RTX 4060

### Step 5 — Install all other backend dependencies (first time only)
```powershell
pip install -r requirements.txt
```

### Step 6 — (Optional) Install ONNX Runtime GPU for faster FaceNet
```powershell
pip install onnxruntime-gpu
```

### Step 7 — Start the backend server
```powershell
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
You should see:
  INFO: Uvicorn running on http://0.0.0.0:8000
  INFO: Application startup complete.

Keep this terminal open. Backend runs at: http://localhost:8000

---

## TERMINAL 2 — Frontend (Next.js)

### Step 1 — Open a new terminal in the frontend folder
```powershell
cd "C:\Users\DC\Downloads\VisionCCTV-main\frontend"
```

### Step 2 — Install frontend dependencies (first time only)
```powershell
npm install
```

### Step 3 — Start the frontend dev server
```powershell
npm run dev
```
You should see:
  Local: http://localhost:3000

Keep this terminal open. Open the app at: http://localhost:3000

---

## Login Credentials

| Username      | Password | Role                        |
|---------------|----------|-----------------------------|
| admin         | hawki    | System Administrator        |
| investigator  | hawki    | Cyber Cell Investigator      |
| supervisor    | hawki    | Duty Supervisor              |
| operator      | hawki    | Control Room Operator        |
| auditor       | hawki    | Forensic Auditor             |

---

## Enable GPU in the App (do this after first login)

1. Go to Settings (gear icon)
2. AI Configuration → Device Provider → select CUDA (NVIDIA GPU)
3. CUDA Device Index → 0 (your RTX 4060)
4. Click Save Settings

---

## Every Time You Start (Quick Reference)

Terminal 1 — Backend:
```powershell
cd "C:\Users\DC\Downloads\VisionCCTV-main\backend"
.\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Terminal 2 — Frontend:
```powershell
cd "C:\Users\DC\Downloads\VisionCCTV-main\frontend"
npm run dev
```

Open browser: http://localhost:3000

---

## Troubleshooting

CUDA available: False
  pip uninstall torch torchvision -y
  pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

.venv\Scripts\Activate.ps1 cannot be loaded
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

ffmpeg not found
  Add C:\ffmpeg\bin to PATH, restart the terminal

Backend crashes with ModuleNotFoundError
  Make sure (.venv) is active, then: pip install -r requirements.txt

Frontend shows "Failed to fetch"
  Make sure backend is running on port 8000 first

Search stuck at 0 frames scanned
  - Restart backend (Ctrl+C then run uvicorn again)
  - Set GPU to CUDA in Settings
  - First run warms up models (~30 sec) — wait for it

EasyOCR slow on first LPR search
  One-time 300 MB model download — just wait, next run is instant
