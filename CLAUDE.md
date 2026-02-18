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
| 18-02-26 | Netlify config: API URL Render, SPA redirects | `netlify.toml`, `.env` |
| 17-02-26 | Setup inicial y optimización tokens | `CLAUDE.md` |
