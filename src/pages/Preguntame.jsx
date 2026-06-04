import { useState, useRef, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import Map from '../components/Map';
import api from '../services/api';
import './Preguntame.css';

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
  const [mobileTab, setMobileTab] = useState('chat');
  const [modo, setModo] = useState('mixto'); // imprescindibles | mixto | descubre
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  if (!user) return <Navigate to="/login?returnTo=/preguntame" replace />;
  if (user.rol !== 'admin') return <Navigate to="/" replace />;

  const fetchHighlights = async (answerText) => {
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
      const res = await api.post('/admin/chat', { question: q, modo });
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
      await fetchHighlights(ans);
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
          <Map
            filters={{}}
            height="100%"
            showCCAASummary={true}
            extraMarkers={highlights}
            fitToExtra={true}
          />
        </div>

        <aside className="preguntame-chat">
          <div className="preguntame-chat-head">
            <h2>{t('nav.askMe')}</h2>
            <button className="preguntame-reset" onClick={reset}>
              {t('preguntame.reset', 'Reiniciar')}
            </button>
          </div>

          <div className="preguntame-modo">
            <button
              type="button"
              className={modo === 'imprescindibles' ? 'active' : ''}
              onClick={() => setModo('imprescindibles')}
              title={t('preguntame.modeMustSeeHint', 'UNESCO y los más famosos. Ideal para primer viaje.')}
            >
              {t('preguntame.modeMustSee', 'Imprescindibles')}
            </button>
            <button
              type="button"
              className={modo === 'mixto' ? 'active' : ''}
              onClick={() => setModo('mixto')}
              title={t('preguntame.modeMixedHint', 'Equilibrio entre canónicos y joyas locales.')}
            >
              {t('preguntame.modeMixed', 'Mixto')}
            </button>
            <button
              type="button"
              className={modo === 'descubre' ? 'active' : ''}
              onClick={() => setModo('descubre')}
              title={t('preguntame.modeDiscoverHint', 'Joyas locales menos conocidas, lo que NO sale en las guías.')}
            >
              {t('preguntame.modeDiscover', 'Descubre')}
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
