@echo off
echo Removing old backend dist
IF EXIST "..\backend\dist" (
    rmdir /S /Q "..\backend\dist"
)

echo Copying new dist to backend
xcopy ".\dist" "..\backend\dist" /E /I /Y

echo Finished build and copy dist

cd ../backend
npm run dev