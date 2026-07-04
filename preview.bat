@echo off
rem ============================================================
rem  Мото ИЛС — перезапуск локального превью на ПК
rem  - глушит прошлый сервер на порту 3456
rem  - поднимает статический сервер (npx serve)
rem  - открывает эмулятор телефона в браузере по умолчанию
rem ============================================================
setlocal
cd /d "%~dp0"

set PORT=3456
rem кэш-бастер (%RANDOM%) обходит закэшированные браузером редиректы прошлых запусков
set URL=http://localhost:%PORT%/sim.html?v=%RANDOM%

echo [1/4] Сборка js/app.js...
call npm run build
if errorlevel 1 exit /b 1

echo [2/4] Освобождаю порт %PORT% (если занят прошлым превью)...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do (
  taskkill /f /pid %%p >nul 2>&1
)
timeout /t 1 /nobreak >nul
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo ОШИБКА: порт %PORT% занят. Закройте другой serve/превью и повторите.
  pause
  exit /b 1
)

findstr /c:"injectSimElevation" js\app.js >nul 2>&1
if errorlevel 1 (
  echo ПРЕДУПРЕЖДЕНИЕ: в js\app.js нет injectSimElevation — сборка могла не обновиться.
)

echo [3/4] Запускаю сервер на порту %PORT%...
echo     Браузер откроется через 2 с (после старта serve).
start /b cmd /c "timeout /t 2 /nobreak >nul && start "" "%URL%""
echo.
echo     Эмулятор:  %URL%
echo     Чистый HUD: http://localhost:%PORT%/index.html?sim=1
echo.
npx --yes serve -l %PORT% .

endlocal
