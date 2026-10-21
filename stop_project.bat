@echo off
title VIGINT - Platform Stopper
color 0C
cls

echo =====================================================================
echo                     STOPPING VIGINT PLATFORM                         
echo =====================================================================
echo.
echo [*] Terminating Backend (Port 8000) and Frontend (Port 3000) processes...
echo.

:: Kill processes on port 8000 (Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo [*] Stopping Backend process (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill processes on port 3000 (Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo [*] Stopping Frontend process (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo =====================================================================
echo                    ALL VIGINT SERVICES STOPPED                       
echo =====================================================================
echo.
pause
