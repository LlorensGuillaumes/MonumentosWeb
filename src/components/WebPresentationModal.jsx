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
🗺️ Mapa interactivo con más de 258.000 monumentos
📸 Miles de fotografías y fichas detalladas
🚶 Rutas culturales temáticas
🎯 Planificador de visitas personalizado
🌍 Disponible en 8 idiomas

Todos los datos provienen de fuentes oficiales: Wikidata, IAPH Andalucía, DIBA Barcelona, Ministerio de Cultura de Francia, DGPC Portugal y más.

👉 Entra gratis: patrimonio-europeo.netlify.app`,
  },
  en: {
    headlineLines: ['Discover', 'European heritage'],
    hashtags: '#heritagetravel #historicalmonuments #europeantravel #spain #italy #france #portugal #worldheritage #architecture #culturaltourism #historylovers #unesco #monuments #traveleurope',
    body: `🏛️ Passionate about history and architecture? Meet Patrimonio Europeo, a free web app to explore the architectural heritage of Spain, Italy, France and Portugal.

✨ What you will find:
🗺️ Interactive map with over 258,000 monuments
📸 Thousands of photos and detailed records
🚶 Themed cultural routes
🎯 Visit planner
🌍 Available in 8 languages

All data comes from official sources: Wikidata, IAPH Andalucía, DIBA Barcelona, French Ministry of Culture, DGPC Portugal and more.

👉 Free access: patrimonio-europeo.netlify.app`,
  },
};

export default function WebPresentationModal({ onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [palette, setPalette] = useState('azul');
  const [format, setFormat] = useState('square');
  const [lang, setLang] = useState('es');
  const [copied, setCopied] = useState('');
  const previewRef = useRef(null);

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

    // Scale text sizes per format
    const titleSize = isLandscape ? 46 : isStory ? 82 : 70;
    const titleLineH = Math.round(titleSize * 1.1);
    const subSize = isLandscape ? 22 : 32;
    const statNumSize = isLandscape ? 48 : isStory ? 88 : 76;
    const statLabelSize = isLandscape ? 18 : 24;
    const urlSize = isLandscape ? 22 : 30;

    const cx = f.w / 2;

    // Layout positions (logoY = baseline of the emoji text)
    const logoY = isStory ? 270 : isLandscape ? 120 : 165;
    const brandY = isStory ? 310 : isLandscape ? 150 : 200;
    const titleY = isStory ? 510 : isLandscape ? 240 : 370;
    const titleY2 = titleY + titleLineH;
    const subY = titleY2 + subSize + 30;
    const statsY = isStory ? 1320 : isLandscape ? 440 : 800;
    const urlY = f.h - (isLandscape ? 60 : isStory ? 160 : 110);

    // Stats block
    const gap = isLandscape ? 200 : isStory ? 310 : 290;
    const stat = (x, num, label) => `
      <text x="${x}" y="${statsY}" text-anchor="middle" font-family="Georgia, serif" font-size="${statNumSize}" font-weight="bold" fill="${p.accent}">${num}</text>
      <text x="${x}" y="${statsY + statLabelSize + 18}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${statLabelSize}" fill="${p.textMuted}">${label}</text>
    `;

    const stats1x = cx - gap;
    const stats2x = cx;
    const stats3x = cx + gap;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${f.w}" height="${f.h}" viewBox="0 0 ${f.w} ${f.h}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${p.bgFrom}"/>
          <stop offset="100%" stop-color="${p.bgTo}"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="0%" r="80%">
          <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${p.accent}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${f.w}" height="${f.h}" fill="url(#bg)"/>
      <rect width="${f.w}" height="${f.h}" fill="url(#glow)"/>

      <!-- Logo: classical building emoji (same as navbar) -->
      <text x="${cx}" y="${logoY}" text-anchor="middle" font-size="${isLandscape ? 110 : isStory ? 180 : 150}" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','EmojiOne Color','Twemoji Mozilla',sans-serif">🏛️</text>

      <!-- Brand -->
      <text x="${cx}" y="${brandY + (isLandscape ? 20 : 40)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${isLandscape ? 20 : 28}" font-weight="600" fill="${p.textMuted}" letter-spacing="4">PATRIMONIO EUROPEO</text>

      <!-- Title (2 lines) -->
      <text x="${cx}" y="${titleY}" text-anchor="middle" font-family="Georgia, serif" font-size="${titleSize}" font-weight="bold" fill="${p.text}">${escapeXml(copy.headlineLines[0])}</text>
      <text x="${cx}" y="${titleY2}" text-anchor="middle" font-family="Georgia, serif" font-size="${titleSize}" font-weight="bold" fill="${p.text}">${escapeXml(copy.headlineLines[1])}</text>
      <text x="${cx}" y="${subY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${subSize}" fill="${p.textMuted}">${lang === 'es' ? 'España · Francia · Italia · Portugal' : 'Spain · France · Italy · Portugal'}</text>

      <!-- Stats -->
      ${stat(stats1x, total, lang === 'es' ? 'monumentos' : 'monuments')}
      ${stat(stats2x, paises, lang === 'es' ? 'países' : 'countries')}
      ${stat(stats3x, conImagen, lang === 'es' ? 'con fotos' : 'with photos')}

      <!-- URL pill -->
      <rect x="${cx - (isLandscape ? 280 : 360)}" y="${urlY - urlSize + 4}" width="${isLandscape ? 560 : 720}" height="${urlSize + 28}" rx="${(urlSize + 28) / 2}" fill="${p.accent}" opacity="0.18"/>
      <text x="${cx}" y="${urlY + 12}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${urlSize}" font-weight="bold" fill="${p.accent}">patrimonio-europeo.netlify.app</text>
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

  return (
    <div className="wpm-overlay" onClick={onClose}>
      <div className="wpm-modal" onClick={e => e.stopPropagation()}>
        <div className="wpm-header">
          <h2>Presentación de la web</h2>
          <button className="wpm-close" onClick={onClose}>&times;</button>
        </div>

        <div className="wpm-body">
          {loading ? (
            <div className="wpm-loading">Cargando estadísticas...</div>
          ) : (
            <>
              <div className="wpm-preview-area">
                <div className="wpm-preview-wrapper" data-format={format}>
                  {svgDataUrl && (
                    <img
                      ref={previewRef}
                      src={svgDataUrl}
                      alt="Presentación"
                      className="wpm-preview-img"
                    />
                  )}
                </div>
              </div>

              <div className="wpm-controls">
                <div className="wpm-control-group">
                  <label>Formato</label>
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
                  <label>Paleta</label>
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
                  <label>Idioma del texto</label>
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
                    ⬇ Descargar PNG
                  </button>
                  <button className="wpm-btn wpm-btn-secondary" onClick={downloadSvg}>
                    ⬇ Descargar SVG
                  </button>
                </div>

                <div className="wpm-control-group">
                  <label>Texto del post (copia y pega en Instagram/Facebook)</label>
                  <textarea
                    className="wpm-textarea"
                    value={fullText}
                    readOnly
                    rows={14}
                  />
                  <div className="wpm-text-actions">
                    <span className="wpm-char-count">{fullText.length} caracteres · max 2200 en Instagram</span>
                    <button
                      className={`wpm-btn wpm-btn-secondary ${copied === 'tags' ? 'copied' : ''}`}
                      onClick={handleCopyHashtags}
                    >
                      {copied === 'tags' ? '✓ Copiado' : 'Copiar hashtags'}
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
    </defs>
    <rect width="${f.w}" height="${f.h}" fill="url(#bg)"/>
    <rect width="${f.w}" height="${f.h}" fill="url(#glow)"/>
    <rect width="${f.w}" height="${f.h}" fill="url(#glow2)"/>

    <!-- Top-left logo + brand -->
    <text x="70" y="${logoY}" text-anchor="start" font-size="${logoSize}" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','EmojiOne Color','Twemoji Mozilla',sans-serif">🏛️</text>
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
