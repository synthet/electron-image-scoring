@echo off
echo ==========================================
echo Building Electron Image Gallery Executable
echo ==========================================

cd /d "%~dp0"

echo.
echo [1/3] Cleaning previous build...
if exist dist rmdir /s /q dist
if exist dist-electron rmdir /s /q dist-electron
if exist release rmdir /s /q release

echo.
echo [2/3] Running Build Process...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Build Success!
echo Output should be in the 'release' folder.
echo.
pause
