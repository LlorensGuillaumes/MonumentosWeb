import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';
import { getMonumentos, trackEvent } from '../services/api';
import Filters from '../components/Filters';
import MonumentoCard from '../components/MonumentoCard';
import { SearchResultsSkeleton } from '../components/Skeleton';
import './Search.css';

export default function Search() {
  const { filters, setFilters } = useApp();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [monumentos, setMonumentos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(() => {
    const l = parseInt(searchParams.get('limit'), 10);
    return [25, 50, 100].includes(l) ? l : 50;
  });
  const [sort, setSort] = useState('relevancia');

  const reqSeqRef = useRef(0); // invalida respuestas obsoletas (carrera carga inicial vs búsqueda)
  const topRef = useRef(null);

  // Carga UNA página de resultados (reemplaza, no acumula)
  const loadPage = useCallback(async (theFilters, pageNum, srt, size) => {
    const seq = ++reqSeqRef.current;
    setLoading(true);
    try {
      const data = await getMonumentos({ ...theFilters, page: pageNum, limit: size, sort: srt });
      if (seq !== reqSeqRef.current) return null; // respuesta obsoleta
      setMonumentos(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
      setPage(pageNum);
      return data;
    } catch (err) {
      console.error('Error searching:', err);
      return null;
    } finally {
      if (seq === reqSeqRef.current) setLoading(false);
    }
  }, []);

  // Carga inicial: leer filtros + página de la URL. Al volver del detalle, la página
  // se conserva en la URL (?page=N), así que se restaura sola.
  useEffect(() => {
    const urlFilters = {};
    let urlSort = 'relevancia';
    let urlPage = 1;
    for (const [key, value] of searchParams.entries()) {
      if (key === 'sort') urlSort = value;
      else if (key === 'page') urlPage = Math.max(1, parseInt(value, 10) || 1);
      else if (key !== 'limit') urlFilters[key] = value;
    }
    setSort(urlSort);
    if (Object.keys(urlFilters).length > 0) setFilters(urlFilters);
    loadPage(urlFilters, urlPage, urlSort, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Buscar (botón / Intro): vuelve a la página 1 con los filtros actuales
  const doSearch = useCallback(async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== false) params.set(key, value);
    });
    if (sort !== 'relevancia') params.set('sort', sort);
    setSearchParams(params); // sin page → página 1
    const data = await loadPage(filters, 1, sort, pageSize);
    // Sólo registrar búsquedas con criterios reales
    const meaningfulFilters = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v && v !== false)
    );
    if (Object.keys(meaningfulFilters).length > 0) {
      trackEvent('search', { metadata: { filters: meaningfulFilters, total: data?.total } });
    }
  }, [filters, sort, setSearchParams, loadPage, pageSize]);

  // Cambiar de página
  const goToPage = useCallback((n) => {
    const target = Math.min(Math.max(1, n), totalPages || 1);
    const params = new URLSearchParams(searchParams);
    if (target > 1) params.set('page', String(target)); else params.delete('page');
    setSearchParams(params, { replace: true });
    loadPage(filters, target, sort, pageSize);
    if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [totalPages, searchParams, setSearchParams, filters, sort, loadPage, pageSize]);

  // Cambiar nº de resultados por página (25 / 50 / 100) → vuelve a la página 1
  const changePageSize = useCallback((n) => {
    setPageSize(n);
    const params = new URLSearchParams(searchParams);
    if (n !== 50) params.set('limit', String(n)); else params.delete('limit');
    params.delete('page');
    setSearchParams(params, { replace: true });
    loadPage(filters, 1, sort, n);
  }, [searchParams, setSearchParams, filters, sort, loadPage]);

  // Re-buscar cuando cambia el orden (comparando valor previo, robusto a StrictMode)
  const prevSortRef = useRef(sort);
  useEffect(() => {
    if (prevSortRef.current === sort) return;
    prevSortRef.current = sort;
    doSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  const handleSearch = () => doSearch();

  return (
    <div className="search-page">
      <Helmet>
        <title>{t('search.title')} - Patrimonio Europeo</title>
      </Helmet>
      <h1>{t('search.title')}</h1>

      <Filters onSearch={handleSearch} />

      <div className="search-results" ref={topRef}>
        <div className="results-header">
          <span className="results-count">
            {loading ? t('search.searching') : t('search.results', { count: total.toLocaleString() })}
          </span>
          <div className="results-controls">
            <label>
              {t('search.sortBy')}
              <select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="relevancia">{t('search.relevance')}</option>
                <option value="nombre_asc">{t('search.nameAZ')}</option>
                <option value="nombre_desc">{t('search.nameZA')}</option>
                <option value="municipio_asc">{t('search.municipalityAZ')}</option>
                <option value="municipio_desc">{t('search.municipalityZA')}</option>
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <SearchResultsSkeleton count={8} />
        ) : monumentos.length > 0 ? (
          <>
            <div className="monumentos-grid">
              {monumentos.map(m => (
                <MonumentoCard key={m.id} monumento={m} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="search-paging">
                <button
                  type="button"
                  className="search-paging-btn"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  ‹ {t('autores.prevPage')}
                </button>
                <span className="search-paging-info">
                  {t('autores.pageOf', { page, total: totalPages })}
                </span>
                <button
                  type="button"
                  className="search-paging-btn"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  {t('autores.nextPage')} ›
                </button>
                <select
                  className="search-page-size"
                  value={pageSize}
                  onChange={(e) => changePageSize(parseInt(e.target.value, 10))}
                  aria-label={t('search.perPage', 'Por página')}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}
          </>
        ) : (
          <div className="no-results">
            <span className="no-results-icon">🔍</span>
            <h3>{t('search.noResults')}</h3>
            <p>{t('search.noResultsHint')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
