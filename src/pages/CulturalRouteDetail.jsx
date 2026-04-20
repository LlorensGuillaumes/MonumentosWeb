import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { getRutaCultural } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PhotoGallery from '../components/PhotoGallery';
import 'leaflet/dist/leaflet.css';
import './CulturalRouteDetail.css';

function numberedIcon(n, active) {
  return L.divIcon({
    html: `<div class="cr-marker ${active ? 'cr-marker-active' : ''}">${n}</div>`,
    className: 'cr-marker-wrapper',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function CulturalRouteDetail() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [ruta, setRuta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeStop, setActiveStop] = useState(null);
  const stopRefs = useRef([]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getRutaCultural(slug)
      .then(data => { setRuta(data); setActiveStop(0); })
      .catch(() => setError(t('culturalRoutes.notFound')))
      .finally(() => setLoading(false));
  }, [slug, t]);

  const scrollToStop = useCallback((index) => {
    setActiveStop(index);
    stopRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  if (loading) {
    return <div className="cr-loading">{t('culturalRoutes.loading')}</div>;
  }

  if (error || !ruta) {
    return (
      <div className="cr-error">
        <p>{error || t('culturalRoutes.notFound')}</p>
        <Link to="/rutas-curadas">{t('culturalRoutes.backToRoutes')}</Link>
      </div>
    );
  }

  const paradas = ruta.paradas || [];

  return (
    <div className="cultural-route-detail">
      <Helmet>
        <title>{ruta.nombre} | Monumentos</title>
        <meta name="description" content={ruta.descripcion?.slice(0, 160)} />
        {ruta.imagen_portada && <meta property="og:image" content={ruta.imagen_portada} />}
      </Helmet>

      {/* Breadcrumb */}
      <nav className="cr-breadcrumb">
        <Link to="/rutas-curadas">{t('curatedRoutes.title')}</Link>
        <span> / </span>
        <span>{ruta.nombre}</span>
      </nav>

      {/* Header */}
      <header className="cr-header">
        <h1>{ruta.nombre}</h1>
        <div className="cr-meta">
          {ruta.region && <span className="cr-tag">{ruta.region}</span>}
          {ruta.pais && <span className="cr-tag">{ruta.pais}</span>}
          <span className="cr-tag">{paradas.length} {t('culturalRoutes.stops')}</span>
        </div>
        {ruta.descripcion && <p className="cr-description">{ruta.descripcion}</p>}
      </header>

      {/* Map */}
      {paradas.length > 0 && paradas[0].latitud && (
        <section className="cr-map-section">
          <h2>{t('culturalRoutes.mapTitle')}</h2>
          <div className="cr-map">
            <MapContainer
              center={[ruta.centro_lat || paradas[0].latitud, ruta.centro_lng || paradas[0].longitud]}
              zoom={ruta.zoom || 10}
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {paradas.map((p, i) => p.latitud && p.longitud && (
                <Marker
                  key={p.id}
                  position={[p.latitud, p.longitud]}
                  icon={numberedIcon(p.orden, activeStop === i)}
                  eventHandlers={{ click: () => scrollToStop(i) }}
                >
                  <Popup>
                    <strong>{p.orden}. {p.nombre}</strong>
                    <br />{p.localidad}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="cr-actions">
        {user && (
          <Link to={`/rutas?from_cultural=${slug}`} className="btn btn-primary btn-lg">
            {t('curatedRoutes.planThisRoute')}
          </Link>
        )}
        <Link to="/rutas-curadas" className="btn btn-outline">
          {t('culturalRoutes.backToRoutes')}
        </Link>
      </div>

      {/* Stops */}
      <section className="cr-stops">
        {paradas.map((p, i) => (
          <article
            key={p.id}
            ref={el => stopRefs.current[i] = el}
            className={`cr-stop-card ${activeStop === i ? 'active' : ''}`}
            onClick={() => setActiveStop(i)}
          >
            <div className="cr-stop-header">
              <span className="cr-stop-number">{p.orden}</span>
              <div>
                <h3>{p.nombre}</h3>
                {p.localidad && <span className="cr-stop-locality">{p.localidad}</span>}
              </div>
            </div>

            <div className="cr-stop-chips">
              {p.estilo && <span className="cr-chip">{p.estilo}</span>}
              {p.periodo && <span className="cr-chip">{p.periodo}</span>}
              {p.autor && <span className="cr-chip">{t('culturalRoutes.author')}: {p.autor}</span>}
              {p.anyo_restauracion && (
                <span className="cr-chip">{t('culturalRoutes.restoration')}: {p.anyo_restauracion}</span>
              )}
            </div>

            {p.descripcion && (
              <p className="cr-stop-description">{p.descripcion}</p>
            )}

            {p.fotos && p.fotos.length > 0 && (
              <PhotoGallery photos={p.fotos} altBase={p.nombre} />
            )}

            {p.bien_id && (
              <Link to={`/monumento/${p.bien_id}`} className="cr-stop-bien-link">
                {t('culturalRoutes.viewMonument')} &rarr;
              </Link>
            )}
          </article>
        ))}
      </section>

    </div>
  );
}
