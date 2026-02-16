import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import SearchableSelect from './SearchableSelect';
import SearchAutocomplete from './SearchAutocomplete';
import './Filters.css';

export default function Filters({ onSearch }) {
  const { filters, filtros, setFilter, resetFilters, reloadFiltros } = useApp();
  const { t } = useTranslation();

  const handleChange = (key, value) => {
    setFilter(key, value);
  };

  // Cuando cambia país, resetear todo y recargar filtros
  const handlePaisChange = async (value) => {
    setFilter('pais', value);
    setFilter('region', '');
    setFilter('provincia', '');
    setFilter('municipio', '');
    setFilter('categoria', '');
    setFilter('tipo', '');
    setFilter('estilo', '');
    await reloadFiltros(value, '', '');
  };

  // Cuando cambia región, recargar filtros dinámicos
  const handleRegionChange = async (value) => {
    setFilter('region', value);
    setFilter('provincia', '');
    setFilter('municipio', '');
    setFilter('categoria', '');
    setFilter('tipo', '');
    setFilter('estilo', '');
    await reloadFiltros(filters.pais, value, '');
  };

  // Cuando cambia provincia, recargar filtros dinámicos
  const handleProvinciaChange = async (value) => {
    setFilter('provincia', value);
    setFilter('municipio', '');
    setFilter('categoria', '');
    setFilter('tipo', '');
    setFilter('estilo', '');
    await reloadFiltros(filters.pais, filters.region, value);
  };

  // Cuando cambia municipio
  const handleMunicipioChange = (value) => {
    setFilter('municipio', value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.();
  };

  const handleReset = () => {
    resetFilters();
    onSearch?.();
  };

  if (!filtros) return null;

  // Labels dinámicos según país usando i18n
  const labels = (() => {
    switch (filters.pais) {
      case 'Portugal': return {
        region: t('filters.portugal.region'),
        provincia: t('filters.portugal.province'),
        municipio: t('filters.portugal.municipality'),
      };
      case 'Francia': return {
        region: t('filters.france.region'),
        provincia: t('filters.france.province'),
        municipio: t('filters.france.municipality'),
      };
      case 'Italia': return {
        region: t('filters.italy.region'),
        provincia: t('filters.italy.province'),
        municipio: t('filters.italy.municipality'),
      };
      default: return {
        region: t('filters.region'),
        provincia: t('filters.province'),
        municipio: t('filters.municipality'),
      };
    }
  })();

  // Placeholders dinámicos según país usando i18n
  const placeholders = (() => {
    return {
      region: t('filters.allRegions'),
      provincia: t('filters.allProvinces'),
      municipio: t('filters.allMunicipalities'),
    };
  })();

  // Filtrar regiones por país seleccionado
  const regionesFiltradas = filters.pais
    ? filtros.regiones.filter(r => r.pais === filters.pais)
    : filtros.regiones;

  // Filtrar provincias por país y/o región seleccionada
  const provinciasFiltradas = (filtros.provincias || []).filter(p =>
    (!filters.pais || p.pais === filters.pais) &&
    (!filters.region || p.region === filters.region)
  );

  // Municipios: solo disponibles si hay algún filtro geográfico activo
  const hasGeoFilter = filters.pais || filters.region || filters.provincia;
  const municipiosFiltrados = hasGeoFilter
    ? (filtros.municipios || []).filter(m =>
        (!filters.pais || m.pais === filters.pais) &&
        (!filters.region || m.region === filters.region) &&
        (!filters.provincia || m.provincia === filters.provincia)
      )
    : [];

  return (
    <form className="filters" onSubmit={handleSubmit}>
      <div className="filters-row">
        <div className="filter-group filter-group-search">
          <label>{t('filters.search')}</label>
          <SearchAutocomplete
            value={filters.q}
            onChange={(v) => handleChange('q', v)}
            onSearch={onSearch}
            placeholder={t('filters.searchPlaceholder')}
          />
        </div>

        {filtros.paises && filtros.paises.length > 1 && (
          <div className="filter-group">
            <label>{t('filters.country')}</label>
            <SearchableSelect
              value={filters.pais}
              onChange={handlePaisChange}
              options={filtros.paises}
              placeholder={t('filters.allCountries')}
            />
          </div>
        )}

        <div className="filter-group">
          <label>{labels.region}</label>
          <SearchableSelect
            value={filters.region}
            onChange={handleRegionChange}
            options={regionesFiltradas}
            placeholder={placeholders.region}
          />
        </div>

        <div className="filter-group">
          <label>{labels.provincia}</label>
          <SearchableSelect
            value={filters.provincia}
            onChange={handleProvinciaChange}
            options={provinciasFiltradas}
            placeholder={placeholders.provincia}
          />
        </div>

        <div className="filter-group">
          <label>{labels.municipio}</label>
          <SearchableSelect
            value={filters.municipio}
            onChange={handleMunicipioChange}
            options={municipiosFiltrados}
            placeholder={hasGeoFilter ? placeholders.municipio : t('filters.selectFilterFirst')}
            disabled={!hasGeoFilter}
          />
        </div>
      </div>

      <div className="filters-row">
        <div className="filter-group">
          <label>{t('filters.category')}</label>
          <SearchableSelect
            value={filters.categoria}
            onChange={(v) => handleChange('categoria', v)}
            options={filtros.categorias}
            placeholder={t('filters.allCategories')}
          />
        </div>

        <div className="filter-group">
          <label>{t('filters.type')}</label>
          <SearchableSelect
            value={filters.tipo}
            onChange={(v) => handleChange('tipo', v)}
            options={filtros.tipos}
            placeholder={t('filters.allTypes')}
          />
        </div>

        <div className="filter-group">
          <label>{t('filters.style')}</label>
          <SearchableSelect
            value={filters.estilo}
            onChange={(v) => handleChange('estilo', v)}
            options={filtros.estilos}
            placeholder={t('filters.allStyles')}
          />
        </div>

        <div className="filter-group filter-checkbox">
          <label>
            <input
              type="checkbox"
              checked={filters.solo_wikidata}
              onChange={(e) => handleChange('solo_wikidata', e.target.checked)}
            />
            {t('filters.onlyWikipedia')}
          </label>
        </div>

        <div className="filter-group filter-checkbox">
          <label>
            <input
              type="checkbox"
              checked={filters.solo_imagen}
              onChange={(e) => handleChange('solo_imagen', e.target.checked)}
            />
            {t('filters.onlyImage')}
          </label>
        </div>

        <div className="filter-actions">
          <button type="submit" className="btn btn-primary">{t('filters.search')}</button>
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            {t('filters.reset')}
          </button>
        </div>
      </div>
    </form>
  );
}
