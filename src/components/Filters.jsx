import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import SearchableSelect from './SearchableSelect';
import SearchAutocomplete from './SearchAutocomplete';
import flagEs from '../assets/flags/es.jpg';
import flagIt from '../assets/flags/it.jpg';
import flagFr from '../assets/flags/fr.jpg';
import flagPt from '../assets/flags/pt.jpg';
import flagDe from '../assets/flags/de.jpg';
import flagGb from '../assets/flags/en.jpg';      // Reaprofitem la Union Jack del selector d'idioma
import flagAt from '../assets/flags/at.jpg';
import flagCh from '../assets/flags/ch.jpg';
import flagRo from '../assets/flags/ro.jpg';
import flagLb from '../assets/flags/lb.jpg';
import flagTn from '../assets/flags/tn.jpg';
import flagUs from '../assets/flags/us.jpg';
import flagMx from '../assets/flags/mx.jpg';
import './Filters.css';

// Mapeig pais (valor BD) -> imatge bandera. Quan s'amplii la BD amb nous països,
// afegir aquí el nou par + copiar imatge a src/assets/flags/.
// Vegeu Documentacion/22_Frontend_Components.md per al procediment complet.
const COUNTRY_FLAGS = {
  'España': flagEs,
  'Italia': flagIt,
  'Francia': flagFr,
  'Portugal': flagPt,
  'Alemania': flagDe,
  'Reino Unido': flagGb,
  'Austria': flagAt,
  'Suiza': flagCh,
  'Rumanía': flagRo,
  'Líbano': flagLb,
  'Túnez': flagTn,
  'Estados Unidos': flagUs,
  'México': flagMx,
};

export default function Filters({ onSearch, onMonumentSelect }) {
  const { filters, filtros, setFilter, resetFilters, reloadFiltros } = useApp();
  const { t } = useTranslation();
  // En móvil, los filtros avanzados empiezan colapsados; en desktop siempre se ven
  const [showAdvanced, setShowAdvanced] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 768 : true
  );

  // Traduce las opciones de filtro manteniendo el value original.
  // Orden de prioridad: traducción i18n → label de BD → QID.
  const translateOptions = (options, i18nPrefix) =>
    options?.map(o => {
      const key = `${i18nPrefix}.${o.value}`;
      const translated = t(key);
      const hasTranslation = translated && translated !== key && translated !== o.value;
      return { ...o, label: hasTranslation ? translated : (o.label || o.value) };
    }) || [];

  const handleChange = (key, value) => {
    setFilter(key, value);
  };

  // Cualquier cambio de filtro recarga la cascada con todos los filtros activos
  const triggerCascada = async (key, value) => {
    const merged = { ...filters, [key]: value };
    await reloadFiltros(merged);
  };

  const handleOleadaBChange = async (key, value) => {
    setFilter(key, value);
    await triggerCascada(key, value);
  };

  // Cuando cambia país, resetear sub-niveles geográficos y recargar
  const handlePaisChange = async (value) => {
    setFilter('pais', value);
    setFilter('region', '');
    setFilter('provincia', '');
    setFilter('municipio', '');
    await reloadFiltros({ ...filters, pais: value, region: '', provincia: '', municipio: '' });
  };

  const handleRegionChange = async (value) => {
    setFilter('region', value);
    setFilter('provincia', '');
    setFilter('municipio', '');
    await reloadFiltros({ ...filters, region: value, provincia: '', municipio: '' });
  };

  const handleProvinciaChange = async (value) => {
    setFilter('provincia', value);
    setFilter('municipio', '');
    await reloadFiltros({ ...filters, provincia: value, municipio: '' });
  };

  // Cuando cambia municipio
  const handleMunicipioChange = (value) => {
    setFilter('municipio', value);
  };

  // Opciones de clasificación (mapean a grupos de tipo_monumento en el backend)
  const clasificacionOptions = [
    { value: 'religiosa', label: t('filters.classifications.religious') },
    { value: 'militar', label: t('filters.classifications.military') },
    { value: 'civil', label: t('filters.classifications.civil') },
    { value: 'arqueologica', label: t('filters.classifications.archaeological') },
    { value: 'etnologica', label: t('filters.classifications.ethnological') },
    { value: 'infraestructura', label: t('filters.classifications.infrastructure') },
    { value: 'otros', label: t('filters.classifications.others') },
  ];

  // Clasificación y tipo_monumento son mutuamente excluyentes
  const handleClasificacionChange = async (value) => {
    setFilter('clasificacion', value);
    if (value) setFilter('tipo_monumento', '');
    await reloadFiltros({ ...filters, clasificacion: value, tipo_monumento: value ? '' : filters.tipo_monumento });
  };

  const handleTipoMonumentoChange = async (value) => {
    setFilter('tipo_monumento', value);
    if (value) setFilter('clasificacion', '');
    await reloadFiltros({ ...filters, tipo_monumento: value, clasificacion: value ? '' : filters.clasificacion });
  };

  const handleEstiloChange = async (value) => {
    setFilter('estilo', value);
    await triggerCascada('estilo', value);
  };

  const handlePeriodoChange = async (value) => {
    setFilter('periodo', value);
    await triggerCascada('periodo', value);
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

  // Count active advanced filters (everything except the free-text search)
  const activeAdvancedCount = [
    filters.pais, filters.region, filters.provincia, filters.municipio,
    filters.clasificacion, filters.tipo_monumento, filters.periodo,
    filters.evento, filters.evento_padre, filters.estilo,
  ].filter(Boolean).length + (filters.solo_wikidata ? 1 : 0) + (filters.solo_imagen ? 1 : 0) + ((filters.hn_listas || []).length > 0 ? 1 : 0);

  return (
    <form className="filters" onSubmit={handleSubmit}>
      {/* Fila 1: siempre visible — búsqueda + botón toggle en móvil */}
      <div className="filters-row filters-row-always">
        <div className="filter-group filter-group-search">
          <label>{t('filters.search')}</label>
          <SearchAutocomplete
            value={filters.q}
            onChange={(v) => handleChange('q', v)}
            onSearch={onSearch}
            onSelect={onMonumentSelect}
            placeholder={t('filters.searchPlaceholder')}
          />
        </div>

        {/* Toggle visible solo en móvil */}
        <button
          type="button"
          className="filters-toggle-btn"
          onClick={() => setShowAdvanced(v => !v)}
          aria-expanded={showAdvanced}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" />
          </svg>
          <span>{showAdvanced ? t('filters.hideFilters', 'Ocultar filtros') : t('filters.showFilters', 'Más filtros')}</span>
          {activeAdvancedCount > 0 && (
            <span className="filters-toggle-badge">{activeAdvancedCount}</span>
          )}
        </button>
      </div>

      {/* Filtros avanzados: colapsables en móvil */}
      <div className={`filters-advanced ${showAdvanced ? 'open' : ''}`}>
        {/* PANEL 1: UBICACIÓN */}
        <details className="filter-panel">
          <summary className="filter-panel-summary">
            <span className="filter-panel-icon">📍</span>
            <span>{t('filters.panelLocation', 'Ubicación')}</span>
          </summary>
          <div className="filters-row">
            {filtros.paises && filtros.paises.length > 1 && (
              <div className="filter-group">
                <label>{t('filters.country')}</label>
                <SearchableSelect
                  value={filters.pais}
                  onChange={handlePaisChange}
                  options={translateOptions(filtros.paises, 'filters.countries').map(o => ({
                    ...o,
                    flag: COUNTRY_FLAGS[o.value] || null,
                  }))}
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
        </details>

        {/* PANEL 2: TIPO Y CLASIFICACIÓN */}
        <details className="filter-panel">
          <summary className="filter-panel-summary">
            <span className="filter-panel-icon">🏛️</span>
            <span>{t('filters.panelType', 'Tipo y clasificación')}</span>
          </summary>
          <div className="filters-row">
            <div className="filter-group">
              <label>{t('filters.classification')}</label>
              <SearchableSelect
                value={filters.clasificacion}
                onChange={handleClasificacionChange}
                options={clasificacionOptions}
                placeholder={t('filters.allClassifications')}
              />
            </div>

            {filtros.tipos_monumento?.length > 0 && (
              <div className="filter-group">
                <label>{t('filters.monumentType')}</label>
                <SearchableSelect
                  value={filters.tipo_monumento}
                  onChange={handleTipoMonumentoChange}
                  options={translateOptions(filtros.tipos_monumento, 'filters.monumentTypes')}
                  placeholder={t('filters.allMonumentTypes')}
                />
              </div>
            )}

            {filtros.periodos?.length > 0 && (
              <div className="filter-group">
                <label>{t('filters.period')}</label>
                <SearchableSelect
                  value={filters.periodo}
                  onChange={handlePeriodoChange}
                  options={translateOptions(filtros.periodos, 'filters.periods')}
                  placeholder={t('filters.allPeriods')}
                />
              </div>
            )}

            <div className="filter-group">
              <label>{t('filters.style')}</label>
              <SearchableSelect
                value={filters.estilo}
                onChange={handleEstiloChange}
                options={filtros.estilos}
                placeholder={t('filters.allStyles')}
              />
            </div>
          </div>
        </details>

        {/* PANEL: PROPIEDADES WIKIDATA (Oleada B) — solo aparece si hay datos */}
        {(filtros.religiones?.length > 0 || filtros.dedicaciones?.length > 0 || filtros.partes_de?.length > 0 || filtros.propietarios?.length > 0) && (
          <details className="filter-panel">
            <summary className="filter-panel-summary">
              <span className="filter-panel-icon">⚙️</span>
              <span>{t('filters.panelWikidata', 'Propiedades adicionales')}</span>
            </summary>
            <div className="filter-panel-notice">
              {t('filters.wikidataNotice', 'Aplicable solo a bienes con datos enriquecidos de Wikidata. Bienes sin este dato no aparecerán en los resultados al usar estos filtros.')}
            </div>
            <div className="filters-row">
              {filtros.religiones?.length > 0 && (
                <div className="filter-group">
                  <label>{t('filters.religion', 'Religión')}</label>
                  <SearchableSelect
                    value={filters.religion}
                    onChange={(v) => handleOleadaBChange('religion', v)}
                    options={filtros.religiones}
                    placeholder={t('filters.allReligions', 'Todas las religiones')}
                  />
                </div>
              )}
              {filtros.dedicaciones?.length > 0 && (
                <div className="filter-group">
                  <label>{t('filters.dedicatedTo', 'Dedicado a')}</label>
                  <SearchableSelect
                    value={filters.dedicado_a}
                    onChange={(v) => handleOleadaBChange('dedicado_a', v)}
                    options={filtros.dedicaciones}
                    placeholder={t('filters.allDedications', 'Todas las advocaciones')}
                  />
                </div>
              )}
              {filtros.partes_de?.length > 0 && (
                <div className="filter-group">
                  <label>{t('filters.partOf', 'Parte de')}</label>
                  <SearchableSelect
                    value={filters.parte_de}
                    onChange={(v) => handleOleadaBChange('parte_de', v)}
                    options={filtros.partes_de}
                    placeholder={t('filters.allPartsOf', 'Cualquier conjunto')}
                  />
                </div>
              )}
              {filtros.propietarios?.length > 0 && (
                <div className="filter-group">
                  <label>{t('filters.owner', 'Propietario')}</label>
                  <SearchableSelect
                    value={filters.propietario}
                    onChange={(v) => handleOleadaBChange('propietario', v)}
                    options={filtros.propietarios}
                    placeholder={t('filters.allOwners', 'Todos los propietarios')}
                  />
                </div>
              )}
            </div>
          </details>
        )}

        {/* PANEL 3: EVENTOS HISTÓRICOS (colapsado por defecto) */}
        {(filtros.eventos_padres?.length > 0 || filtros.eventos?.length > 0) && (
          <details className="filter-panel">
            <summary className="filter-panel-summary">
              <span className="filter-panel-icon">📜</span>
              <span>{t('filters.panelEvents', 'Eventos históricos')}</span>
            </summary>
            <div className="filters-row">
              {filtros.eventos_padres?.length > 0 && (
                <div className="filter-group">
                  <label>{t('filters.eventCategory')}</label>
                  <SearchableSelect
                    value={filters.evento_padre}
                    onChange={async (v) => {
                      setFilter('evento_padre', v);
                      if (v) setFilter('evento', '');
                      await reloadFiltros({ ...filters, evento_padre: v, evento: v ? '' : filters.evento });
                    }}
                    options={translateOptions(filtros.eventos_padres, 'filters.events')}
                    placeholder={t('filters.allEventCategories')}
                  />
                </div>
              )}

              {filtros.eventos?.length > 0 && (
                <div className="filter-group">
                  <label>{t('filters.event')}</label>
                  <SearchableSelect
                    value={filters.evento}
                    onChange={async (v) => {
                      setFilter('evento', v);
                      await reloadFiltros({ ...filters, evento: v });
                    }}
                    options={translateOptions(filtros.eventos, 'filters.events')}
                    placeholder={t('filters.allEvents')}
                  />
                </div>
              )}
            </div>
          </details>
        )}

        {/* PANEL 4: OTROS (siempre visible, sin desplegable) */}
        <div className="filter-panel-flat">
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

          <div className="filter-group filter-hn-listas">
            <label className="filter-hn-label">
              🛡️ {t('filters.hnListsLabel', 'Lista Roja de Hispania Nostra')}
            </label>
            <div className="hn-pills">
              {[
                { id: 'roja', label: t('filters.hnRoja', 'Roja'), cls: 'hn-pill-roja' },
                { id: 'verde', label: t('filters.hnVerde', 'Verde'), cls: 'hn-pill-verde' },
                { id: 'negra', label: t('filters.hnNegra', 'Negra'), cls: 'hn-pill-negra' },
              ].map(p => {
                const active = (filters.hn_listas || []).includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`hn-pill ${p.cls} ${active ? 'active' : ''}`}
                    onClick={() => {
                      const curr = filters.hn_listas || [];
                      const next = active ? curr.filter(x => x !== p.id) : [...curr, p.id];
                      handleChange('hn_listas', next);
                    }}
                    aria-pressed={active}
                  >
                    <span className="hn-pill-dot" />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Acciones: siempre visibles */}
      <div className="filter-actions filter-actions-bottom">
        <button type="submit" className="btn btn-primary">{t('filters.search')}</button>
        <button type="button" className="btn btn-secondary" onClick={handleReset}>
          {t('filters.reset')}
        </button>
      </div>
    </form>
  );
}
