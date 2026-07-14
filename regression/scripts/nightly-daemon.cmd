@echo off
cd /d "%~dp0..\.."
set DATE=2026-07-12
echo. >> regression\results\%DATE%\nightly-run.log
echo [nightly] === cycle 3 %DATE% %TIME% (build + sim + report) === >> regression\results\%DATE%\nightly-run.log
call npm run build >> regression\results\%DATE%\nightly-run.log 2>&1
call npm run regression:nightly -- --force --from sim --date %DATE% >> regression\results\%DATE%\nightly-run.log 2>&1
echo [nightly] exit %ERRORLEVEL% %TIME% >> regression\results\%DATE%\nightly-run.log
call npm run regression:rebuild-sim-summary -- --date %DATE% >> regression\results\%DATE%\nightly-run.log 2>&1
call npm run regression:state >> regression\results\%DATE%\nightly-run.log 2>&1
