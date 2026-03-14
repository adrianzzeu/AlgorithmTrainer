@echo off
setlocal

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-lab.ps1"
if errorlevel 1 (
  echo.
  echo setup-lab failed.
  pause
)

endlocal
