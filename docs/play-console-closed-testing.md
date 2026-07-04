# Play Console: closed testing (Фаза 2)

Чек-лист перед внутренним/закрытым треком для проверки foreground GPS и OEM-матрицы.

## Подготовка AAB

1. `npm run build && npx cap sync android`
2. Android Studio → **Build → Generate Signed Bundle / APK** → AAB.
3. Версия: поднять `versionCode` / `versionName` в `android/app/build.gradle`.

## Play Console

1. **Testing → Closed testing** → создать трек (например `oem-gps-alpha`).
2. Загрузить AAB, заполнить release notes (что тестировать: HUD, фоновый GPS, голос).
3. Добавить тестеров (email Google-аккаунтов) или Google Group.
4. Разрешения в лisting: **Location (foreground + background)**, **Notifications** — объяснить в описании зачем foreground-service.

## Сценарии для тестеров

| # | Сценарий | Ожидание |
|---|----------|----------|
| 1 | Построить маршрут → ПОЕХАЛИ → заблокировать экран 10 мин | GPS не отваливается, HUD при разблокировке актуален |
| 2 | Свёрнуть приложение, музыка в фоне, манёвр | Подсказка слышна (TTS); музыка может приглушаться |
| 3 | Samsung/Xiaomi/Huawei: отключить оптимизацию батареи | Сервис не убивается (см. `docs/oem-gps-matrix.md`) |
| 4 | Режим «в самолёте» + офлайн-голос не установлен | Баннер «скачайте голос» в настройках |
| 5 | Стоянка + «Калибровка компаса» | После восьмёрки курс стабильнее на малой скорости |

## OEM-матрица

Результаты заносить в [`docs/oem-gps-matrix.md`](oem-gps-matrix.md): вендор, модель, Android, исход оптимизации батареи, GPS жив после lock 10/30 мин.

## После closed testing

- Internal → Open testing (опционально).
- Production — только после закрытия Фазы 3 (гарнитура + audio focus) или явного MVP-решения.
