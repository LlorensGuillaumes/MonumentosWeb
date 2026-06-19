import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Link, useSearchParams, useNavigationType } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import MapView from '../components/Map';
import './Autores.css';

export default function Autores() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const modo = searchParams.get('modo') === 'dedicados' ? 'dedicados' : 'autores';
  // Estado guardado al abrir una ficha, para restaurar al volver (qid + página + item).
  // Solo restauramos en navegación POP (volver con back o el botón ← Volver) y en el mismo
  // modo; en una navegación nueva (PUSH) mostramos la lista limpia. No limpiamos el
  // sessionStorage aquí (se sobrescribe en cada ficha) para ser robustos a React StrictMode,
  // que en desarrollo monta el componente dos veces.
  const navType = useNavigationType();
  const returnRef = useRef(undefined);
  if (returnRef.current === undefined) {
    try { returnRef.current = JSON.parse(sessionStorage.getItem('autores_return') || 'null'); }
    catch { returnRef.current = null; }
  }
  const ret = (navType === 'POP' && returnRef.current && returnRef.current.modo === modo)
    ? returnRef.current : null;
  const [q, setQ] = useState('');
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedQid, setSelectedQid] = useState(searchParams.get('qid') || (ret && ret.qid) || null);
  const [selectedNombre, setSelectedNombre] = useState('');
  const [bienes, setBienes] = useState([]);
  const [loadingBienes, setLoadingBienes] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(() => {
    if (ret && ret.page) return Math.max(1, ret.page);
    return Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
  });
  const [ordenPersonas, setOrdenPersonas] = useState('items'); // 'items' | 'alfabetico'
  const [ordenBienes, setOrdenBienes] = useState('relevancia'); // 'relevancia' | 'alfabetico'
  // id del monumento abierto desde aquí, para resaltarlo/scrollear al volver
  const [visitedId, setVisitedId] = useState(ret ? ret.bienId : null);
  const detailRef = useRef(null);
  const fetchedQidRef = useRef(null); // último qid cuyas obras se han pedido (evita recargas/duplicados)

  const labels = modo === 'dedicados' ? {
    title: t('autores.dedicadosTitle'),
    subtitle: t('autores.dedicadosSubtitle'),
    placeholder: t('autores.dedicadosPlaceholder'),
    topLabel: t('autores.dedicadosTopLabel'),
    detailHeading: (n, name) => name ? t('autores.dedicadosOf', { count: n, name }) : t('autores.dedicadosOnly', { count: n }),
    placeholderText: t('autores.dedicadosPlaceholderText'),
  } : {
    title: t('autores.autoresTitle'),
    subtitle: t('autores.autoresSubtitle'),
    placeholder: t('autores.autoresPlaceholder'),
    topLabel: t('autores.autoresTopLabel'),
    detailHeading: (n, name) => name ? t('autores.obrasOf', { count: n, name }) : t('autores.obrasOnly', { count: n }),
    placeholderText: t('autores.autoresPlaceholderText'),
  };

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

  // Orden de la lista lateral de personas (en frontend: ya tenemos todas cargadas)
  const personasOrdenadas = useMemo(() => {
    const arr = [...personas];
    if (ordenPersonas === 'alfabetico') {
      arr.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', undefined, { sensitivity: 'base' }));
    } else {
      arr.sort((a, b) => (b.n_bienes || 0) - (a.n_bienes || 0));
    }
    return arr;
  }, [personas, ordenPersonas]);

  const fetchPersonas = useCallback(async (query) => {
    setLoading(true); setError(null);
    try {
      // Sense límit dur — el backend pot retornar fins a 5000 personas
      const params = query ? { q: query, modo } : { modo };
      const res = await api.get('/personas', { params });
      setPersonas(res.data.personas || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [modo]);

  // Quan canvia el modo (Autores ↔ Advocaciones), netejar tot l'estat seleccionat.
  // IMPORTANT: no netejar en el muntatge inicial — així en tornar del detall d'un item
  // (amb ?qid= a la URL) es restaura la selecció en lloc d'esborrar-la.
  // Comparar el valor ANTERIOR de modo (robusto a StrictMode, que ejecuta el efecto 2 veces).
  const prevModoRef = useRef(modo);
  useEffect(() => {
    if (prevModoRef.current === modo) return; // mismo modo (montaje o doble efecto): no limpiar
    prevModoRef.current = modo;
    setQ('');
    setSelectedQid(null);
    setSelectedNombre('');
    setBienes([]);
    setShowMap(false);
    setPage(1);
    // Treu qid i page de la URL
    const next = new URLSearchParams(searchParams);
    if (next.has('qid') || next.has('page')) {
      next.delete('qid');
      next.delete('page');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  // Recarrega quan canviï el mode + càrrega inicial
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
    fetchedQidRef.current = qid;
    setSelectedQid(qid);
    if (nombre) setSelectedNombre(nombre);
    if (updateUrl) {
      const next = new URLSearchParams(searchParams);
      next.set('qid', qid);
      next.delete('page'); // nueva selección → empieza en la página 1
      setSearchParams(next, { replace: true });
      setPage(1);
    }
    setShowMap(false);
    setLoadingBienes(true);
    setBienes([]);
    try {
      const res = await api.get(`/personas/${qid}/bienes`, { params: { orden: ordenBienes } });
      setBienes(res.data.bienes || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoadingBienes(false);
    }
  }, [searchParams, setSearchParams, ordenBienes]);

  // Re-cargar las obras cuando cambia el orden (comparando valor previo, robusto a StrictMode)
  const prevOrdenBienesRef = useRef(ordenBienes);
  useEffect(() => {
    if (prevOrdenBienesRef.current === ordenBienes) return;
    prevOrdenBienesRef.current = ordenBienes;
    if (selectedQid) verBienes(selectedQid, selectedNombre, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenBienes]);

  // Cargar las obras de la persona indicada en la URL (?qid=). Cubre el montaje inicial,
  // volver del detalle (tanto navigate(-1) como el back del navegador) y el cambio de qid.
  // verBienes marca fetchedQidRef, así no recargamos al cambiar de página ni duplicamos.
  useEffect(() => {
    const qidParam = searchParams.get('qid');
    if (!qidParam) { fetchedQidRef.current = null; return; }
    if (qidParam !== fetchedQidRef.current && !loadingBienes) {
      verBienes(qidParam, null, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loadingBienes]);

  // Al montar tras volver del detalle: sincronizar la URL con el estado guardado (qid + página).
  // El efecto de arriba se encarga de cargar las obras; page/visitedId ya vienen del estado. Limpiar.
  useEffect(() => {
    if (ret && ret.qid) {
      const next = new URLSearchParams(searchParams);
      if (next.get('qid') !== ret.qid) next.set('qid', ret.qid);
      if (ret.page > 1) next.set('page', String(ret.page)); else next.delete('page');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quan tinguem el llistat de personas i un qid seleccionat sense nom, deduïm el nom
  // i filtrem la cerca al nom de l'autor (sincronitza el camp q amb la fitxa oberta).
  useEffect(() => {
    if (selectedQid && !selectedNombre && personas.length > 0) {
      const found = personas.find(p => p.qid === selectedQid);
      if (found) {
        setSelectedNombre(found.nombre);
      }
    }
  }, [personas, selectedQid, selectedNombre]);

  // Paginación real de las obras (muestra solo los PAGE_SIZE de la página actual)
  const totalPages = Math.max(1, Math.ceil(bienes.length / PAGE_SIZE));
  const pageItems = bienes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goToPage = useCallback((n) => {
    const target = Math.min(Math.max(1, n), totalPages);
    setPage(target);
    const next = new URLSearchParams(searchParams);
    if (target > 1) next.set('page', String(target)); else next.delete('page');
    setSearchParams(next, { replace: true });
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [totalPages, searchParams, setSearchParams]);

  // Si la página guardada excede el total al cargar las obras, ajustar
  useEffect(() => {
    if (!loadingBienes && bienes.length > 0 && page > totalPages) setPage(totalPages);
  }, [loadingBienes, bienes.length, totalPages, page]);

  // Al volver del detalle: scroll + resaltado del item visitado (si está en la página actual)
  useEffect(() => {
    if (!visitedId || loadingBienes || bienes.length === 0) return;
    const inPage = pageItems.some(b => b.id === visitedId);
    if (!inPage) { setVisitedId(null); return; }
    const el = document.getElementById(`autor-bien-${visitedId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const tmr = setTimeout(() => setVisitedId(null), 2500);
    return () => clearTimeout(tmr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bienes, loadingBienes, visitedId]);

  return (
    <div className="autores-page">
      <header className="autores-header">
        <h1>{labels.title}</h1>
        <p className="autores-subtitle">{labels.subtitle}</p>
      </header>

      <div className="autores-search">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={labels.placeholder}
          autoFocus
        />
      </div>

      {error && <div className="autores-error">{error}</div>}

      <div className="autores-layout">
        <aside className="autores-list">
          <div className="autores-list-head">
            <h3>
              {q ? `${t('autores.results')} (${personas.length})` : `${labels.topLabel} (${personas.length})`}
            </h3>
            <select
              className="autores-sort"
              value={ordenPersonas}
              onChange={(e) => setOrdenPersonas(e.target.value)}
              aria-label={t('autores.sortBy')}
            >
              <option value="items">{t('autores.sortItems')}</option>
              <option value="alfabetico">{t('autores.sortName')}</option>
            </select>
          </div>
          {loading && <div className="autores-loading">{t('autores.loading')}</div>}
          {!loading && personas.length === 0 && (
            <div className="autores-empty">{t('autores.noResults')}</div>
          )}
          <ul>
            {personasOrdenadas.map((p) => (
              <li
                key={p.qid || p.nombre}
                className={selectedQid === p.qid ? 'active' : ''}
                onClick={() => verBienes(p.qid, p.nombre)}
              >
                <div className="autor-nombre">{p.nombre}</div>
                <div className="autor-meta">
                  <span className="autor-count">{p.n_bienes}</span> {t('autores.bienes')} · {(p.roles || '').split(',').map(r => t(`autores.roles.${r.trim()}`, r.trim())).join(', ')}
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <section className="autores-detail" ref={detailRef}>
          {!selectedQid && (
            <div className="autores-placeholder">
              {labels.placeholderText}
            </div>
          )}
          {loadingBienes && <div className="autores-loading">{t('autores.loadingObras')}</div>}
          {!loadingBienes && selectedQid && bienes.length > 0 && (
            <>
              <div className="autores-detail-head">
                <h3>{labels.detailHeading(bienes.length, selectedNombre)}</h3>
                <div className="autores-detail-actions">
                  {selectedQid && (
                    <Link to={`/autor/${selectedQid}`} className="autores-ficha-btn">
                      👤 {t('autorDetail.viewProfile', 'Ver ficha autor')}
                    </Link>
                  )}
                  <select
                    className="autores-sort"
                    value={ordenBienes}
                    onChange={(e) => setOrdenBienes(e.target.value)}
                    aria-label={t('autores.sortBy')}
                  >
                    <option value="relevancia">{t('autores.sortRelevance')}</option>
                    <option value="alfabetico">{t('autores.sortName')}</option>
                  </select>
                  {mapMarkers.length > 0 && (
                    <button
                      type="button"
                      className="autores-map-toggle"
                      onClick={() => setShowMap(s => !s)}
                    >
                      {showMap
                        ? t('autores.hideMap')
                        : `${t('autores.viewMap')} (${mapMarkers.length})`}
                    </button>
                  )}
                </div>
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
                {pageItems.map((b) => (
                  <li key={b.id} id={`autor-bien-${b.id}`} className={b.id === visitedId ? 'visited' : ''}>
                    {idToN.has(b.id) && (
                      <span className="autor-bien-num">{idToN.get(b.id)}</span>
                    )}
                    {b.imagen_url && (
                      <img src={b.imagen_url} alt={b.denominacion} loading="lazy" />
                    )}
                    <div className="autor-bien-info">
                      <Link
                        to={`/monumento/${b.id}`}
                        className="autor-bien-nombre"
                        onClick={() => sessionStorage.setItem('autores_return', JSON.stringify({ modo, qid: selectedQid, page, bienId: b.id }))}
                      >
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
                      <div className="autor-bien-rol">{t(`autores.roles.${b.rol}`, b.rol)}</div>
                    </div>
                  </li>
                ))}
              </ul>
              {totalPages > 1 && (
                <div className="autor-paging">
                  <button
                    type="button"
                    className="autor-paging-btn"
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                  >
                    ‹ {t('autores.prevPage')}
                  </button>
                  <span className="autor-paging-info">
                    {t('autores.pageOf', { page, total: totalPages })}
                  </span>
                  <button
                    type="button"
                    className="autor-paging-btn"
                    disabled={page >= totalPages}
                    onClick={() => goToPage(page + 1)}
                  >
                    {t('autores.nextPage')} ›
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
