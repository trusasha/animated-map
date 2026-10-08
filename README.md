# Trip Animator

Маршрут путешествия → анимированная 3D-карта → MP4 для соцсетей.

```bash
npm install
cp .env.example .env   # вписать OPENAI_API_KEY
npm run dev            # http://localhost:5173
```

- `npm run check` — self-check таймлайна анимации
- `npm run build && npm start` — прод-режим

## Как устроено

| Часть | Что |
|---|---|
| Карта | MapLibre GL v6, globe-проекция; спутник Esri / OpenFreeMap (без ключей) |
| 3D | Three.js custom layer; фигурки процедурные (`src/figures.ts`) или любой `.glb` |
| Маршрут | воздух — дуга по большому кругу с высотой; вода — большой круг; земля — OSRM по дорогам, упрощённый Douglas–Peucker |
| Видео | покадровый рендер на offscreen-карте → WebCodecs H.264 → MP4 (9:16, 4:5, 1:1, 16:9) |
| Фото → 3D | fal.ai Hunyuan3D v3 (`FAL_KEY`), ~$0.375 за модель, GLB сохраняется локально |
| Голос/текст | OpenAI transcription + structured output → точки и сегменты; геокодинг Photon |
| БД | `server/db.ts`: один `query()`; без `DATABASE_URL` — встроенный Postgres (PGlite, `./data/pg`), с ним — любой Postgres/Supabase |

## Переезд на Supabase

`DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres` — таблицы создадутся сами.
Файлы моделей пока лежат в `./data/uploads` (при переезде — в Supabase Storage).

## Ограничения

- Экспорт идёт в реальном браузере: не сворачивать вкладку во время рендера.
- Сервер слушает только localhost; `HOST=0.0.0.0` откроет его в локальной сети (вместе с вашими API-ключами). Микрофон на телефоне работает только по HTTPS.
- Публичные OSRM/Photon — демо-сервера без SLA.
