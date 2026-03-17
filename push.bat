@echo off
setlocal

:: If a parameter is passed, use it as the commit message. Otherwise, use a default message.
set msg=%~1
if "%msg%"=="" (
    set msg=Auto-commit: %date% %time%
)

echo [1/3] Staging all files...
git add .

echo [2/3] Committing changes with message: "%msg%"
git commit -m "%msg%"

echo [3/3] Pushing to remote repository...
git push

echo ==================================================
echo Success! Your changes have been pushed to GitHub.
echo ==================================================
pause
