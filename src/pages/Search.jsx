import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';
import { getMonumentos } from '../services/api';
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [limit] = useState(24);
  const [sort, setSort] = useState('relevancia');

  const sentinelRef = useRef(null);

  // Cargar filtros desde URL al montar
  useEffect(() => {
    const urlFilters = {};
    let urlSort = 'relevancia';
    for (const [key, value] of searchParams.entries()) {
      if (key === 'sort') {
        urlSort = value;
      } else if (key !== 'page' && key !== 'limit') {
        urlFilters[key] = value;
      }
    }
    setSort(urlSort);
    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters);
    }
    doSearchInitial(urlFilters, 1, limit, urlSort);
  }, []);

  const doSearchInitial = async (initialFilters, pageNum, lim, srt) => {
    setLoading(true);
    try {
      const data = await getMonumentos({ ...initialFilters, page: pageNum, limit: lim, sort: srt });
      setMonumentos(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
      setPage(1);
    } catch (err) {
      console.error('Error searching:', err);
    } finally {
      setLoading(false);
    }
  };

  const doSearch = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== false) params.set(key, value);
    });
    if (sort !== 'relevancia') params.set('sort', sort);
    setSearchParams(params);

    try {
      const data = await getMonumentos({ ...filters, page: 1, limit, sort });
      setMonumentos(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
      setPage(1);
    } catch (err) {
      console.error('Error searching:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, limit, sort, setSearchParams]);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const data = await getMonumentos({ ...filters, page: nextPage, limit, sort });
      setMonumentos(prev => [...prev, ...data.items]);
      setPage(nextPage);
    } catch (err) {
      console.error('Error loading more:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [filters, page, totalPages, limit, sort, loadingMore]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !loadingMore && page < totalPages) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore, loading, loadingMore, page, totalPages]);

  // Re-search when sort changes
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    doSearch();
  }, [sort]);

  const handleSearch = () => doSearch();

  return (
    <div className="search-page">
      <Helmet>
        <title>{t('search.title')} - Patrimonio Europeo</title>
      </Helmet>
      <h1>{t('search.title')}</h1>

      <Filters onSearch={handleSearch} />

      <div className="search-results">
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

            {/* Infinite scroll sentinel */}
            {page < totalPages && (
              <div ref={sentinelRef} className="scroll-sentinel">
                {loadingMore && <SearchResultsSkeleton count={4} />}
              </div>
            )}

            {/* Progress indicator */}
            {total > 0 && (
              <div className="scroll-progress">
                {monumentos.length} / {total.toLocaleString()}
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
