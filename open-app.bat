@echo off
cd /d "%~dp0"

set APP_URL=http://127.0.0.1:8000

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$url = '%APP_URL%';" ^
  "$ready = $false;" ^
  "try { Invoke-WebRequest -UseBasicParsing ($url + '/api/health') -TimeoutSec 2 | Out-Null; $ready = $true } catch {}" ^
  "if (-not $ready) {" ^
  "  Start-Process -WindowStyle Minimized -FilePath (Join-Path (Get-Location) 'start-server.bat');" ^
  "  for ($i = 0; $i -lt 20; $i++) {" ^
  "    Start-Sleep -Milliseconds 500;" ^
  "    try { Invoke-WebRequest -UseBasicParsing ($url + '/api/health') -TimeoutSec 1 | Out-Null; $ready = $true; break } catch {}" ^
  "  }" ^
  "}" ^
  "Start-Process $url;"
