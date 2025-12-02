@echo off
cd ../frontend

echo Building frontend
npm run build
IF %ERRORLEVEL% NEQ 0 (
    echo Build failed. Exiting...
    exit /b 1
)

echo Build finished.

