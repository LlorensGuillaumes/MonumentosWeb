import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';
import Filters from '../components/Filters';
import Map from '../components/Map';
import { getMonumentos } from '../services/api';
import './MapPage.css';

const QUICK_CATEGORIES = [
  { value: '', label: 'filters.allCategories' },
  { value: 'religiosa', label: 'map.legend.churches' },
  { value: 'militar', label: 'map.legend.castles' },
  { value: 'civil', label: 'map.legend.palaces' },
  { value: 'arqueologica', label: 'map.legend.archaeology' },
  { value: 'etnologica', label: 'map.legend.ethnologic' },
  { value: 'infraestructura', label: 'map.legend.infrastructure' },
  { value: 'otros', label: 'map.legend.others' },
];

export default function MapPage() {
  const { filters, setFilter } = useApp();
  const { t } = useTranslation();
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [flyTo, setFlyTo] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const catRef = useRef(null);

  const handleMonumentSelect = (m) => {
    const lat = m.latitud ?? m.lat ?? (m.geometry?.coordinates?.[1]);
    const lng = m.longitud ?? m.lng ?? m.lon ?? (m.geometry?.coordinates?.[0]);
    if (lat == null || lng == null) return;
    setFlyTo({ lat, lng, zoom: 14, _ts: Date.now() });
    setHighlight({ lat, lng, id: m.id, name: m.denominacion });
    setFiltersVisible(false);
  };

  // Volar a la ubicación correspondiente al filtro más específico aplicado
  const handleSearch = async () => {
    // Construir query para Nominatim según filtro más específico
    let query = '';
    let defaultZoom = 6;
    if (filters.municipio) {
      query = [filters.municipio, filters.provincia, filters.region, filters.pais].filter(Boolean).join(', ');
      defaultZoom = 13;
    } else if (filters.provincia) {
      query = [filters.provincia, filters.region, filters.pais].filter(Boolean).join(', ');
      defaultZoom = 9;
    } else if (filters.region) {
      query = [filters.region, filters.pais].filter(Boolean).join(', ');
      defaultZoom = 7;
    } else if (filters.pais) {
      query = filters.pais;
      defaultZoom = 6;
    } else {
      return;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
      if (!res.ok) throw new Error('Nominatim ' + res.status);
      const results = await res.json();
      if (results.length === 0) return;

      const r = results[0];
      const lat = parseFloat(r.lat);
      const lng = parseFloat(r.lon);

      // Calcular zoom según el bbox real devuelto por Nominatim
      let zoom = defaultZoom;
      if (r.boundingbox) {
        const [bbS, bbN, bbW, bbE] = r.boundingbox.map(parseFloat);
        const range = Math.max(bbN - bbS, bbE - bbW);
        if (range > 8) zoom = 5;
        else if (range > 4) zoom = 6;
        else if (range > 2) zoom = 7;
        else if (range > 1) zoom = 8;
        else if (range > 0.5) zoom = 9;
        else if (range > 0.2) zoom = 11;
        else if (range > 0.05) zoom = 13;
        else zoom = 14;
      }

      const partes = [filters.municipio, filters.provincia, filters.region, filters.pais].filter(Boolean);
      const nombre = partes[0] + (partes.length > 1 ? ` (${partes.slice(1).join(', ')})` : '');

      setFlyTo({ lat, lng, zoom, _ts: Date.now() });
      setHighlight({ lat, lng, name: nombre });
    } catch (err) {
      console.error('Error en handleSearch del mapa:', err);
    }
  };

  useEffect(() => {
    function handleOutside(e) {
      if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false);
    }
    if (catOpen) {
      document.addEventListener('mousedown', handleOutside);
      return () => document.removeEventListener('mousedown', handleOutside);
    }
  }, [catOpen]);

  // En el mapa los filtros geográficos solo se usan para centrar la vista (Buscar),
  // no para filtrar marcadores. Los filtros de contenido sí se aplican.
  // Memoizado para evitar nueva referencia en cada render (causa bucle de fetch en Map.jsx).
  const mapContentFilters = useMemo(() => {
    const { pais, region, provincia, municipio, ...rest } = filters;
    return rest;
  }, [filters]);

  // Multi-select: clasificacion as comma-separated values
  const selectedCats = (filters.clasificacion || '').split(',').filter(Boolean);
  const triggerLabel = (() => {
    if (selectedCats.length === 0) return t(QUICK_CATEGORIES[0].label);
    if (selectedCats.length === 1) {
      const c = QUICK_CATEGORIES.find(c => c.value === selectedCats[0]);
      return c ? t(c.label) : t(QUICK_CATEGORIES[0].label);
    }
    return `${selectedCats.length} ${t('filters.classifications.others').toLowerCase()}`;
  })();

  const toggleCategory = (value) => {
    if (!value) {
      setFilter('clasificacion', '');
      return;
    }
    const set = new Set(selectedCats);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    setFilter('clasificacion', Array.from(set).join(','));
  };

  return (
    <div className="map-page">
      <Helmet>
        <title>{t('map.title')} - Patrimonio Europeo</title>
      </Helmet>

      {/* Toolbar móvil: hamburguesa + chips categorías */}
      <div className="map-toolbar">
        <h1>{t('map.title')}</h1>

        {/* Mobile category dropdown */}
        <div className="map-cat-dropdown" ref={catRef}>
          <button
            type="button"
            className="map-cat-trigger"
            onClick={() => setCatOpen(o => !o)}
            aria-expanded={catOpen}
          >
            <span>{triggerLabel}</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
              <path d="M0 0l5 6 5-6z" />
            </svg>
          </button>
          {catOpen && (
            <ul className="map-cat-menu" role="listbox">
              {QUICK_CATEGORIES.map(cat => {
                const active = cat.value === ''
                  ? selectedCats.length === 0
                  : selectedCats.includes(cat.value);
                return (
                  <li
                    key={cat.value}
                    role="option"
                    aria-selected={active}
                    className={`map-cat-option ${active ? 'active' : ''}`}
                    onClick={() => toggleCategory(cat.value)}
                  >
                    <span className={`map-cat-check ${active ? 'on' : ''}`}>
                      {active && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    <span>{t(cat.label)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Botón hamburguesa: solo móvil/tablet */}
        <button
          className="map-filters-btn"
          onClick={() => setFiltersVisible(!filtersVisible)}
          aria-label={t('filters.search')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
          <span className="map-filters-btn-label">{t('filters.search')}</span>
        </button>
      </div>

      {/* Layout 2 columnas: sidebar filtros + mapa */}
      <div className="map-layout">
        {/* Sidebar filtros: siempre visible en desktop, toggle en móvil */}
        <aside className={`map-sidebar ${filtersVisible ? 'open' : ''}`}>
          <Filters onSearch={handleSearch} onMonumentSelect={handleMonumentSelect} />
        </aside>

        <div className="map-main">
          {/* Quick filter chips (desktop) */}
          <div className="map-quick-filters">
            {QUICK_CATEGORIES.map(cat => {
              const active = cat.value === ''
                ? selectedCats.length === 0
                : selectedCats.includes(cat.value);
              return (
                <button
                  key={cat.value}
                  className={`map-chip ${active ? 'active' : ''}`}
                  onClick={() => toggleCategory(cat.value)}
                >
                  {t(cat.label)}
                </button>
              );
            })}
            {filters.estilo && (
              <span className="map-active-filter">
                {t('filters.style')}: {filters.estilo}
                <button onClick={() => setFilter('estilo', '')}>&times;</button>
              </span>
            )}
          </div>

          {filters.estilo && (
            <div className="map-active-filter-mobile">
              <span className="map-active-filter">
                {t('filters.style')}: {filters.estilo}
                <button onClick={() => setFilter('estilo', '')}>&times;</button>
              </span>
            </div>
          )}

          <div className="map-wrapper">
            <Map filters={mapContentFilters} height="100%" flyTo={flyTo} highlight={highlight} />
          </div>
        </div>
      </div>
    </div>
  );
}
