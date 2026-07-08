# Прокси ГдеБЕНЗ для moto-hud

Cloudflare Worker: `GET /nearby?lat=&lon=&radius_km=` → `gdebenz.ru/api/nearby`.

## Deploy

```bash
cd workers/gdebenz-proxy
npx wrangler login
npx wrangler deploy
```

Скопируйте выданный URL (например `https://moto-hud-gdebenz-proxy.<account>.workers.dev`) в приложение:

**⚙ Опции → URL прокси топлива (ГдеБЕНЗ)**

## CORS

По умолчанию разрешены:

- `https://iliawagen-blip.github.io`
- `http://localhost:3456`
- `capacitor://localhost`

Свой домен — добавьте в `ALLOWED_ORIGINS` в `src/index.js` и передеплойте.

## Маршрут на своём домене (опционально)

Cloudflare DNS + Worker route: `yourdomain.com/api/fuel/*` → этот worker.  
В moto-hud оставьте поле прокси пустым — будет использоваться `origin + /api/fuel`.
