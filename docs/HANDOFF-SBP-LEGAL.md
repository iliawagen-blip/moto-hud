# Handoff v2: СБП, юридика, поддержка «Мото ИЛС»

> **Для:** агент-разработчик  
> **Проект:** `C:\Users\Илья\Documents\jul26\moto-hud`  
> **Repo:** https://github.com/iliawagen-blip/moto-hud  
> **PWA:** https://iliawagen-blip.github.io/moto-hud/  
> **Handoff:** 2026-07-07 (v2)  
> **Статус:** код и QR ✅ · **git push** ✅ · **privacy + store flavor** ✅ · касса 🟡 · webhook ⏳

---

## TL;DR для агента

1. **Сделано:** push на GitHub Pages; `privacy.html`, README Support, store APK без ссылки на оплату.  
2. **Не включать** широкую рекламу support, пока владелец не зарегистрирует **CloudKassir** (УСН 6% = чек обязателен).  
3. **Следующий код (опционально):** drawer «Поддержать» (только PWA).  
4. **Backend webhook** — отдельный private repo, не moto-hud.  
5. **RuStore APK** — без кнопки оплаты в UI ✅ (`applyStoreLegalUi`).

---

## 1. Контекст

| Параметр | Значение |
|----------|----------|
| Правообладатель | ИП Вагин Илья Александрович |
| Налоги | УСН 6% «Доходы» |
| Платежи | **СБП без эквайринга**, Альфа-Банк |
| Касса | **CloudKassir** (анкета в процессе) |
| Модель | Бесплатное ПО; оплата = **оферта**, не «донат» |
| Store | RuStore / NashStore / Rumarket (**не** Google Play) |

---

## 2. Жёсткие ограничения

- Секреты банка/кассы **не в git**, не в `js/`.
- В клиенте только публичные: QR, `qr.nspk.ru/…`, ссылки `docs/`.
- **Paywall запрещён** (п. 2.2 оферты).
- **Store APK:** ссылка на оплату только в описании карточки, не в UI.
- Чек **≤ следующий рабочий день** (ст. 14.5 КоАП).
- Email на support → нужны `privacy.html` + Роскомнадзор.

---

## 3. Прогресс (чеклист)

### Владелец / банк / касса

| # | Задача | Статус |
|---|--------|--------|
| 1 | СБП без эквайринга в Альфе | ✅ подключено |
| 2 | Статический QR «любая сумма» | ✅ |
| 3 | CloudKassir — анкета | 🟡 в процессе |
| 4 | CloudKassir — регистрация кассы в ФНС (КЭП) | ⏳ |
| 5 | Альфа → Настройки ОФД → CloudKassir | ⏳ после п.4 |
| 6 | Тест: друг → 50 ₽ → **ручной чек** в ЛК кассы | ⏳ |
| 7 | Уведомления Альфы на каждое зачисление СБП | ⏳ |

**CloudKassir анкета — подсказки владельцу:**

- **Веб-сайт:** `https://iliawagen-blip.github.io/moto-hud/` (push обязателен до отправки!)
- **Тариф:** ежемесячный (~3 500 ₽/мес)
- **СНО:** УСН (доход)
- **ЭДО:** не используется

### Код (локально готово, может быть не на Pages)

| # | Задача | Статус |
|---|--------|--------|
| 8 | `docs/offer.html` | ✅ |
| 9 | `docs/disclaimer.html` | ✅ |
| 10 | `docs/support.html` + QR + SBP link | ✅ |
| 11 | `docs/assets/sbp-qr.png` | ✅ |
| 12 | `js/legal-consent.js` + модалка первого запуска | ✅ |
| 13 | Ссылки в help drawer | ✅ |
| 14 | **`git push` → GitHub Pages** | ✅ |
| 15 | `docs/privacy.html` | ✅ |
| 16 | README — секция Support | ✅ |
| 17 | Webhook банк → CloudKassir | ❌ **агент**, private repo |
| 18 | Store build без pay-кнопки | ✅ `applyStoreLegalUi()` |

---

## 4. Константы и URL (публичные)

```
SBP_PAY_URL  = https://qr.nspk.ru/AS1A0073KULGI2489639NQM5QPNBUIOH
SUPPORT_URL  = docs/support.html
OFFER_URL    = docs/offer.html
PWA_BASE     = https://iliawagen-blip.github.io/moto-hud/
```

**Реквизиты (уже в offer.html):**

```
ИП Вагин Илья Александрович
ОГРНИП 326774600424480 · ИНН 772872195683
Р/с 40802810302280007293 · БИК 044525593 · к/с 30101810200000000593
Email iliawagen@gmail.com
```

---

## 5. Карта файлов

```
moto-hud/
├── index.html                 # legalModal, help → offer/disclaimer/support
├── css/app.css                # .legal-modal, .legal-blocked
├── js/
│   ├── legal-consent.js       # LEGAL_DISCLAIMER_VERSION=1, SBP_PAY_URL
│   ├── main.js                # initLegalConsent()
│   └── app.js                 # bundle (npm run build)
├── docs/
│   ├── HANDOFF-SBP-LEGAL.md   ← этот файл
│   ├── offer.html             ✅
│   ├── disclaimer.html        ✅
│   ├── support.html           ✅ QR + кнопка СБП + email field
│   ├── assets/sbp-qr.png      ✅
│   ├── privacy.html           ✅
│   ├── legal-doc.css
│   └── release-plan.html      # RuStore
└── README.md
```

**Нет в private repo:** webhook CloudKassir (см. §8).

---

## 6. Режим «ручные чеки» (до webhook)

Пока CloudKassir не связан с Альфой автоматически:

1. Платёж по QR / ссылке СБП.  
2. Push/email от Альфы о зачислении.  
3. Владелец **вручную** в ЛК CloudKassir → пробить чек (≤ 1 раб. день).  
4. Запись в КУДиР.

**Без зарегистрированной кассы принимать от физлиц нельзя** (УСН 6%).

На support.html email сохраняется в `sessionStorage` (`moto-hud-receipt-email`) — для будущего webhook; для ручных чеков владелец может спрашивать email отдельно.

---

## 7. Задачи агента (приоритет)

### P0 — сейчас

✅ Выполнено (2026-07-07): push, offer/support/disclaimer на Pages, legal modal.

Проверить после deploy (~2 мин):

- https://iliawagen-blip.github.io/moto-hud/docs/privacy.html  
- https://iliawagen-blip.github.io/moto-hud/docs/offer.html  
- https://iliawagen-blip.github.io/moto-hud/docs/support.html  
- https://iliawagen-blip.github.io/moto-hud/ → модалка disclaimer (первый визит)

### P1 — compliance + store ✅ (2026-07-07)

| Задача | Статус |
|--------|--------|
| `docs/privacy.html` | ✅ |
| Ссылки privacy | ✅ |
| README Support | ✅ |
| Store flavor | ✅ |

### P2 — автоматизация

| Задача | Детали |
|--------|--------|
| **Webhook** | Private repo; `POST /webhook/alfa-sbp` → CloudKassir API `sell` |
| **Email binding** | Form on support → server session или query token |
| **Drawer «💚 Поддержать»** | Только PWA (`index.html`), не store | ✅ |
| **NAV-PLAN.md** | «Финансирование» | ✅ |

---

## 8. Backend sketch (private, не коммитить)

```
POST /webhook/alfa-sbp     # подпись Альфы, idempotency paymentId
POST /internal/receipt     # CloudKassir sell
```

`.env`:

```
BANK_WEBHOOK_SECRET=
CLOUDKASSIR_API_KEY=
CLOUDKASSIR_SITE_ID=
RECEIPT_ITEM=Неисключительная лицензия на ПО Мото ИЛС
TAXATION=USN_INCOME
```

Чек: предмет **услуга/лицензия**, СНО **УСН доход**, без НДС.

---

## 9. Store vs PWA

| Канал | Support в UI | Support URL |
|-------|--------------|-------------|
| PWA / sideload | ✅ help drawer | `docs/support.html` |
| RuStore / NashStore / Rumarket | ❌ кнопки оплаты | только **описание** карточки |

---

## 10. Команды

```bash
npm run build          # app.js + www/
npm run dev            # :3456
npm run cap:sync       # Android после build
```

Тест disclaimer:

```javascript
localStorage.removeItem('moto-hud-legal-consent'); location.reload();
```

---

## 11. QA после push

- [ ] offer, support, disclaimer, **privacy** открываются на GitHub Pages  
- [ ] QR `assets/sbp-qr.png` грузится на support  
- [ ] Кнопка СБП → `qr.nspk.ru/AS1A0073KULGI2489639NQM5QPNBUIOH`  
- [ ] Disclaimer: agree → persist; decline → block  
- [ ] `npm run build` green  
- [ ] Нет секретов в diff

---

## 12. Не делать

- Принимать платежи публично **до** регистрации кассы в ФНС  
- API-ключи в moto-hud repo  
- Кнопка «Оплатить» в store APK  
- Paywall в HUD  
- «Донат» в UI/чеках  
- Google Play billing  

---

## 13. Definition of Done

**Фаза A (агент, сейчас):**

- [x] Push на GitHub Pages  
- [x] `docs/privacy.html`  
- [x] README Support  

**Фаза B (владелец + агент, после кассы):**

- [ ] CloudKassir + ФНС + привязка в Альфе  
- [ ] Тест 50 ₽ + ручной чек  
- [ ] Webhook (опционально на старте)  

**Фаза C (RuStore):**

- [x] privacy в карточке (URL готов)  
- [x] Store APK без pay UI  

---

## 14. Связанные docs

| Файл | Роль |
|------|------|
| [offer.html](./offer.html) | Оферта |
| [support.html](./support.html) | Оплата СБП |
| [disclaimer.html](./disclaimer.html) | Disclaimer |
| [privacy.html](./privacy.html) | Политика конфиденциальности |
| [release-plan.html](./release-plan.html) | RuStore |
| [NAV-PLAN.md](./NAV-PLAN.md) | Навигация (отдельно) |

---

**Контакт:** iliawagen@gmail.com · +7 915 027-49-02  
**Блокер владельца:** завершить CloudKassir + ФНС → только потом анонсировать support.
