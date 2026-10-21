@echo off
title VIGINT - Platform Launcher
color 0B
cls

echo =====================================================================
echo                 VIGINT: Smart Campus Safety Platform                 
echo                  Autonomous Incident Detection System                
echo =====================================================================
echo.
echo [*] Project Directory: %~dp0
echo [*] Initializing Backend (FastAPI + PyTorch CUDA) and Frontend (Next.js)...
echo.

:: 1. Launch Backend Server in a dedicated window
echo [1/3] Starting Backend Server on http://localhost:8000 ...
start "VIGINT - Backend Server (FastAPI :8000)" cmd /k "cd /d ""%~dp0backend"" && call .venv\Scripts\activate.bat && echo [OK] Virtual Environment Activated && echo [*] Starting Uvicorn Server on http://0.0.0.0:8000 ... && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: 2. Launch Frontend Dev Server in a dedicated window
echo [2/3] Starting Frontend Server on http://localhost:3000 ...
start "VIGINT - Frontend Dashboard (Next.js :3000)" cmd /k "cd /d ""%~dp0frontend"" && echo [*] Starting Next.js Dev Server on http://0.0.0.0:3000 ... && call npm run dev"

:: 3. Wait for backend to be ready
echo [3/3] Waiting for Backend and Frontend to warm up...
timeout /t 6 /nobreak >nul

echo.
echo [*] Launching VIGINT Command Center in your default browser...
start http://localhost:3000

echo.
echo =====================================================================
echo                     VIGINT IS NOW RUNNING!                            
echo =====================================================================
echo   - Web Dashboard:     http://localhost:3000
echo   - Backend API Docs:  http://localhost:8000/docs
echo.
echo   Login Credentials:
echo     - Username:  admin  (or investigator / supervisor / operator)
echo     - Password:  hawki
echo.
echo   [!] Keep the two opened server windows running while using the app.
echo   [!] To stop the platform, run 'stop_project.bat' or close the windows.
echo =====================================================================
echo.
pause
