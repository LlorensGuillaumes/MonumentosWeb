# CLAUDE.md (MonumentosFront)

## Comandos
- **Dev:** `npm run dev` (Vite, port 5173)
- **Build:** `npm run build` | **Lint:** `npm run lint` (ESLint 9, solo JS/JSX)
- **Preview:** `npm run preview`

## Arquitectura (React 19 + Vite SPA)
Sin TS ni frameworks CSS. Plain CSS.

### Routing & State
- **Router:** `App.jsx` (`react-router-dom`). Lazy loading excepto Home/Login. Protegido por `<RequireAuth>`.
- **Contexts:**
  - `AppContext`: Global state (filters, stats, map). `reloadFiltros()` gestiona cascada geográfica.
  - `AuthContext`: JWT (localStorage), favorites (optimistic updates), `isPremium`.

### Core Systems
- **API:** `src/services/api.js`. Axios con interceptor JWT y auto-limpieza 401.
- **Map:** Leaflet. Zoom < 7 (CCAA resumen); Zoom >= 7 (Detail mode, CircleMarkers con color-code por tipo).
- **Filters:** Cascading geo (adaptado por país) + content (classification/tipo excluyentes).
- **i18n:** `react-i18next` (8 idiomas). Solo UI labels. Contenido monumentos original.
- **PWA:** `vite-plugin-pwa`. Cache: detalles (7d), wiki (30d), search (1h).

## Convenciones
- **Idioma:** Usuario habla Español.
- **Estructura:** `.jsx` + `.css` juntos. Pages en `src/pages/`, componentes en `src/components/`.
- **ESLint:** Unused vars permitidos si empiezan por `_` o Mayúscula.
- **Tips:** `src/data/curatedRoutes.js` (35 rutas). `estilo` usa stems (ej: 'románic'). Regiones sin acentos en DB.

## Changelog (Max 5 entradas)
| Fecha | Cambios | Archivos |
|-------|---------|----------|
| 2026-06-25 | Fotos de usuario (Supabase + moderación) + panel admin gestión imágenes | `PhotoUpload.jsx`, `ImagenesAdmin.jsx/css`, `Detail.jsx`, `api.js` |
| 2026-06-25 | Fix 59 fichas HN mal cruzadas por coords: movidas a bien nuevo correcto | `node2/_corregir_cruces_local.cjs` |
| 2026-04-10 | Soporte dark mode en Filters/Search/Login (vars CSS) | `Filters.css`, `Search.css`, `Login.css` |
| 2026-04-17 | CuratedRouteDetail: mostrar paradas de BD (mapa→paradas→nearby lazy) | `CuratedRouteDetail.jsx/css`, `locales/es.json` |
| 2026-04-16 | Reclasificación tipos_monumento ronda 1+2: 14.284 items corregidos | `node2/_reclasificar_desde_wikidata.cjs` |
