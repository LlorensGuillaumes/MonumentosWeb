import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import Filters from '../components/Filters';
import Map from '../components/Map';
import './MapPage.css';

export default function MapPage() {
  const { filters } = useApp();
  const { t } = useTranslation();
  const [filtersVisible, setFiltersVisible] = useState(false);

  return (
    <div className="map-page">
      <div className="map-toolbar">
        <h1>{t('map.title')}</h1>
        <button
          className="btn btn-secondary"
          onClick={() => setFiltersVisible(!filtersVisible)}
        >
          {filtersVisible ? t('filters.hideFilters') : t('filters.showFilters')}
        </button>
      </div>

      {filtersVisible && (
        <div className="map-filters">
          <Filters />
        </div>
      )}

      <div className="map-wrapper">
        <Map filters={filters} height="calc(100vh - 180px)" />
      </div>
    </div>
  );
}
