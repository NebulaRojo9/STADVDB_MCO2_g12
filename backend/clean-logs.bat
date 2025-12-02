@echo off
REM Navigate to the "logs" directory relative to the script
cd /d "%~dp0logs"

REM Delete all .log files (no confirmation)
del /q *.log

echo All .log files deleted from %cd%

cd ..
