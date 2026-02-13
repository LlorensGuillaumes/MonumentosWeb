import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { getMonumento, getWikipediaExtract } from '../services/api';
import { useAuth } from '../context/AuthContext';
import 'leaflet/dist/leaflet.css';
import './Detail.css';

function formatInception(value, t) {
  if (!value) return value;
  // Negative years (BCE): "-0400-01-01T00:00:00Z" → "400 a.C."
  const bceMatch = value.match(/^-0*(\d+)-\d{2}-\d{2}/);
  if (bceMatch) return `${parseInt(bceMatch[1])} ${t('detail.bce')}`;
  // Positive ISO dates: "1551-01-01T00:00:00Z" or "+1200-01-01T00:00:00Z" → year
  const isoMatch = value.match(/^\+?(\d{1,4})-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[1];
  return value;
}

export default function Detail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isFavorito, toggleFavorito } = useAuth();
  const [monumento, setMonumento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [favLoading, setFavLoading] = useState(false);
  const [wikiExtract, setWikiExtract] = useState(null);
  const [wikiLoading, setWikiLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setWikiExtract(null);
    getMonumento(id)
      .then(setMonumento)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!monumento) return;
    const needsWikipedia = !monumento.descripcion_completa
      && (!monumento.wiki_descripcion || monumento.wiki_descripcion.length < 150)
      && monumento.wikipedia_url;
    if (!needsWikipedia) return;
    setWikiLoading(true);
    getWikipediaExtract(monumento.id)
      .then(data => { if (data?.extract) setWikiExtract(data.extract); })
      .finally(() => setWikiLoading(false));
  }, [monumento]);

  if (loading) {
    return (
      <div className="detail-page">
        <div className="loading">{t('detail.loading')}</div>
      </div>
    );
  }

  if (error || !monumento) {
    return (
      <div className="detail-page">
        <div className="error">
          <h2>{t('detail.error')}</h2>
          <p>{error || t('detail.notFound')}</p>
          <Link to="/buscar" className="btn btn-primary">{t('detail.backToSearch')}</Link>
        </div>
      </div>
    );
  }

  const hasLocation = monumento.latitud && monumento.longitud;
  const allImages = [
    ...(monumento.imagen_url ? [{ url: monumento.imagen_url, titulo: monumento.denominacion, fuente: 'wikidata' }] : []),
    ...(monumento.imagenes || []),
  ];

  return (
    <div className="detail-page">
      <nav className="breadcrumb">
        <Link to="/">{t('nav.home')}</Link>
        <span>/</span>
        <Link to="/buscar">{t('nav.search')}</Link>
        <span>/</span>
        <span>{monumento.denominacion}</span>
      </nav>

      <div className="detail-layout">
        {/* Main content */}
        <main className="detail-main">
          <div className="detail-title-row">
            <h1>{monumento.denominacion}</h1>
            <button
              className={`fav-btn ${isFavorito(monumento.id) ? 'fav-active' : ''}`}
              disabled={favLoading}
              onClick={async () => {
                if (!user) { navigate('/login'); return; }
                setFavLoading(true);
                await toggleFavorito(monumento.id);
                setFavLoading(false);
              }}
              title={user ? (isFavorito(monumento.id) ? t('favorites.remove') : t('favorites.add')) : t('auth.loginToFav')}
            >
              {isFavorito(monumento.id) ? '\u2764\uFE0F' : '\u2661'}
            </button>
          </div>

          {/* Location */}
          <div className="detail-location">
            <span>📍</span>
            {[monumento.municipio, monumento.provincia, monumento.comunidad_autonoma, monumento.pais && monumento.pais !== 'España' ? monumento.pais : null]
              .filter(Boolean)
              .join(', ')}
          </div>

          {/* Tags */}
          <div className="detail-tags">
            {monumento.categoria && (
              <span className="tag tag-category">{monumento.categoria}</span>
            )}
            {monumento.tipo && (
              <span className="tag tag-type">{monumento.tipo}</span>
            )}
            {monumento.estilo && (
              <span className="tag tag-style">{monumento.estilo}</span>
            )}
            {monumento.heritage_label && (
              <span className="tag tag-heritage">{monumento.heritage_label}</span>
            )}
          </div>

          {/* Images gallery */}
          {allImages.length > 0 && (
            <section className="detail-gallery">
              <div className="gallery-main">
                <img
                  src={selectedImage || allImages[0].url}
                  alt={monumento.denominacion}
                  onClick={() => window.open(selectedImage || allImages[0].url, '_blank')}
                />
              </div>
              {allImages.length > 1 && (
                <div className="gallery-thumbs">
                  {allImages.map((img, i) => (
                    <img
                      key={i}
                      src={img.url}
                      alt={img.titulo || `Imagen ${i + 1}`}
                      className={selectedImage === img.url ? 'active' : ''}
                      onClick={() => setSelectedImage(img.url)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Description */}
          {(monumento.descripcion_completa || monumento.wiki_descripcion || wikiExtract) ? (
            <section className="detail-section">
              <h2>{t('detail.description')}</h2>
              {monumento.descripcion_completa ? (
                <p>{monumento.descripcion_completa}</p>
              ) : wikiExtract ? (
                <>
                  <p>{wikiExtract}</p>
                  <p className="wiki-attribution">
                    <a href={monumento.wikipedia_url} target="_blank" rel="noopener noreferrer">
                      {t('detail.sourceWikipedia')}
                    </a>
                  </p>
                </>
              ) : monumento.wiki_descripcion ? (
                <p>{monumento.wiki_descripcion}</p>
              ) : null}
            </section>
          ) : wikiLoading ? (
            <section className="detail-section">
              <h2>{t('detail.description')}</h2>
              <p className="wiki-loading">{t('detail.loadingWikipedia')}</p>
            </section>
          ) : null}

          {/* History */}
          {monumento.sintesis_historica && (
            <section className="detail-section">
              <h2>{t('detail.history')}</h2>
              <p>{monumento.sintesis_historica}</p>
            </section>
          )}

          {/* Dating */}
          {(monumento.datacion || monumento.inception || monumento.periodo_historico || monumento.siglo) && (
            <section className="detail-section">
              <h2>{t('detail.dating')}</h2>
              <dl className="detail-dl">
                {monumento.datacion && <><dt>{t('detail.date')}</dt><dd>{monumento.datacion}</dd></>}
                {monumento.inception && <><dt>{t('detail.construction')}</dt><dd>{formatInception(monumento.inception, t)}</dd></>}
                {monumento.periodo_historico && <><dt>{t('detail.period')}</dt><dd>{monumento.periodo_historico}</dd></>}
                {monumento.siglo && <><dt>{t('detail.century')}</dt><dd>{monumento.siglo}</dd></>}
              </dl>
            </section>
          )}

          {/* Technical details */}
          {(monumento.arquitecto || monumento.material || monumento.altura || monumento.superficie) && (
            <section className="detail-section">
              <h2>{t('detail.technicalDetails')}</h2>
              <dl className="detail-dl">
                {monumento.arquitecto && <><dt>{t('detail.architect')}</dt><dd>{monumento.arquitecto}</dd></>}
                {monumento.material && <><dt>{t('detail.material')}</dt><dd>{monumento.material}</dd></>}
                {monumento.altura && <><dt>{t('detail.height')}</dt><dd>{monumento.altura} m</dd></>}
                {monumento.superficie && <><dt>{t('detail.area')}</dt><dd>{monumento.superficie} m²</dd></>}
              </dl>
            </section>
          )}

          {/* Bibliography */}
          {(monumento.fuentes || monumento.bibliografia) && (
            <section className="detail-section">
              <h2>{t('detail.sources')}</h2>
              {monumento.fuentes && <p>{monumento.fuentes}</p>}
              {monumento.bibliografia && <p>{monumento.bibliografia}</p>}
            </section>
          )}
        </main>

        {/* Sidebar */}
        <aside className="detail-sidebar">
          {/* Map */}
          {hasLocation && (
            <div className="sidebar-card">
              <h3>{t('detail.location')}</h3>
              <div className="sidebar-map">
                <MapContainer
                  center={[monumento.latitud, monumento.longitud]}
                  zoom={14}
                  style={{ height: '200px', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[monumento.latitud, monumento.longitud]}>
                    <Popup>{monumento.denominacion}</Popup>
                  </Marker>
                </MapContainer>
              </div>
              <a
                href={`https://www.google.com/maps?q=${monumento.latitud},${monumento.longitud}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-block"
              >
                {t('detail.openGoogleMaps')}
              </a>
            </div>
          )}

          {/* Links */}
          <div className="sidebar-card">
            <h3>{t('detail.links')}</h3>
            <div className="sidebar-links">
              {monumento.wikipedia_url && (
                <a href={monumento.wikipedia_url} target="_blank" rel="noopener noreferrer">
                  📖 Wikipedia
                </a>
              )}
              {monumento.qid && (
                <a href={`https://www.wikidata.org/wiki/${monumento.qid}`} target="_blank" rel="noopener noreferrer">
                  🔗 Wikidata
                </a>
              )}
              {monumento.commons_category && (
                <a href={`https://commons.wikimedia.org/wiki/Category:${monumento.commons_category}`} target="_blank" rel="noopener noreferrer">
                  📷 Wikimedia Commons
                </a>
              )}
              {monumento.sipca_url && (
                <a href={monumento.sipca_url} target="_blank" rel="noopener noreferrer">
                  🏛️ SIPCA
                </a>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="sidebar-card">
            <h3>{t('detail.information')}</h3>
            <dl className="sidebar-dl">
              {monumento.pais && monumento.pais !== 'España' && <><dt>{t('detail.countryLabel')}</dt><dd>{monumento.pais}</dd></>}
              <dt>{t('detail.regionLabel')}</dt>
              <dd>{monumento.comunidad_autonoma}</dd>
              {monumento.provincia && <><dt>{t('detail.provinceLabel')}</dt><dd>{monumento.provincia}</dd></>}
              {monumento.comarca && <><dt>{t('detail.comarca')}</dt><dd>{monumento.comarca}</dd></>}
              {monumento.municipio && <><dt>{t('detail.municipalityLabel')}</dt><dd>{monumento.municipio}</dd></>}
              {monumento.localidad && <><dt>{t('detail.locality')}</dt><dd>{monumento.localidad}</dd></>}
              {monumento.ubicacion_detalle && <><dt>{t('detail.address')}</dt><dd>{monumento.ubicacion_detalle}</dd></>}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
