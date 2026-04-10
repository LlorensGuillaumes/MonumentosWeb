import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { CURATED_ROUTES, THEMES } from '../data/curatedRoutes';
import { getRutasCulturales } from '../services/api';
import './CuratedRoutes.css';

const COUNTRIES = [
  { id: 'España', flag: '🇪🇸' },
  { id: 'Francia', flag: '🇫🇷' },
  { id: 'Portugal', flag: '🇵🇹' },
];

// Normalize a DB cultural route into the same shape used by curated route cards
function normalizeCultural(cr) {
  return {
    id: `cultural-${cr.slug}`,
    slug: cr.slug,
    isCultural: true,
    theme: cr.tema || 'renaissance',
    countries: [cr.pais || 'España'],
    name: cr.nombre,
    description: cr.descripcion || '',
    period: '',
    stopsEstimate: cr.num_paradas || 0,
    highlights: [],
    linkTo: `/rutas-culturales/${cr.slug}`,
  };
}

export default function CuratedRoutes() {
  const { t } = useTranslation();
  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [search, setSearch] = useState('');
  const [culturalRoutes, setCulturalRoutes] = useState([]);

  useEffect(() => {
    getRutasCulturales().then(setCulturalRoutes).catch(() => {});
  }, []);

  // Merge curated (static) + cultural (DB) into a single list
  const allRoutes = useMemo(() => {
    const curated = CURATED_ROUTES.map(r => ({
      ...r,
      isCultural: false,
      linkTo: `/rutas-curadas/${r.id}`,
      description: t(r.descKey),
    }));
    const cultural = culturalRoutes.map(normalizeCultural);
    return [...curated, ...cultural];
  }, [culturalRoutes, t]);

  const filtered = useMemo(() => {
    return allRoutes.filter(r => {
      if (selectedTheme && r.theme !== selectedTheme) return false;
      if (selectedCountry && !r.countries.includes(selectedCountry)) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.name.toLowerCase().includes(q)
          || (r.highlights || []).some(h => h.toLowerCase().includes(q))
          || (r.period || '').toLowerCase().includes(q)
          || (r.description || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [allRoutes, selectedTheme, selectedCountry, search]);

  const totalCount = allRoutes.length;

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
        <div className="curated-search">
          <input
            type="text"
            placeholder={t('curatedRoutes.searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="curated-filter-row">
          {/* Country filter */}
          <div className="curated-country-pills">
            <button
              className={`country-pill ${!selectedCountry ? 'active' : ''}`}
              onClick={() => setSelectedCountry('')}
            >
              {t('curatedRoutes.allCountries')}
            </button>
            {COUNTRIES.map(c => (
              <button
                key={c.id}
                className={`country-pill ${selectedCountry === c.id ? 'active' : ''}`}
                onClick={() => setSelectedCountry(prev => prev === c.id ? '' : c.id)}
              >
                {c.flag} {c.id}
              </button>
            ))}
          </div>
        </div>

        {/* Theme filter */}
        <div className="curated-theme-pills">
          <button
            className={`theme-pill ${!selectedTheme ? 'active' : ''}`}
            onClick={() => setSelectedTheme('')}
          >
            {t('curatedRoutes.allThemes')}
          </button>
          {THEMES.map(th => (
            <button
              key={th.id}
              className={`theme-pill ${selectedTheme === th.id ? 'active' : ''}`}
              onClick={() => setSelectedTheme(prev => prev === th.id ? '' : th.id)}
            >
              {th.icon} {t(th.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="curated-results-info">
        <span>{filtered.length} {t('curatedRoutes.routesFound')}</span>
        {(selectedTheme || selectedCountry || search) && (
          <button
            className="btn-link"
            onClick={() => { setSelectedTheme(''); setSelectedCountry(''); setSearch(''); }}
          >
            {t('curatedRoutes.clearFilters')}
          </button>
        )}
      </div>

      {/* Routes grid */}
      <div className="curated-grid">
        {filtered.map(route => {
          const theme = THEMES.find(th => th.id === route.theme);
          return (
            <Link key={route.id} to={route.linkTo} className="curated-card">
              <div className="curated-card-header">
                <span className="curated-card-icon">{theme?.icon || '🎨'}</span>
                <div className="curated-card-badges">
                  {route.isCultural && (
                    <span className="curated-card-cultural-badge">{t('culturalRoutes.badge')}</span>
                  )}
                  {route.countries.map(c => {
                    const co = COUNTRIES.find(x => x.id === c);
                    return <span key={c} className="curated-card-country">{co?.flag} {c}</span>;
                  })}
                </div>
              </div>
              <h3 className="curated-card-title">{route.name}</h3>
              <p className="curated-card-desc">{route.description}</p>
              <div className="curated-card-meta">
                {route.period && <span className="curated-card-period">{route.period}</span>}
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

      {filtered.length === 0 && (
        <div className="curated-empty">
          <p>{t('curatedRoutes.noResults')}</p>
        </div>
      )}
    </div>
  );
}
