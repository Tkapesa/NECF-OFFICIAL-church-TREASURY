@echo off
REM Usage: run from repo folder or double-click
set REMOTE_URL=https://github.com/Tkapesa/NECF-OFFICIAL-church-TREASURY.git
set BRANCH=main
set COMMIT_MESSAGE="ui: polish admin dashboard and receipt table styles"

cd /d "%~dp0"
where git >nul 2>&1 || (
  echo git not found in PATH
  exit /b 1
)

git remote remove origin 2>nul || echo origin removed

git remote add origin %REMOTE_URL%

git add -A
git commit -m %COMMIT_MESSAGE% || echo no commit created

git branch -M %BRANCH%

echo Pushing to %REMOTE_URL% (%BRANCH%)

git push -u origin %BRANCH%
if errorlevel 1 (
  echo Push failed. Check credentials or remote history conflicts.
  exit /b 2
)

echo Push completed successfully.
pause