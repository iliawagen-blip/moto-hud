@echo off
cd /d "%~dp0..\.."
echo. >> regression\results\2026-07-12\nightly-run.log
echo [nightly] === cycle 2 %DATE% %TIME% (from graphhopper, max_points=5) === >> regression\results\2026-07-12\nightly-run.log
call npm run regression:nightly -- --force --from graphhopper --date 2026-07-12 >> regression\results\2026-07-12\nightly-run.log 2>&1
echo [nightly] exit %ERRORLEVEL% %TIME% >> regression\results\2026-07-12\nightly-run.log
call npm run regression:rebuild-sim-summary -- --date 2026-07-12 >> regression\results\2026-07-12\nightly-run.log 2>&1
call npm run regression:state >> regression\results\2026-07-12\nightly-run.log 2>&1
