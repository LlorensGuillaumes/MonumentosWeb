import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { CURATED_ROUTES, THEMES, ERAS, ERA_BY_THEME } from '../data/curatedRoutes';
import { getRutasCulturales } from '../services/api';
import SearchableSelect from '../components/SearchableSelect';
import CuratedRoutesMap from '../components/CuratedRoutesMap';
import './CuratedRoutes.css';

const COUNTRIES = [
  { id: 'España',   flag: '🇪🇸' },
  { id: 'Italia',   flag: '🇮🇹' },
  { id: 'Francia',  flag: '🇫🇷' },
  { id: 'Portugal', flag: '🇵🇹' },
];

const SORT_OPTIONS = [
  { id: 'featured',   labelKey: 'curatedRoutes.sortFeatured' },
  { id: 'name_asc',   labelKey: 'curatedRoutes.sortNameAsc' },
  { id: 'name_desc',  labelKey: 'curatedRoutes.sortNameDesc' },
  { id: 'stops_desc', labelKey: 'curatedRoutes.sortStopsDesc' },
  { id: 'stops_asc',  labelKey: 'curatedRoutes.sortStopsAsc' },
];

function normalizeCultural(cr) {
  return {
    id: `cultural-${cr.slug}`,
    slug: cr.slug,
    isCultural: true,
    theme: cr.tema || 'renaissance',
    countries: [cr.pais || 'España'],
    name: cr.nombre,
    nameKey: null,
    description: cr.descripcion || '',
    period: '',
    stopsEstimate: cr.num_paradas || 0,
    highlights: [],
    featured: cr.featured || false,
    linkTo: `/rutas-culturales/${cr.slug}`,
    center: cr.centro_lat != null && cr.centro_lng != null
      ? { lat: cr.centro_lat, lng: cr.centro_lng }
      : null,
    zoom: cr.zoom || 8,
  };
}

export default function CuratedRoutes() {
  const { t, i18n } = useTranslation();
  const [selectedThemes, setSelectedThemes] = useState([]);
  const [selectedEras, setSelectedEras] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
  const [culturalRoutes, setCulturalRoutes] = useState([]);

  const activeFilterCount = selectedThemes.length + selectedEras.length + (selectedCountry ? 1 : 0);

  useEffect(() => {
    getRutasCulturales(i18n.language).then(setCulturalRoutes).catch(() => {});
  }, [i18n.language]);

  // Helper: obtener nombre traducido si hay nameKey
  const getRouteName = (route) => {
    if (route.nameKey) {
      const translated = t(route.nameKey);
      if (translated && translated !== route.nameKey) return translated;
    }
    return route.name;
  };

  // Helper: traduce period (ej. "Siglos XI–XIII" → "Centuries XI-XIII")
  const translatePeriod = (period) => {
    if (!period) return '';
    let p = period;
    p = p.replace(/\bSiglos\b/g, t('period.centuries'));
    p = p.replace(/\bSiglo\b/g,  t('period.century'));
    p = p.replace(/\bmilenio\b/g, t('period.millennium'));
    p = p.replace(/\ba\.C\.\b/g, t('period.bc'));
    p = p.replace(/\bd\.C\.\b/g, t('period.ad'));
    p = p.replace(/\bactualidad\b/g, t('period.present'));
    p = p.replace(/\bFinales\b/g, t('period.late'));
    p = p.replace(/\binicios\b/g, t('period.early'));
    p = p.replace(/\bs\. /g, t('period.centuryAbbr') + ' ');
    return p;
  };

  // Merge curated (static) + cultural (DB)
  const allRoutes = useMemo(() => {
    const curated = CURATED_ROUTES.map(r => ({
      ...r,
      isCultural: false,
      linkTo: `/rutas-curadas/${r.id}`,
      description: t(r.descKey),
      nameKey: `curatedRoutes.routes.${r.id}.name`,
    }));
    const cultural = culturalRoutes.map(normalizeCultural);
    return [...curated, ...cultural];
  }, [culturalRoutes, t]);

  const filtered = useMemo(() => {
    const list = allRoutes.filter(r => {
      // Theme (multi)
      if (selectedThemes.length > 0 && !selectedThemes.includes(r.theme)) return false;
      // Era (multi)
      if (selectedEras.length > 0) {
        const era = ERA_BY_THEME[r.theme];
        if (!selectedEras.includes(era)) return false;
      }
      // Country
      if (selectedCountry && !r.countries.includes(selectedCountry)) return false;
      // Text search
      if (search) {
        const q = search.toLowerCase();
        const name = getRouteName(r).toLowerCase();
        return name.includes(q)
          || (r.highlights || []).some(h => h.toLowerCase().includes(q))
          || (r.period || '').toLowerCase().includes(q)
          || (r.description || '').toLowerCase().includes(q);
      }
      return true;
    });

    // Ordenación
    const sorted = [...list];
    switch (sortBy) {
      case 'name_asc':
        sorted.sort((a, b) => getRouteName(a).localeCompare(getRouteName(b)));
        break;
      case 'name_desc':
        sorted.sort((a, b) => getRouteName(b).localeCompare(getRouteName(a)));
        break;
      case 'stops_desc':
        sorted.sort((a, b) => (b.stopsEstimate || 0) - (a.stopsEstimate || 0));
        break;
      case 'stops_asc':
        sorted.sort((a, b) => (a.stopsEstimate || 0) - (b.stopsEstimate || 0));
        break;
      case 'featured':
      default:
        sorted.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
    }
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRoutes, selectedThemes, selectedEras, selectedCountry, search, sortBy, t]);

  const totalCount = allRoutes.length;

  // Opciones para SearchableSelect
  const countryOptions = useMemo(() =>
    COUNTRIES.map(c => ({ value: c.id, label: `${c.flag} ${c.id}` })),
    []
  );

  const themeOptions = useMemo(() =>
    THEMES.map(th => ({ value: th.id, label: `${th.icon} ${t(th.labelKey)}` })),
    [t]
  );

  const eraOptions = useMemo(() =>
    ERAS.map(e => ({ value: e.id, label: `${e.icon} ${t(e.labelKey)}` })),
    [t]
  );

  const sortOptions = useMemo(() =>
    SORT_OPTIONS.map(s => ({ value: s.id, label: t(s.labelKey) })),
    [t]
  );

  const toggleTheme = (id) => {
    setSelectedThemes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleEra = (id) => {
    setSelectedEras(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const clearAll = () => {
    setSelectedThemes([]);
    setSelectedEras([]);
    setSelectedCountry('');
    setSearch('');
    setSortBy('featured');
  };

  return (
    <div className="curated-routes">
      <Helmet>
        <title>{t('curatedRoutes.title')} - Patrimonio Europeo</title>
        <meta name="description" content={t('curatedRoutes.subtitleDynamic', { count: totalCount })} />
      </Helmet>

      <section className="curated-hero">
        <h1>{t('curatedRoutes.title')}</h1>
        <p>{t('curatedRoutes.subtitleDynamic', { count: totalCount })}</p>
      </section>

      {/* Filters */}
      <div className="curated-filters">
        {/* Fila búsqueda + ordenación */}
        <div className="curated-filter-grid">
          <div className="curated-search">
            <input
              type="text"
              placeholder={t('curatedRoutes.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="curated-filter-cell">
            <label>{t('curatedRoutes.country', 'País')}</label>
            <SearchableSelect
              value={selectedCountry}
              onChange={setSelectedCountry}
              options={countryOptions}
              placeholder={t('curatedRoutes.allCountries')}
            />
          </div>

          <div className="curated-filter-cell">
            <label>{t('curatedRoutes.sortBy', 'Ordenar')}</label>
            <SearchableSelect
              value={sortBy}
              onChange={(v) => setSortBy(v || 'featured')}
              options={sortOptions}
              placeholder=""
            />
          </div>
        </div>

        {/* Multi-select chips colapsables */}
        <details className="curated-multi-panel" open>
          <summary>
            <span>🎨 {t('curatedRoutes.themes', 'Temas')}</span>
            {selectedThemes.length > 0 && (
              <span className="curated-multi-badge">{selectedThemes.length}</span>
            )}
          </summary>
          <div className="curated-pills-row">
            {THEMES.map(th => (
              <button
                key={th.id}
                className={`theme-pill ${selectedThemes.includes(th.id) ? 'active' : ''}`}
                onClick={() => toggleTheme(th.id)}
              >
                {th.icon} {t(th.labelKey)}
              </button>
            ))}
          </div>
        </details>

        <details className="curated-multi-panel">
          <summary>
            <span>🕰️ {t('curatedRoutes.era', 'Época')}</span>
            {selectedEras.length > 0 && (
              <span className="curated-multi-badge">{selectedEras.length}</span>
            )}
          </summary>
          <div className="curated-pills-row">
            {ERAS.map(e => (
              <button
                key={e.id}
                className={`era-pill ${selectedEras.includes(e.id) ? 'active' : ''}`}
                onClick={() => toggleEra(e.id)}
              >
                {e.icon} {t(e.labelKey)}
              </button>
            ))}
          </div>
        </details>
      </div>

      {/* Results count + view toggle */}
      <div className="curated-results-info">
        <span>{filtered.length} {t('curatedRoutes.routesFound')}</span>
        <div className="curated-results-actions">
          <div className="curated-view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label={t('curatedRoutes.viewGrid', 'Lista')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
              <span>{t('curatedRoutes.viewGrid', 'Lista')}</span>
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
              aria-label={t('curatedRoutes.viewMap', 'Mapa')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
              </svg>
              <span>{t('curatedRoutes.viewMap', 'Mapa')}</span>
            </button>
          </div>
          {(activeFilterCount > 0 || search || sortBy !== 'featured') && (
            <button className="btn-link" onClick={clearAll}>
              {t('curatedRoutes.clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* Vista mapa */}
      {viewMode === 'map' && (
        <CuratedRoutesMap
          routes={filtered.map(r => ({
            ...r,
            displayName: getRouteName(r),
            themeIcon: THEMES.find(t => t.id === r.theme)?.icon,
          }))}
        />
      )}

      {/* Vista grid */}
      {viewMode === 'grid' && (
      <div className="curated-grid">
        {filtered.map(route => {
          const theme = THEMES.find(th => th.id === route.theme);
          const displayName = getRouteName(route);
          return (
            <Link key={route.id} to={route.linkTo} className="curated-card">
              <div className="curated-card-header">
                <span className="curated-card-icon">{theme?.icon || '🎨'}</span>
                <div className="curated-card-badges">
                  {route.featured && (
                    <span className="curated-card-featured-badge">⭐</span>
                  )}
                  {route.isCultural && (
                    <span className="curated-card-cultural-badge">{t('culturalRoutes.badge')}</span>
                  )}
                  {route.countries.map(c => {
                    const co = COUNTRIES.find(x => x.id === c);
                    return <span key={c} className="curated-card-country">{co?.flag} {c}</span>;
                  })}
                </div>
              </div>
              <h3 className="curated-card-title">{displayName}</h3>
              <p className="curated-card-desc">{route.description}</p>
              <div className="curated-card-meta">
                {route.period && <span className="curated-card-period">{translatePeriod(route.period)}</span>}
                <span className="curated-card-stops">
                  {route.isCultural ? '' : '~'}{route.stopsEstimate} {t('curatedRoutes.stops')}
                </span>
              </div>
              {route.highlights && route.highlights.length > 0 && (
                <div className="curated-card-highlights">
                  {route.highlights.slice(0, 3).map(h => (
                    <span key={h} className="curated-highlight">{h}</span>
                  ))}
                  {route.highlights.length > 3 && (
                    <span className="curated-highlight curated-highlight-more">+{route.highlights.length - 3}</span>
                  )}
                </div>
              )}
              <span className="curated-card-cta">{t('curatedRoutes.viewRoute')} →</span>
            </Link>
          );
        })}
      </div>
      )}

      {filtered.length === 0 && viewMode === 'grid' && (
        <div className="curated-empty">
          <p>{t('curatedRoutes.noResults')}</p>
        </div>
      )}
    </div>
  );
}
