import { useEffect, useRef, useState } from 'react';
import { getStats } from '../services/api';
import './WebPresentationModal.css';

const PALETTES = {
  azul: {
    name: 'Azul clásico',
    bgFrom: '#0f172a',
    bgTo: '#1e3a8a',
    accent: '#60a5fa',
    text: '#ffffff',
    textMuted: '#cbd5e1',
  },
  terracota: {
    name: 'Terracota',
    bgFrom: '#451a03',
    bgTo: '#92400e',
    accent: '#fbbf24',
    text: '#ffffff',
    textMuted: '#fde68a',
  },
  esmeralda: {
    name: 'Esmeralda',
    bgFrom: '#064e3b',
    bgTo: '#047857',
    accent: '#a7f3d0',
    text: '#ffffff',
    textMuted: '#d1fae5',
  },
  sepia: {
    name: 'Sepia',
    bgFrom: '#1c1917',
    bgTo: '#57534e',
    accent: '#fbbf24',
    text: '#ffffff',
    textMuted: '#e7e5e4',
  },
};

const FORMATS = {
  square: { name: 'Instagram cuadrado', w: 1080, h: 1080 },
  story: { name: 'Instagram / FB story', w: 1080, h: 1920 },
  landscape: { name: 'Facebook landscape', w: 1200, h: 630 },
  cover: { name: 'Portada Facebook', w: 1640, h: 856 },
};

const POST_COPIES = {
  es: {
    headlineLines: ['Descubre el', 'patrimonio europeo'],
    hashtags: '#patrimoniohistorico #turismocultural #monumentos #españa #italia #francia #portugal #viajeshistoricos #worldheritage #architecture #historia #rutasculturales #patrimonioeuropeo #unesco #traveleurope',
    body: `🏛️ ¿Te apasiona la historia y la arquitectura? Te presentamos Patrimonio Europeo, una web gratuita para descubrir el patrimonio arquitectónico de España, Italia, Francia y Portugal.

✨ ¿Qué encontrarás?
🗺️ Mapa interactivo con más de 300.000 monumentos
📸 Fotografías y fichas detalladas con su descripción
👤 Fichas de autores: arquitectos y escultores con biografía y obras
🚶 Rutas culturales temáticas
🛟 Patrimonio en riesgo: Lista Roja de Hispania Nostra
🔎 Búsqueda y filtros avanzados (estilo, época, tipo…)
🌍 Disponible en 8 idiomas

Todos los datos provienen de fuentes oficiales: Wikidata, IAPH Andalucía, DIBA Barcelona, Ministerio de Cultura de Francia, DGPC Portugal y más.

👉 Entra gratis: patrimonio-europeo.netlify.app`,
  },
  en: {
    headlineLines: ['Discover', 'European heritage'],
    hashtags: '#heritagetravel #historicalmonuments #europeantravel #spain #italy #france #portugal #worldheritage #architecture #culturaltourism #historylovers #unesco #monuments #traveleurope',
    body: `🏛️ Passionate about history and architecture? Meet Patrimonio Europeo, a free web app to explore the architectural heritage of Spain, Italy, France and Portugal.

✨ What you will find:
🗺️ Interactive map with over 300,000 monuments
📸 Photos and detailed records with descriptions
👤 Creator profiles: architects and sculptors with biography and works
🚶 Themed cultural routes
🛟 Heritage at risk: Hispania Nostra's Red List
🔎 Advanced search and filters (style, period, type…)
🌍 Available in 8 languages

All data comes from official sources: Wikidata, IAPH Andalucía, DIBA Barcelona, French Ministry of Culture, DGPC Portugal and more.

👉 Free access: patrimonio-europeo.netlify.app`,
  },
};

// Brand emblem with 3 buildings (dolmen + castle + cathedral). Positioned at (x, y) top-left.
// Caller must include LOGO_GRADIENT_DEF inside the parent <defs>.
function buildLogoSvg(x, y, size) {
  const scale = size / 1024;
  return `<g transform="translate(${x}, ${y}) scale(${scale})">
    <circle cx="512" cy="512" r="512" fill="url(#logo-bg)"/>
    <circle cx="512" cy="512" r="490" stroke="#F8FAFC" stroke-width="6" fill="none" opacity="0.35"/>
    <path d="M 280 200 A 320 320 0 0 1 744 200" stroke="#D6BC7A" stroke-width="14" stroke-linecap="round" fill="none" opacity="0.85"/>
    <path d="M260 590 L380 590" stroke="#F8FAFC" stroke-width="26" stroke-linecap="round"/>
    <path d="M282 590 L295 680" stroke="#F8FAFC" stroke-width="26" stroke-linecap="round"/>
    <path d="M345 590 L358 680" stroke="#F8FAFC" stroke-width="26" stroke-linecap="round"/>
    <path d="M415 360 L415 600 L605 600 L605 360" stroke="#F8FAFC" stroke-width="22" stroke-linejoin="round" fill="none"/>
    <path d="M415 360 L437 338 L459 360 L481 338 L503 360 L525 338 L547 360 L569 338 L591 360 L605 360" stroke="#F8FAFC" stroke-width="22" stroke-linejoin="round" fill="none"/>
    <rect x="488" y="460" width="44" height="140" stroke="#D6BC7A" stroke-width="18" fill="none" rx="4"/>
    <path d="M645 400 L780 400 L780 680 L645 680 Z" stroke="#F8FAFC" stroke-width="22" stroke-linejoin="round" fill="none"/>
    <path d="M712 260 L645 400 L780 400 Z" stroke="#F8FAFC" stroke-width="22" stroke-linejoin="round" fill="none"/>
    <circle cx="712" cy="490" r="28" stroke="#D6BC7A" stroke-width="18" fill="none"/>
    <path d="M687 680 L687 555 Q712 515 737 555 L737 680" stroke="#D6BC7A" stroke-width="18" fill="none"/>
  </g>`;
}

// Gradient def to embed inside <defs> of the parent SVG.
const LOGO_GRADIENT_DEF = `<linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%" stop-color="#1a365d"/>
  <stop offset="100%" stop-color="#2c5282"/>
</linearGradient>`;

// Persist user choices across sessions
const LS_KEY = 'wpm:prefs:v1';
function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function WebPresentationModal({ onClose }) {
  const initialPrefs = loadPrefs();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [palette, setPalette] = useState(initialPrefs.palette || 'azul');
  const [format, setFormat] = useState(initialPrefs.format || 'square');
  const [lang, setLang] = useState(initialPrefs.lang || 'es');
  const [copied, setCopied] = useState('');
  const previewRef = useRef(null);

  // Persist preferences whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ palette, format, lang }));
    } catch { /* localStorage might be disabled */ }
  }, [palette, format, lang]);

  // Close on ESC
  useEffect(() => {
    const handleKey = e => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    (async () => {
      try {
        const s = await getStats();
        setStats(s);
      } catch (err) {
        console.error('Error loading stats:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const buildSvg = () => {
    if (!stats) return '';
    const p = PALETTES[palette];
    const f = FORMATS[format];
    const copy = POST_COPIES[lang];

    const total = stats.total.toLocaleString('es-ES');
    const paises = stats.por_pais.length;
    const conImagen = stats.imagenes.toLocaleString('es-ES');

    const isStory = format === 'story';
    const isLandscape = format === 'landscape';
    const isCover = format === 'cover';

    if (isCover) return buildCoverSvg(p, f, lang, total, paises, conImagen);

    // Sizes
    const logoSize = isLandscape ? 130 : isStory ? 380 : 260;
    const brandSize = isLandscape ? 18 : 28;
    const titleSize = isLandscape ? 38 : isStory ? 90 : 68;
    const titleLineH = Math.round(titleSize * 1.05);
    const subSize = isLandscape ? 18 : 30;
    const statNumSize = isLandscape ? 38 : isStory ? 78 : 64;
    const statLabelSize = isLandscape ? 14 : isStory ? 24 : 20;
    const urlSize = isLandscape ? 20 : isStory ? 36 : 30;

    const cx = f.w / 2;

    // Vertical rhythm (stacked top to bottom)
    const logoTop = isLandscape ? 30 : isStory ? 140 : 80;
    const brandY = logoTop + logoSize + (isLandscape ? 30 : 60);
    const dividerY = brandY + (isLandscape ? 14 : 24);
    const titleY = dividerY + (isLandscape ? 44 : isStory ? 130 : 96);
    const titleY2 = titleY + titleLineH;
    const subY = titleY2 + subSize + (isLandscape ? 12 : 28);

    // Stat cards (positioned just below subtitle)
    // cardW must comfortably fit a 6-7 digit number ("258.000") at statNumSize × 0.55 per char
    const cardW = isLandscape ? 220 : isStory ? 320 : 310;
    const cardH = isLandscape ? 110 : isStory ? 240 : 170;
    const cardGap = isLandscape ? 20 : isStory ? 30 : 24;
    const cardsTotalW = cardW * 3 + cardGap * 2;
    const cardsLeft = cx - cardsTotalW / 2;
    const cardsTop = subY + (isLandscape ? 18 : isStory ? 120 : 40);
    const cardsBottom = cardsTop + cardH;

    // URL pill flows after cards
    const urlY = isStory ? Math.max(cardsBottom + 120, f.h - 180) : cardsBottom + (isLandscape ? 50 : 80);

    const statCard = (i, num, label) => {
      const x = cardsLeft + i * (cardW + cardGap);
      const y = cardsTop;
      return `
        <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="${isLandscape ? 16 : 22}"
              fill="${p.accent}" opacity="0.10"/>
        <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="${isLandscape ? 16 : 22}"
              fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.45"/>
        <text x="${x + cardW / 2}" y="${y + cardH * 0.55}" text-anchor="middle"
              font-family="Georgia, serif" font-size="${statNumSize}" font-weight="bold" fill="${p.accent}">${num}</text>
        <text x="${x + cardW / 2}" y="${y + cardH * 0.85}" text-anchor="middle"
              font-family="Arial, sans-serif" font-size="${statLabelSize}" fill="${p.textMuted}" letter-spacing="2">${label}</text>
      `;
    };

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${f.w}" height="${f.h}" viewBox="0 0 ${f.w} ${f.h}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${p.bgFrom}"/>
          <stop offset="100%" stop-color="${p.bgTo}"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="0%" r="80%">
          <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="${p.accent}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="glow2" cx="50%" cy="100%" r="70%">
          <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="${p.accent}" stop-opacity="0"/>
        </radialGradient>
        ${LOGO_GRADIENT_DEF}
      </defs>
      <rect width="${f.w}" height="${f.h}" fill="url(#bg)"/>
      <rect width="${f.w}" height="${f.h}" fill="url(#glow)"/>
      <rect width="${f.w}" height="${f.h}" fill="url(#glow2)"/>

      <!-- Brand logo (emblem) -->
      ${buildLogoSvg(cx - logoSize / 2, logoTop, logoSize)}

      <!-- Brand text -->
      <text x="${cx}" y="${brandY}" text-anchor="middle"
            font-family="Arial, sans-serif" font-size="${brandSize}" font-weight="700"
            fill="${p.text}" letter-spacing="${isLandscape ? 6 : 8}">PATRIMONIO EUROPEO</text>

      <!-- Gold accent divider -->
      <line x1="${cx - (isLandscape ? 90 : 130)}" y1="${dividerY}" x2="${cx + (isLandscape ? 90 : 130)}" y2="${dividerY}"
            stroke="${p.accent}" stroke-width="2" opacity="0.7"/>

      <!-- Title (2 lines, italic-style serif) -->
      <text x="${cx}" y="${titleY}" text-anchor="middle"
            font-family="Georgia, serif" font-size="${titleSize}" font-weight="bold" fill="${p.text}">${escapeXml(copy.headlineLines[0])}</text>
      <text x="${cx}" y="${titleY2}" text-anchor="middle"
            font-family="Georgia, serif" font-size="${titleSize}" font-weight="bold" fill="${p.text}">${escapeXml(copy.headlineLines[1])}</text>

      <!-- Subtitle / countries -->
      <text x="${cx}" y="${subY}" text-anchor="middle"
            font-family="Arial, sans-serif" font-size="${subSize}" fill="${p.textMuted}" letter-spacing="2">${lang === 'es' ? 'España · Italia · Francia · Portugal' : 'Spain · Italy · France · Portugal'}</text>

      <!-- Stat cards -->
      ${statCard(0, total, lang === 'es' ? 'MONUMENTOS' : 'MONUMENTS')}
      ${statCard(1, paises, lang === 'es' ? 'PAÍSES' : 'COUNTRIES')}
      ${statCard(2, conImagen, lang === 'es' ? 'CON FOTOS' : 'WITH PHOTOS')}

      <!-- URL pill -->
      <rect x="${cx - (isLandscape ? 290 : 380)}" y="${urlY - urlSize - 4}" width="${isLandscape ? 580 : 760}" height="${urlSize + 32}" rx="${(urlSize + 32) / 2}"
            fill="${p.accent}" opacity="0.18"/>
      <rect x="${cx - (isLandscape ? 290 : 380)}" y="${urlY - urlSize - 4}" width="${isLandscape ? 580 : 760}" height="${urlSize + 32}" rx="${(urlSize + 32) / 2}"
            fill="none" stroke="${p.accent}" stroke-width="1.5" opacity="0.5"/>
      <text x="${cx}" y="${urlY + 14}" text-anchor="middle"
            font-family="Arial, sans-serif" font-size="${urlSize}" font-weight="bold" fill="${p.accent}" letter-spacing="1">patrimonio-europeo.netlify.app</text>
    </svg>`;
  };

  const svgString = stats ? buildSvg() : '';
  const svgDataUrl = svgString
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`
    : '';

  const downloadPng = async () => {
    if (!svgString) return;
    const f = FORMATS[format];
    const canvas = document.createElement('canvas');
    canvas.width = f.w;
    canvas.height = f.h;
    const ctx = canvas.getContext('2d');

    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, f.w, f.h);
        canvas.toBlob(blob => {
          if (!blob) return reject(new Error('Blob null'));
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `patrimonio-europeo-${format}-${palette}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          resolve();
        }, 'image/png');
      };
      img.onerror = reject;
      img.src = svgDataUrl;
    });
  };

  const downloadSvg = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patrimonio-europeo-${format}-${palette}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copy = POST_COPIES[lang];
  const fullText = `${copy.body}\n\n${copy.hashtags}`;

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied('text');
    setTimeout(() => setCopied(''), 2000);
  };

  const handleCopyHashtags = async () => {
    await navigator.clipboard.writeText(copy.hashtags);
    setCopied('tags');
    setTimeout(() => setCopied(''), 2000);
  };

  const currentFormat = FORMATS[format];
  const formatDim = currentFormat ? `${currentFormat.w} × ${currentFormat.h} px` : '';

  return (
    <div className="wpm-overlay" onClick={onClose}>
      <div className="wpm-modal" onClick={e => e.stopPropagation()}>
        <div className="wpm-header">
          <div className="wpm-header-text">
            <h2>Generador de contenido</h2>
            <p>Crea tarjetas para redes sociales con las estadísticas en vivo del catálogo</p>
          </div>
          <button className="wpm-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="wpm-body">
          {loading ? (
            <div className="wpm-loading">
              <div className="wpm-skeleton" />
              <span>Cargando estadísticas del catálogo…</span>
            </div>
          ) : (
            <>
              <div className="wpm-preview-area">
                <div className="wpm-preview-wrapper" data-format={format}>
                  {svgDataUrl && (
                    <img
                      ref={previewRef}
                      src={svgDataUrl}
                      alt="Vista previa"
                      className="wpm-preview-img"
                    />
                  )}
                </div>
              </div>

              <div className="wpm-controls">
                <div className="wpm-control-group">
                  <label>Formato {formatDim && <span className="wpm-hint">· {formatDim}</span>}</label>
                  <div className="wpm-chips">
                    {Object.entries(FORMATS).map(([key, f]) => (
                      <button
                        key={key}
                        className={`wpm-chip ${format === key ? 'active' : ''}`}
                        onClick={() => setFormat(key)}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="wpm-control-group">
                  <label>Paleta de colores</label>
                  <div className="wpm-chips">
                    {Object.entries(PALETTES).map(([key, pal]) => (
                      <button
                        key={key}
                        className={`wpm-chip ${palette === key ? 'active' : ''}`}
                        onClick={() => setPalette(key)}
                      >
                        <span
                          className="wpm-chip-dot"
                          style={{ background: `linear-gradient(135deg, ${pal.bgFrom}, ${pal.bgTo})` }}
                        />
                        {pal.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="wpm-control-group">
                  <label>Idioma</label>
                  <div className="wpm-chips">
                    <button
                      className={`wpm-chip ${lang === 'es' ? 'active' : ''}`}
                      onClick={() => setLang('es')}
                    >
                      Español
                    </button>
                    <button
                      className={`wpm-chip ${lang === 'en' ? 'active' : ''}`}
                      onClick={() => setLang('en')}
                    >
                      English
                    </button>
                  </div>
                </div>

                <div className="wpm-download-row">
                  <button className="wpm-btn wpm-btn-primary" onClick={downloadPng}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Descargar PNG
                  </button>
                  <button className="wpm-btn wpm-btn-secondary" onClick={downloadSvg}>
                    SVG
                  </button>
                </div>

                <div className="wpm-control-group">
                  <label>Texto del post</label>
                  <textarea
                    className="wpm-textarea"
                    value={fullText}
                    readOnly
                    rows={10}
                  />
                  <div className="wpm-text-actions">
                    <span className="wpm-char-count">
                      <strong>{fullText.length}</strong> caracteres · Instagram máx. 2200 · Twitter máx. 280
                    </span>
                    <button
                      className={`wpm-btn wpm-btn-secondary ${copied === 'tags' ? 'copied' : ''}`}
                      onClick={handleCopyHashtags}
                    >
                      {copied === 'tags' ? '✓ Hashtags copiados' : 'Solo hashtags'}
                    </button>
                    <button
                      className={`wpm-btn wpm-btn-primary ${copied === 'text' ? 'copied' : ''}`}
                      onClick={handleCopyText}
                    >
                      {copied === 'text' ? '✓ Copiado' : 'Copiar todo'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Cover layout: 1640x856 Facebook cover. Safe zone approx. center 60% horizontally.
// No big serif title; focus on 3 large stats + small brand corner + bottom URL pill.
function buildCoverSvg(p, f, lang, total, paises, conImagen) {
  const cx = f.w / 2;
  const cy = f.h / 2;

  // Sizes
  const logoSize = 90;            // emoji top-left
  const brandSize = 28;           // "PATRIMONIO EUROPEO"
  const taglineSize = 34;         // tagline centered top
  const statNumSize = 92;         // stat numbers
  const statLabelSize = 28;       // stat labels
  const urlSize = 32;             // url

  // Gaps between stat columns
  const gap = 400;

  // Vertical positions — the bottom ~45% center is blocked by the FB profile photo.
  // Everything important must sit in the upper half of the canvas.
  const logoY = 90;               // baseline of the emoji
  const brandY = 80;              // next to logo, slightly above its baseline
  const taglineY = 180;           // centered tagline
  const urlY = 240;               // url pill right below the tagline
  const statsY = 360;             // stat numbers baseline (just above avatar zone)
  const statsLabelY = statsY + statLabelSize + 22;

  const tagline = lang === 'es' ? 'España · Francia · Italia · Portugal' : 'Spain · France · Italy · Portugal';
  const labels = lang === 'es'
    ? { mon: 'monumentos', pais: 'países', fot: 'con fotos' }
    : { mon: 'monuments', pais: 'countries', fot: 'with photos' };

  const stat = (x, num, label) => `
    <text x="${x}" y="${statsY}" text-anchor="middle" font-family="Georgia, serif" font-size="${statNumSize}" font-weight="bold" fill="${p.accent}">${num}</text>
    <text x="${x}" y="${statsLabelY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${statLabelSize}" fill="${p.textMuted}" letter-spacing="2">${label}</text>
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f.w}" height="${f.h}" viewBox="0 0 ${f.w} ${f.h}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${p.bgFrom}"/>
        <stop offset="100%" stop-color="${p.bgTo}"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="0%" r="80%">
        <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${p.accent}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="glow2" cx="50%" cy="100%" r="70%">
        <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="${p.accent}" stop-opacity="0"/>
      </radialGradient>
      ${LOGO_GRADIENT_DEF}
    </defs>
    <rect width="${f.w}" height="${f.h}" fill="url(#bg)"/>
    <rect width="${f.w}" height="${f.h}" fill="url(#glow)"/>
    <rect width="${f.w}" height="${f.h}" fill="url(#glow2)"/>

    <!-- Top-left brand logo + text -->
    ${buildLogoSvg(70, logoY - logoSize, logoSize)}
    <text x="175" y="${brandY}" text-anchor="start" font-family="Arial, sans-serif" font-size="${brandSize}" font-weight="700" fill="${p.text}" letter-spacing="3">PATRIMONIO</text>
    <text x="175" y="${brandY + brandSize + 4}" text-anchor="start" font-family="Arial, sans-serif" font-size="${brandSize}" font-weight="700" fill="${p.text}" letter-spacing="3">EUROPEO</text>

    <!-- Divider line under brand -->
    <line x1="70" y1="${logoY + 40}" x2="${f.w - 70}" y2="${logoY + 40}" stroke="${p.accent}" stroke-width="1" opacity="0.3"/>

    <!-- Tagline centered -->
    <text x="${cx}" y="${taglineY + 50}" text-anchor="middle" font-family="Georgia, serif" font-size="${taglineSize}" font-weight="400" fill="${p.textMuted}" font-style="italic">${escapeXml(tagline)}</text>

    <!-- Three huge stats -->
    ${stat(cx - gap, total, labels.mon)}
    ${stat(cx, paises, labels.pais)}
    ${stat(cx + gap, conImagen, labels.fot)}

    <!-- Decorative dividers between stats -->
    <line x1="${cx - gap / 2}" y1="${statsY - 60}" x2="${cx - gap / 2}" y2="${statsLabelY - 10}" stroke="${p.accent}" stroke-width="1" opacity="0.2"/>
    <line x1="${cx + gap / 2}" y1="${statsY - 60}" x2="${cx + gap / 2}" y2="${statsLabelY - 10}" stroke="${p.accent}" stroke-width="1" opacity="0.2"/>

    <!-- URL pill bottom -->
    <rect x="${cx - 400}" y="${urlY - urlSize}" width="800" height="${urlSize + 32}" rx="${(urlSize + 32) / 2}" fill="${p.accent}" opacity="0.18"/>
    <text x="${cx}" y="${urlY + 14}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${urlSize}" font-weight="bold" fill="${p.accent}" letter-spacing="1">patrimonio-europeo.netlify.app</text>
  </svg>`;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
