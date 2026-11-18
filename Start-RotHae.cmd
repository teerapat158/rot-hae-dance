@echo off
setlocal
cd /d "%~dp0"
if not exist "server.js" (
  echo ERROR: Project folder rot-hae-live was not found.
  pause
  exit /b 1
)
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js was not found. Install Node.js LTS from https://nodejs.org/ and try again.
  pause
  exit /b 1
)
if not exist "node_modules\tiktok-live-connector\package.json" (
  echo Installing dependencies. Please wait...
  where npm.cmd >nul 2>&1
  if not errorlevel 1 (
    call npm.cmd install --cache .npm-cache
  ) else (
    if exist "%ProgramFiles%\Microsoft Visual Studio\18\Enterprise\MSBuild\Microsoft\VisualStudio\NodeJs\node_modules\npm\bin\npm-cli.js" (
      node "%ProgramFiles%\Microsoft Visual Studio\18\Enterprise\MSBuild\Microsoft\VisualStudio\NodeJs\node_modules\npm\bin\npm-cli.js" install --cache .npm-cache
    ) else (
      echo ERROR: npm was not found. Install Node.js LTS from https://nodejs.org/ and try again.
      pause
      exit /b 1
    )
  )
  if not exist "node_modules\tiktok-live-connector\package.json" (
    echo ERROR: Could not install dependencies. Check your internet connection.
    pause
    exit /b 1
  )
)
powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 'http://127.0.0.1:3000/'; if ($r.StatusCode -eq 200 -and $r.Content.Contains('THE HEART PARADE')) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 (
  echo Rot Hae LIVE is already running. Opening the website...
  start "" "http://localhost:3000/"
  exit /b 0
)
echo Starting Rot Hae LIVE...
echo Keep this window open while using the website.
echo Close this window to stop the server.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3000/'"
node server.js
echo Server stopped.
pause

