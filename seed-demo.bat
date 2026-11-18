@echo off
cd /d "%~dp0"
echo Loading demo classes into CodeTrace (it must already be running: start.bat)...
docker compose cp sample-data ml:/tmp/sample-data
if errorlevel 1 goto failed
docker compose cp seed_demo.py ml:/tmp/seed_demo.py
docker compose exec -T ml python /tmp/seed_demo.py
if errorlevel 1 goto failed
echo.
echo Loading the Power BI reporting views...
docker compose cp powerbi/views.sql db:/tmp/views.sql
docker compose exec -T db psql -q -U codetrace -d codetrace -f /tmp/views.sql
if errorlevel 1 goto failed
echo.
echo Done. Power BI can now connect to localhost:5433, database codetrace.
pause
exit /b 0

:failed
echo.
echo Something went wrong. Check that start.bat finished and all four containers are Up (docker compose ps).
pause
exit /b 1
