import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { getMonumentos } from '../services/api';
import Filters from '../components/Filters';
import MonumentoCard from '../components/MonumentoCard';
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
  const [limit, setLimit] = useState(24);
  const [sort, setSort] = useState('nombre_asc');

  // Cargar filtros desde URL al montar
  useEffect(() => {
    const urlFilters = {};
    let urlPage = 1;
    let urlLimit = 24;
    let urlSort = 'nombre_asc';
    for (const [key, value] of searchParams.entries()) {
      if (key === 'page') {
        urlPage = parseInt(value) || 1;
      } else if (key === 'limit') {
        urlLimit = parseInt(value) || 24;
      } else if (key === 'sort') {
        urlSort = value;
      } else {
        urlFilters[key] = value;
      }
    }
    setLimit(urlLimit);
    setSort(urlSort);
    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters);
    }
    // Buscar con la página de la URL
    doSearchInitial(urlFilters, urlPage, urlLimit, urlSort);
  }, []);

  const doSearchInitial = async (initialFilters, pageNum, lim = 24, srt = 'nombre_asc') => {
    setLoading(true);
    try {
      const data = await getMonumentos({
        ...initialFilters,
        page: pageNum,
        limit: lim,
        sort: srt,
      });
      setMonumentos(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
      setPage(pageNum);
    } catch (err) {
      console.error('Error searching:', err);
    } finally {
      setLoading(false);
    }
  };

  const doSearch = useCallback(async (pageNum = 1) => {
    setLoading(true);

    // Actualizar URL
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== false) {
        params.set(key, value);
      }
    });
    if (pageNum > 1) params.set('page', pageNum);
    if (limit !== 24) params.set('limit', limit);
    if (sort !== 'nombre_asc') params.set('sort', sort);
    setSearchParams(params);

    try {
      const data = await getMonumentos({
        ...filters,
        page: pageNum,
        limit,
        sort,
      });
      setMonumentos(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
      setPage(pageNum);
    } catch (err) {
      console.error('Error searching:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, limit, sort, setSearchParams]);


  // Re-buscar cuando cambian limit o sort (no en mount inicial)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    doSearch(1);
  }, [limit, sort]);

  const handleSearch = () => {
    doSearch(1);
  };

  const handlePageChange = (newPage) => {
    doSearch(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="search-page">
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
              <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}>
                <option value="nombre_asc">{t('search.nameAZ')}</option>
                <option value="nombre_desc">{t('search.nameZA')}</option>
                <option value="municipio_asc">{t('search.municipalityAZ')}</option>
                <option value="municipio_desc">{t('search.municipalityZA')}</option>
              </select>
            </label>
            <label>
              {t('search.show')}
              <select value={limit} onChange={e => { setLimit(parseInt(e.target.value)); setPage(1); }}>
                <option value="12">12</option>
                <option value="24">24</option>
                <option value="48">48</option>
                <option value="96">96</option>
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="loading-grid">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        ) : monumentos.length > 0 ? (
          <>
            <div className="monumentos-grid">
              {monumentos.map(m => (
                <MonumentoCard key={m.id} monumento={m} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-secondary"
                  disabled={page === 1}
                  onClick={() => handlePageChange(page - 1)}
                >
                  {t('search.previous')}
                </button>

                <div className="page-numbers">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        className={`page-btn ${page === pageNum ? 'active' : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <span className="page-info">
                  {page} / {totalPages.toLocaleString()}
                </span>

                <button
                  className="btn btn-secondary"
                  disabled={page === totalPages}
                  onClick={() => handlePageChange(page + 1)}
                >
                  {t('search.next')}
                </button>
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
