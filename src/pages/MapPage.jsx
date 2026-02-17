import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';
import Filters from '../components/Filters';
import Map from '../components/Map';
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

  return (
    <div className="map-page">
      <Helmet>
        <title>{t('map.title')} - Patrimonio Europeo</title>
      </Helmet>
      <div className="map-toolbar">
        <h1>{t('map.title')}</h1>
        <button
          className="btn btn-secondary"
          onClick={() => setFiltersVisible(!filtersVisible)}
        >
          {filtersVisible ? t('filters.hideFilters') : t('filters.showFilters')}
        </button>
      </div>

      {/* Quick filter chips */}
      <div className="map-quick-filters">
        {QUICK_CATEGORIES.map(cat => (
          <button
            key={cat.value}
            className={`map-chip ${filters.clasificacion === cat.value ? 'active' : ''}`}
            onClick={() => setFilter('clasificacion', cat.value)}
          >
            {t(cat.label)}
          </button>
        ))}
        {filters.estilo && (
          <span className="map-active-filter">
            {t('filters.style')}: {filters.estilo}
            <button onClick={() => setFilter('estilo', '')}>&times;</button>
          </span>
        )}
      </div>

      {filtersVisible && (
        <div className="map-filters">
          <Filters />
        </div>
      )}

      <div className="map-wrapper">
        <Map filters={filters} height="calc(100vh - 220px)" />
      </div>
    </div>
  );
}
