@echo off
title CodeTrace
cd /d "%~dp0"

docker info >nul 2>&1
if errorlevel 1 goto nodocker

if exist .env goto build
echo Creating .env with a random secret...
powershell -NoProfile -Command "$s = -join ((48..57)+(97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_}); Set-Content -Path .env -Encoding ascii -Value \"JWT_SECRET=$s\",\"DB_PASSWORD=codetrace\",\"EMBEDDING_BACKEND=tfidf\""

:build
echo Building and starting CodeTrace. The first run downloads images and takes 5-10 minutes.
docker compose up --build -d
if errorlevel 1 goto failed

echo Waiting for the app to answer...
powershell -NoProfile -Command "for ($i = 0; $i -lt 60; $i++) { try { Invoke-WebRequest -UseBasicParsing http://localhost:8080/api/health | Out-Null; exit 0 } catch { Start-Sleep 2 } }; exit 1"
if errorlevel 1 goto failed

start http://localhost:8080
echo.
echo CodeTrace is running at http://localhost:8080
echo Demo files are in the sample-data folder. Run stop.bat to shut it down.
pause
exit /b 0

:nodocker
echo Docker is not running.
echo Install Docker Desktop, open it, wait until it shows "Engine running", then run this file again.
pause
exit /b 1

:failed
echo.
echo Something did not start. Showing the last log lines:
docker compose logs --tail 30
pause
exit /b 1
