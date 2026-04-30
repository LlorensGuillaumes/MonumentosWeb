import { useState, useRef, useEffect } from 'react';
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
    setFiltersVisible(false);
    // Determinar nivel de zoom según filtro más específico
    let zoom = 6;
    if (filters.municipio) zoom = 13;
    else if (filters.provincia) zoom = 9;
    else if (filters.region) zoom = 7;
    else if (filters.pais) zoom = 6;
    else return; // Sin filtros geográficos, no hacer flyTo

    try {
      // Pedir hasta 200 monumentos del filtro para calcular centroide
      const data = await getMonumentos({ ...filters, solo_coords: true, limit: 200 });
      const items = (data.items || []).filter(m => m.latitud != null && m.longitud != null);
      if (items.length === 0) return;

      // Calcular centroide
      let sumLat = 0, sumLng = 0;
      let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
      for (const m of items) {
        sumLat += m.latitud;
        sumLng += m.longitud;
        if (m.latitud < minLat) minLat = m.latitud;
        if (m.latitud > maxLat) maxLat = m.latitud;
        if (m.longitud < minLng) minLng = m.longitud;
        if (m.longitud > maxLng) maxLng = m.longitud;
      }
      const lat = sumLat / items.length;
      const lng = sumLng / items.length;

      // Ajustar zoom según extensión real del bbox (si abarca mucho, alejar)
      const range = Math.max(maxLat - minLat, maxLng - minLng);
      let adjustedZoom = zoom;
      if (range > 5) adjustedZoom = 6;
      else if (range > 2) adjustedZoom = 7;
      else if (range > 1) adjustedZoom = 8;
      else if (range > 0.3) adjustedZoom = 10;
      else if (range > 0.1) adjustedZoom = 12;

      setFlyTo({ lat, lng, zoom: adjustedZoom, _ts: Date.now() });
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

        <button
          className="map-filters-btn"
          onClick={() => setFiltersVisible(!filtersVisible)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>{t('filters.search')}</span>
        </button>
      </div>

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

      {filtersVisible && (
        <div className="map-filters">
          <Filters onSearch={handleSearch} onMonumentSelect={handleMonumentSelect} />
        </div>
      )}

      <div className="map-wrapper">
        <Map filters={filters} height="calc(100vh - 220px)" flyTo={flyTo} highlight={highlight} />
      </div>
    </div>
  );
}
