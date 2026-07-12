@echo off
REM Долгий GH burn — запускать в отдельном окне, переживает закрытие чата агента.
cd /d "%~dp0..\.."
:loop
for /f "tokens=2 delims=:," %%a in ('type regression\cache\graphhopper-counter.json ^| findstr count') do set GH=%%a
if %GH% GEQ 440 goto finalize
echo [gh-burn-daemon] GH=%GH% — batch...
call npm run regression:gh-burn -- --target 440 --date 2026-07-11 --batches 1
if errorlevel 1 echo batch error, retry in 10s & timeout /t 10
goto loop
:finalize
echo [gh-burn-daemon] target reached, finalize...
call npm run regression:rebuild-sim-summary -- --date 2026-07-11
call npm run regression:report -- --date 2026-07-11
call npm run regression:state
echo DONE GH=%GH%
pause
