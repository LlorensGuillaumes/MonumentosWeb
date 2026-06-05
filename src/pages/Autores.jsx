import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import MapView from '../components/Map';
import './Autores.css';

export default function Autores() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedQid, setSelectedQid] = useState(searchParams.get('qid'));
  const [selectedNombre, setSelectedNombre] = useState('');
  const [bienes, setBienes] = useState([]);
  const [loadingBienes, setLoadingBienes] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const mapMarkers = useMemo(() =>
    bienes
      .filter(b => b.latitud != null && b.longitud != null)
      .map((b, i) => ({
        id: b.id,
        n: i + 1,
        lat: b.latitud,
        lng: b.longitud,
        denominacion: b.denominacion,
        municipio: b.municipio,
        tipo: b.tipo_monumento,
      })),
    [bienes]);

  // Mapa id → número de marker, per mostrar al llistat
  const idToN = useMemo(() => {
    const m = new Map();
    mapMarkers.forEach(x => m.set(x.id, x.n));
    return m;
  }, [mapMarkers]);

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

  const verBienes = useCallback(async (qid, nombre, updateUrl = true) => {
    if (!qid) return;
    setSelectedQid(qid);
    if (nombre) setSelectedNombre(nombre);
    if (updateUrl) {
      const next = new URLSearchParams(searchParams);
      next.set('qid', qid);
      setSearchParams(next, { replace: true });
    }
    setShowMap(false);
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
  }, [searchParams, setSearchParams]);

  // Si arriba amb ?qid= a la URL (back o link directe), carregar automàticament.
  // Primera vegada SEMPRE; després, només si canvia el qid de la URL.
  const initializedRef = useRef(false);
  useEffect(() => {
    const qidParam = searchParams.get('qid');
    if (!initializedRef.current) {
      initializedRef.current = true;
      if (qidParam) verBienes(qidParam, null, false);
      return;
    }
    if (qidParam && qidParam !== selectedQid) {
      verBienes(qidParam, null, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Quan tinguem el llistat de personas i un qid seleccionat sense nom, deduïm el nom
  // i filtrem la cerca al nom de l'autor (sincronitza el camp q amb la fitxa oberta).
  useEffect(() => {
    if (selectedQid && !selectedNombre && personas.length > 0) {
      const found = personas.find(p => p.qid === selectedQid);
      if (found) {
        setSelectedNombre(found.nombre);
        if (!q) setQ(found.nombre);
      }
    }
  }, [personas, selectedQid, selectedNombre, q]);

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
              <div className="autores-detail-head">
                <h3>{bienes.length} obras{selectedNombre ? ` de ${selectedNombre}` : ''}</h3>
                {mapMarkers.length > 0 && (
                  <button
                    type="button"
                    className="autores-map-toggle"
                    onClick={() => setShowMap(s => !s)}
                  >
                    {showMap
                      ? 'Ocultar mapa'
                      : `Ver en el mapa (${mapMarkers.length})`}
                  </button>
                )}
              </div>
              {showMap && (
                <div className="autores-map-wrap">
                  <MapView
                    extraMarkers={mapMarkers}
                    fitToExtra={true}
                    height="420px"
                    showCCAASummary={false}
                    onlyExtraMarkers={true}
                  />
                </div>
              )}
              <ul className="autor-bienes">
                {bienes.map((b) => (
                  <li key={b.id}>
                    {idToN.has(b.id) && (
                      <span className="autor-bien-num">{idToN.get(b.id)}</span>
                    )}
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
