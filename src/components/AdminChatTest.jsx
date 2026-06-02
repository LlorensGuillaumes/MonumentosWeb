import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import './AdminChatTest.css';

export default function AdminChatTest() {
  const [messages, setMessages] = useState([
    {
      role: 'system',
      content: 'Chatbot de pruebas — Patrimonio Europeo. Pregunta sobre monumentos, autores, rutas, periodos arquitectónicos…',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

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
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer || '(sin respuesta)',
          sources: data.sources || [],
          meta: data.meta || null,
          tools_used: data.tools_used || [],
        },
      ]);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error desconocido';
      setError(msg);
      setMessages(prev => [
        ...prev,
        { role: 'error', content: `Error: ${msg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const resetChat = () => {
    setMessages([
      {
        role: 'system',
        content: 'Chatbot de pruebas — Patrimonio Europeo. Pregunta sobre monumentos, autores, rutas, periodos arquitectónicos…',
      },
    ]);
    setError(null);
  };

  return (
    <div className="admin-chat-test">
      <div className="admin-chat-header">
        <div>
          <h1 style={{ margin: 0 }}>🤖 Chat test</h1>
          <p className="admin-chat-subtitle">
            MVP zero-cost: Groq (LLM) + pg_vector (embeddings) sobre 288k textos Wikipedia + datos estructurados de la BD.
          </p>
        </div>
        <button className="admin-chat-reset" onClick={resetChat}>
          Reiniciar
        </button>
      </div>

      <div className="admin-chat-window" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg-${m.role}`}>
            <div className="chat-msg-role">
              {m.role === 'user' && '🧑 Tú'}
              {m.role === 'assistant' && '🤖 Asistente'}
              {m.role === 'system' && 'ℹ️ Sistema'}
              {m.role === 'error' && '⚠️ Error'}
            </div>
            <div className="chat-msg-content">{m.content}</div>
            {m.sources?.length > 0 && (
              <div className="chat-msg-sources">
                <strong>Fuentes:</strong>
                <ul>
                  {m.sources.map(s => (
                    <li key={s.bien_id}>
                      <a href={`/monumento/${s.bien_id}`} target="_blank" rel="noopener noreferrer">
                        #{s.bien_id} {s.denominacion}
                      </a>
                      {s.municipio && ` · ${s.municipio}`}
                      {s.similarity != null && ` · sim ${(s.similarity * 100).toFixed(0)}%`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {m.tools_used?.length > 0 && (
              <div className="chat-msg-tools">
                <strong>Tools usadas:</strong>
                {m.tools_used.map((t, i) => (
                  <span key={i} className="chat-tool-chip" title={JSON.stringify(t.args)}>
                    {t.name}({Object.entries(t.args || {}).map(([k, v]) => `${k}=${v}`).join(', ')})
                    {t.count != null && ` → ${t.count}`}
                    {t.error && ` ⚠️`}
                  </span>
                ))}
              </div>
            )}
            {m.meta && (
              <div className="chat-msg-meta">
                {m.meta.model && <span>modelo: {m.meta.model}</span>}
                {m.meta.tokens_in != null && <span>· in: {m.meta.tokens_in}</span>}
                {m.meta.tokens_out != null && <span>· out: {m.meta.tokens_out}</span>}
                {m.meta.elapsed_ms != null && <span>· {m.meta.elapsed_ms}ms</span>}
                {m.meta.iterations != null && <span>· iter: {m.meta.iterations}</span>}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="chat-msg chat-msg-assistant">
            <div className="chat-msg-role">🤖 Asistente</div>
            <div className="chat-msg-content"><em>Pensando…</em></div>
          </div>
        )}
      </div>

      <div className="admin-chat-input">
        <textarea
          rows={2}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pregunta sobre patrimonio… (Enter para enviar, Shift+Enter para nueva línea)"
          disabled={loading}
        />
        <button onClick={send} disabled={loading || !input.trim()}>
          Enviar
        </button>
      </div>

      {error && (
        <div className="admin-chat-error">
          {error}
        </div>
      )}

      <div className="admin-chat-tips">
        <strong>Ejemplos:</strong>
        <button onClick={() => setInput('¿Quién es Josep Cañas?')}>¿Quién es Josep Cañas?</button>
        <button onClick={() => setInput('Háblame del Monestir de Sant Sebastià dels Gorgs')}>Monestir Sant Sebastià</button>
        <button onClick={() => setInput('¿Qué iglesias mudéjares hay en Aragón?')}>Iglesias mudéjares en Aragón</button>
        <button onClick={() => setInput('Recomiéndame patrimonio románico en Cataluña')}>Románico en Cataluña</button>
      </div>
    </div>
  );
}
