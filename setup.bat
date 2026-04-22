@echo off
REM ═══════════════════════════════════════════════
REM  DSA Tracker – First-time Setup (Windows)
REM  Run: setup.bat
REM ═══════════════════════════════════════════════

echo.
echo   ⚡ DSA Revision Tracker – Setup (Windows)
echo   ─────────────────────────────────────────
echo.

REM 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   ✗ Node.js not found!
    echo   Please install from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo   ✓ Node.js %%v

REM 2. Install dependencies
echo   📦 Installing dependencies...
cd /d "%~dp0"
call npm install --silent
echo   ✓ Dependencies installed

REM 3. Create db.json if missing
if not exist "%~dp0db.json" (
    echo [] > "%~dp0db.json"
    echo   ✓ Created empty db.json
) else (
    echo   ✓ db.json already exists
)

REM 4. Create dsa.bat launcher on Desktop
echo   🔗 Creating desktop shortcut...
(
    echo @echo off
    echo cd /d "%~dp0"
    echo start http://localhost:3456
    echo node server.js
) > "%USERPROFILE%\Desktop\dsa.bat"
echo   ✓ Created dsa.bat on your Desktop

REM 5. Done
echo.
echo   ✅ Setup complete!
echo.
echo   ┌──────────────────────────────────────────────┐
echo   │  Double-click dsa.bat on Desktop to start     │
echo   │  Close the terminal window to stop             │
echo   └──────────────────────────────────────────────┘
echo.
pause
