# Шрифты Мото ИЛС (Google Fonts, OFL)

Скачайте woff2 в эту папку. До установки файлов работают системные fallback из `css/fonts.css`.

| Семейство | Файлы woff2 | Темы |
|-----------|-------------|------|
| B612 | Regular, Bold | avionics (label) |
| B612 Mono | Regular, Bold | avionics (цифры) |
| Manrope | 500, 600, 700, 800 | hitech (label) |
| Inter | 400–900, **tabular figures** | hitech (цифры) |
| Space Grotesk | 400–700 | space (label) |
| Exo 2 | 400–900 | space (цифры) |
| Saira Condensed | 600 Italic | sport (цифры) |
| Chakra Petch | 400–700 | sport (label) |
| Bitter | 400–700 | (резерв) |
| IBM Plex Mono | Medium (500) | (резерв) |
| Alfa Slab One | Regular | chopper (цифры — slab, знаки / эмблема) |
| Rye | Regular | chopper (подписи — western / Route 66) |
| DSEG7 Classic | Regular | vintage (цифры — 7-segment LCD) |
| VT323 | Regular | vintage (подписи — CRT-терминал) |
| Press Start 2P | Regular | vintage (fallback подписей, arcade) |

Пример имён файлов после скачивания:
- `B612-Regular.woff2`, `B612-Bold.woff2`
- `B612Mono-Regular.woff2`
- `Inter-Variable.woff2` (font-variation-settings: "tnum" 1)

После добавления файлов обновите `src:` в `css/fonts.css` на `url("/fonts/…")`.
