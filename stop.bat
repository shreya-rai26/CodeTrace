@echo off
cd /d "%~dp0"
docker compose down
echo CodeTrace stopped. Your data is kept; run start.bat to start again.
pause
