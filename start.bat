@echo off
echo Starting WeatherGPT Backend...
cd weathergpt-backend
start cmd /k "C:\Users\amanp\.local\bin\uv.exe run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo Starting WeatherGPT Frontend...
cd ..\weathergpt-frontend
start cmd /k "npm run dev"

echo Both services are starting up!
echo Frontend: http://localhost:5173
echo Backend: http://localhost:8000
