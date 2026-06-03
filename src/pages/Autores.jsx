import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Autores.css';

export default function Autores() {
  const [q, setQ] = useState('');
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedQid, setSelectedQid] = useState(null);
  const [bienes, setBienes] = useState([]);
  const [loadingBienes, setLoadingBienes] = useState(false);

  const fetchPersonas = useCallback(async (query) => {
    setLoading(true); setError(null);
    try {
      const params = query ? { q: query, limit: 40 } : { limit: 40 };
      const res = await api.get('/personas', { params });
      setPersonas(res.data.personas || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial: top personas con más bienes
  useEffect(() => { fetchPersonas(''); }, [fetchPersonas]);

  // Debounced search
  useEffect(() => {
    const handle = setTimeout(() => {
      fetchPersonas(q.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [q, fetchPersonas]);

  const verBienes = async (qid, nombre) => {
    if (!qid) return;
    setSelectedQid(qid);
    setLoadingBienes(true);
    setBienes([]);
    try {
      const res = await api.get(`/personas/${qid}/bienes`);
      setBienes(res.data.bienes || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoadingBienes(false);
    }
  };

  return (
    <div className="autores-page">
      <header className="autores-header">
        <h1>Autores, arquitectos y escultores</h1>
        <p className="autores-subtitle">
          Más de 8.000 monumentos del catálogo tienen autor identificado (arquitecto, creador, diseñador, etc.)
        </p>
      </header>

      <div className="autores-search">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre (ej: Gaudí, Palladio, Cañas, Benlliure...)"
          autoFocus
        />
      </div>

      {error && <div className="autores-error">{error}</div>}

      <div className="autores-layout">
        <aside className="autores-list">
          <h3>
            {q ? `Resultados (${personas.length})` : `Top autores (${personas.length})`}
          </h3>
          {loading && <div className="autores-loading">Cargando…</div>}
          {!loading && personas.length === 0 && (
            <div className="autores-empty">Sin resultados</div>
          )}
          <ul>
            {personas.map((p) => (
              <li
                key={p.qid || p.nombre}
                className={selectedQid === p.qid ? 'active' : ''}
                onClick={() => verBienes(p.qid, p.nombre)}
              >
                <div className="autor-nombre">{p.nombre}</div>
                <div className="autor-meta">
                  <span className="autor-count">{p.n_bienes}</span> bienes · {p.roles}
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <section className="autores-detail">
          {!selectedQid && (
            <div className="autores-placeholder">
              Selecciona un autor para ver sus obras en el catálogo.
            </div>
          )}
          {loadingBienes && <div className="autores-loading">Cargando obras…</div>}
          {!loadingBienes && selectedQid && bienes.length > 0 && (
            <>
              <h3>{bienes.length} obras</h3>
              <ul className="autor-bienes">
                {bienes.map((b) => (
                  <li key={b.id}>
                    {b.imagen_url && (
                      <img src={b.imagen_url} alt={b.denominacion} loading="lazy" />
                    )}
                    <div className="autor-bien-info">
                      <Link to={`/monumento/${b.id}`} className="autor-bien-nombre">
                        {b.denominacion}
                      </Link>
                      <div className="autor-bien-meta">
                        {b.municipio && <span>{b.municipio}</span>}
                        {b.comarca && <span> · {b.comarca}</span>}
                        {b.provincia && <span> · {b.provincia}</span>}
                        {b.pais && <span> · {b.pais}</span>}
                      </div>
                      {(b.tipo_monumento || b.periodo) && (
                        <div className="autor-bien-meta">
                          {b.tipo_monumento}{b.tipo_monumento && b.periodo ? ' · ' : ''}{b.periodo}
                        </div>
                      )}
                      <div className="autor-bien-rol">{b.rol}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
