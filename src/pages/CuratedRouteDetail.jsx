import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { getMonumentos, getMonumentosRadio } from '../services/api';
import { getRouteById, THEMES } from '../data/curatedRoutes';
import { useAuth } from '../context/AuthContext';
import 'leaflet/dist/leaflet.css';
import './CuratedRouteDetail.css';

export default function CuratedRouteDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const route = getRouteById(id);

  const [monuments, setMonuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid | list

  const theme = route ? THEMES.find(th => th.id === route.theme) : null;

  useEffect(() => {
    if (!route) return;
    setLoading(true);
    setError(null);

    const fetchMonuments = async () => {
      try {
        let items = [];
        // Try radius search first if defined
        if (route.radiusSearch) {
          const data = await getMonumentosRadio({
            lat: route.radiusSearch.lat,
            lng: route.radiusSearch.lng,
            km: route.radiusSearch.km,
            limit: route.searchParams.limit || 30,
            ...(route.searchParams.categoria && { categoria: route.searchParams.categoria }),
            ...(route.searchParams.estilo && { estilo: route.searchParams.estilo }),
            ...(route.searchParams.pais && { pais: route.searchParams.pais }),
          });
          items = data.items || [];
        }
        // If radius search returned few results, or no radius search, use normal search
        if (items.length < 3) {
          const data = await getMonumentos(route.searchParams);
          items = data.items || [];
        }
        setMonuments(items);
      } catch (err) {
        console.error('Error loading route monuments:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMonuments();
  }, [route]);

  if (!route) {
    return (
      <div className="curated-detail">
        <div className="curated-detail-error">
          <h2>{t('curatedRoutes.notFound')}</h2>
          <Link to="/rutas-curadas" className="btn btn-primary">{t('curatedRoutes.backToRoutes')}</Link>
        </div>
      </div>
    );
  }

  const countryFlags = { 'España': '🇪🇸', 'Francia': '🇫🇷', 'Portugal': '🇵🇹' };
  const monumentsWithCoords = monuments.filter(m => m.latitud && m.longitud);

  return (
    <div className="curated-detail">
      <Helmet>
        <title>{route.name} - Patrimonio Europeo</title>
        <meta name="description" content={t(route.descKey)} />
      </Helmet>

      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <button className="back-btn" onClick={() => navigate(-1)}>← {t('detail.back')}</button>
        <span className="breadcrumb-sep">/</span>
        <Link to="/rutas-curadas">{t('curatedRoutes.title')}</Link>
        <span>/</span>
        <span>{route.name}</span>
      </nav>

      {/* Header */}
      <div className="curated-detail-header">
        <span className="curated-detail-icon">{theme?.icon || '📍'}</span>
        <div>
          <h1>{route.name}</h1>
          <div className="curated-detail-meta">
            {route.countries.map(c => (
              <span key={c} className="curated-detail-country">{countryFlags[c]} {c}</span>
            ))}
            <span className="curated-detail-period">{route.period}</span>
            <span className="curated-detail-stops">~{route.stopsEstimate} {t('curatedRoutes.stops')}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="curated-detail-desc">{t(route.descKey)}</p>

      {/* Highlights */}
      <div className="curated-detail-highlights">
        <h3>{t('curatedRoutes.keyMonuments')}</h3>
        <div className="curated-detail-highlight-list">
          {route.highlights.map(h => (
            <span key={h} className="curated-detail-highlight">{h}</span>
          ))}
        </div>
      </div>

      {/* Map */}
      <section className="curated-detail-map-section">
        <h2>{t('curatedRoutes.mapTitle')}</h2>
        {loading ? (
          <div className="curated-detail-map-loading">{t('curatedRoutes.loadingMonuments')}</div>
        ) : monumentsWithCoords.length > 0 ? (
          <div className="curated-detail-map">
            <MapContainer
              center={[route.center.lat, route.center.lng]}
              zoom={route.zoom}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {monumentsWithCoords.map(m => (
                <Marker key={m.id} position={[m.latitud, m.longitud]}>
                  <Popup>
                    <strong>{m.denominacion}</strong><br />
                    {m.municipio}
                    {m.provincia && <>, {m.provincia}</>}
                    <br />
                    <a href={`/monumento/${m.id}`} target="_blank" rel="noopener noreferrer">
                      {t('curatedRoutes.viewMonument')}
                    </a>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        ) : (
          <div className="curated-detail-map-empty">{t('curatedRoutes.noMonumentsFound')}</div>
        )}
      </section>

      {/* Actions */}
      <div className="curated-detail-actions">
        {user && (
          <Link
            to={`/rutas?from_curated=${route.id}`}
            className="btn btn-primary btn-lg"
          >
            {t('curatedRoutes.planThisRoute')}
          </Link>
        )}
        <Link to="/rutas-curadas" className="btn btn-outline">
          {t('curatedRoutes.backToRoutes')}
        </Link>
      </div>

      {/* Monuments list */}
      {!loading && monuments.length > 0 && (
        <section className="curated-detail-monuments">
          <div className="curated-detail-monuments-header">
            <h2>{t('curatedRoutes.monumentsFound', { count: monuments.length })}</h2>
            <div className="curated-view-toggle">
              <button
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="curated-monuments-grid">
              {monuments.map(m => (
                <Link key={m.id} to={`/monumento/${m.id}`} className="curated-monument-card">
                  <div className="curated-monument-img">
                    <img
                      src={m.imagen_url || '/no-image.svg'}
                      alt=""
                      loading="lazy"
                      onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }}
                    />
                  </div>
                  <div className="curated-monument-info">
                    <strong>{m.denominacion}</strong>
                    <span>{[m.municipio, m.provincia].filter(Boolean).join(', ')}</span>
                    {m.estilo && <span className="curated-monument-style">{m.estilo}</span>}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="curated-monuments-list">
              {monuments.map((m, i) => (
                <Link key={m.id} to={`/monumento/${m.id}`} className="curated-monument-row">
                  <span className="curated-monument-num">{i + 1}</span>
                  <img
                    src={m.imagen_url || '/no-image.svg'}
                    alt=""
                    loading="lazy"
                    onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }}
                  />
                  <div className="curated-monument-row-info">
                    <strong>{m.denominacion}</strong>
                    <span>{[m.municipio, m.provincia, m.comunidad_autonoma].filter(Boolean).join(', ')}</span>
                  </div>
                  {m.estilo && <span className="curated-monument-tag">{m.estilo}</span>}
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {error && (
        <div className="curated-detail-error">
          <p>{t('curatedRoutes.loadError')}</p>
        </div>
      )}
    </div>
  );
}
