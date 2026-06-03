import { useState, useRef, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Preguntame.css';

const TIPO_TO_COLOR = {
  'Iglesia / Ermita': '#be185d',
  'Catedral': '#be185d',
  'Monasterio / Convento': '#be185d',
  'Arte religioso': '#be185d',
  'Mezquita / Sinagoga': '#be185d',
  'Cruz / Crucero': '#be185d',
  'Castillo / Fortaleza': '#7c3aed',
  'Torre': '#7c3aed',
  'Muralla': '#7c3aed',
  'Edificio civil': '#0369a1',
  'Palacio': '#0369a1',
  'Casa señorial / Mansión': '#0369a1',
  'Teatro': '#0369a1',
  'Museo': '#0369a1',
  'Monumento conmemorativo': '#0369a1',
  'Yacimiento arqueológico': '#92400e',
  'Megalítico': '#92400e',
  'Arquitectura rural': '#065f46',
  'Molino': '#065f46',
  'Patrimonio industrial': '#065f46',
  'Puente': '#475569',
  'Acueducto': '#475569',
  'Fuente': '#475569',
  'Faro': '#475569',
  'Obra hidráulica': '#475569',
  'Plaza de toros': '#475569',
  'Cementerio': '#475569',
  'Balneario / Termas': '#475569',
};

const colorForTipo = (tipo) => TIPO_TO_COLOR[tipo] || '#888';

function makeNumberedIcon(n) {
  return L.divIcon({
    className: 'preguntame-num-icon',
    html: `<div class="num-marker"><span>${n}</span></div>`,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
  });
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const valid = points.filter(p => p.lat != null && p.lng != null);
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.flyTo([valid[0].lat, valid[0].lng], 12, { duration: 0.8 });
      return;
    }
    const bounds = L.latLngBounds(valid.map(p => [p.lat, p.lng]));
    map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 11, duration: 0.8 });
  }, [points, map]);
  return null;
}

// react-leaflet: si el contenedor cambia de visible (tabs móvil),
// el mapa cree que mide 0px y no carga las tiles. Invalidate al tocar tab.
function InvalidateOnTab({ activeTab }) {
  const map = useMap();
  useEffect(() => {
    if (activeTab === 'map') {
      // Pequeño delay para esperar a que el contenedor termine la transición CSS
      const t = setTimeout(() => map.invalidateSize(), 80);
      return () => clearTimeout(t);
    }
  }, [activeTab, map]);
  return null;
}

const INITIAL_SYSTEM = (t) => ({
  role: 'system',
  content: t('preguntame.systemHint', 'Pregúntame qué visitar en una zona, sobre un monumento, autor, periodo arquitectónico, ruta cultural…'),
});

const EXAMPLES = [
  'La semana que viene voy a Zaragoza y sus alrededores en coche, una semana. ¿Qué visitar?',
  '¿Qué iglesias mudéjares hay cerca de Calatayud?',
  'Recomiéndame patrimonio románico cerca de Jaca',
  '¿Quién es Josep Cañas?',
];

export default function Preguntame() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [messages, setMessages] = useState([INITIAL_SYSTEM(t)]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [highlights, setHighlights] = useState([]); // [{id, lat, lng, denominacion, tipo, n}]
  const [contexto, setContexto] = useState([]); // monumentos del entorno
  const [mobileTab, setMobileTab] = useState('chat');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  if (!user) return <Navigate to="/login?returnTo=/preguntame" replace />;
  if (user.rol !== 'admin') return <Navigate to="/" replace />;

  const fetchHighlightsAndContext = async (answerText) => {
    const ids = [...new Set([...(answerText || '').matchAll(/#(\d{1,7})/g)].map(m => parseInt(m[1], 10)))];
    if (ids.length === 0) return;
    try {
      const res = await api.get(`/monumentos/by-ids?ids=${ids.slice(0, 30).join(',')}`);
      const monumentos = (res.data?.monumentos || [])
        .filter(m => m.latitud != null && m.longitud != null)
        .map((m, i) => ({
          id: m.id,
          n: i + 1,
          lat: m.latitud,
          lng: m.longitud,
          denominacion: m.denominacion,
          municipio: m.municipio,
          tipo: m.tipo_monumento,
        }));
      setHighlights(monumentos);
      if (monumentos.length > 0) {
        const lats = monumentos.map(m => m.lat);
        const lngs = monumentos.map(m => m.lng);
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
        const ctxRes = await api.get(`/monumentos/radio`, {
          params: { lat: centerLat, lng: centerLng, km: 60, limit: 200 },
        });
        const rawCtx = ctxRes.data?.items || ctxRes.data?.monumentos || ctxRes.data || [];
        const ctx = (Array.isArray(rawCtx) ? rawCtx : [])
          .filter(m => m.latitud != null && m.longitud != null)
          .filter(m => !ids.includes(m.id));
        setContexto(ctx);
      } else {
        setContexto([]);
      }
    } catch {
      // silent — el chat sigue funcionando aunque no se pinten los markers
    }
  };

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const res = await api.post('/admin/chat', { question: q });
      const data = res.data;
      const ans = data.answer || t('preguntame.noResponse', '(sin respuesta)');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: ans,
          sources: data.sources || [],
          meta: data.meta || null,
        },
      ]);
      await fetchHighlightsAndContext(ans);
      if (window.innerWidth <= 768) setMobileTab('map');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error';
      setError(msg);
      setMessages(prev => [...prev, { role: 'error', content: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const reset = () => {
    setMessages([INITIAL_SYSTEM(t)]);
    setHighlights([]);
    setContexto([]);
    setError(null);
  };

  const renderAnswer = (text) => {
    if (!text) return null;
    const idToN = new Map(highlights.map(h => [h.id, h.n]));
    const parts = text.split(/(#\d{1,7})/g);
    return parts.map((p, i) => {
      const m = p.match(/^#(\d{1,7})$/);
      if (m) {
        const id = parseInt(m[1], 10);
        const n = idToN.get(id);
        return (
          <span key={i} className="preguntame-id-badge">
            {n ? <span className="id-num">{n}</span> : null}
            <a href={`/monumento/${id}`} target="_blank" rel="noopener noreferrer">#{id}</a>
          </span>
        );
      }
      return <span key={i}>{p}</span>;
    });
  };

  const initialView = useMemo(() => ({ center: [40.3, -3.5], zoom: 6 }), []);

  return (
    <div className="preguntame-page">
      <div className="preguntame-mobile-tabs">
        <button
          className={mobileTab === 'chat' ? 'active' : ''}
          onClick={() => setMobileTab('chat')}
        >
          {t('preguntame.tabChat', 'Asistente')}
        </button>
        <button
          className={mobileTab === 'map' ? 'active' : ''}
          onClick={() => setMobileTab('map')}
        >
          {t('preguntame.tabMap', 'Mapa')} {highlights.length > 0 && <span className="tab-badge">{highlights.length}</span>}
        </button>
      </div>

      <div className={`preguntame-layout ${mobileTab === 'map' ? 'mobile-show-map' : 'mobile-show-chat'}`}>
        <div className="preguntame-map">
          <MapContainer
            center={initialView.center}
            zoom={initialView.zoom}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {/* Capa contexto: monumentos del entorno (colores tipología, pequeños) */}
            {contexto.map((m) => (
              <CircleMarker
                key={`ctx-${m.id}`}
                center={[m.latitud, m.longitud]}
                radius={4}
                pathOptions={{ color: colorForTipo(m.tipo_monumento), fillColor: colorForTipo(m.tipo_monumento), fillOpacity: 0.55, weight: 1 }}
              >
                <Popup>
                  <strong>{m.denominacion}</strong>
                  {m.municipio && <><br />{m.municipio}</>}
                  <br />
                  <a href={`/monumento/${m.id}`} target="_blank" rel="noopener noreferrer">
                    {t('preguntame.openSheet', 'Ver ficha')}
                  </a>
                </Popup>
              </CircleMarker>
            ))}
            {/* Capa destacados: markers numerados */}
            {highlights.map((h) => (
              <Marker key={`hl-${h.id}`} position={[h.lat, h.lng]} icon={makeNumberedIcon(h.n)}>
                <Popup>
                  <strong>{h.n}. {h.denominacion}</strong>
                  {h.municipio && <><br />{h.municipio}</>}
                  <br />
                  <a href={`/monumento/${h.id}`} target="_blank" rel="noopener noreferrer">
                    {t('preguntame.openSheet', 'Ver ficha')}
                  </a>
                </Popup>
              </Marker>
            ))}
            <FitBounds points={highlights.map(h => ({ lat: h.lat, lng: h.lng }))} />
            <InvalidateOnTab activeTab={mobileTab} />
          </MapContainer>
        </div>

        <aside className="preguntame-chat">
          <div className="preguntame-chat-head">
            <h2>{t('nav.askMe')}</h2>
            <button className="preguntame-reset" onClick={reset}>
              {t('preguntame.reset', 'Reiniciar')}
            </button>
          </div>

          <div className="preguntame-window" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`pgm-msg pgm-msg-${m.role}`}>
                {m.role === 'user' && <div className="pgm-msg-role">{t('preguntame.you', 'Tú')}</div>}
                {m.role === 'assistant' && <div className="pgm-msg-role">{t('preguntame.assistant', 'Asistente')}</div>}
                {m.role === 'error' && <div className="pgm-msg-role">⚠️</div>}
                <div className="pgm-msg-content">
                  {m.role === 'assistant' ? renderAnswer(m.content) : m.content}
                </div>
                {m.meta && (
                  <div className="pgm-msg-meta">
                    {m.meta.model && <span>{m.meta.model}</span>}
                    {m.meta.elapsed_ms != null && <span>· {(m.meta.elapsed_ms/1000).toFixed(1)}s</span>}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="pgm-msg pgm-msg-assistant">
                <div className="pgm-msg-role">{t('preguntame.assistant', 'Asistente')}</div>
                <div className="pgm-msg-content"><em>{t('preguntame.thinking', 'Pensando…')}</em></div>
              </div>
            )}
          </div>

          <div className="preguntame-input">
            <textarea
              rows={2}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={t('preguntame.inputPlaceholder', 'Escribe tu pregunta… (Enter para enviar)')}
              disabled={loading}
            />
            <button onClick={send} disabled={loading || !input.trim()}>
              {t('preguntame.send', 'Enviar')}
            </button>
          </div>

          {messages.length <= 1 && (
            <div className="preguntame-examples">
              <strong>{t('preguntame.examples', 'Ejemplos')}:</strong>
              {EXAMPLES.map(ex => (
                <button key={ex} onClick={() => setInput(ex)}>
                  {ex.length > 60 ? ex.slice(0, 57) + '…' : ex}
                </button>
              ))}
            </div>
          )}

          {error && <div className="preguntame-error">{error}</div>}
        </aside>
      </div>
    </div>
  );
}
