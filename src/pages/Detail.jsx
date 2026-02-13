import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { getMonumento, getWikipediaExtract, getValoraciones, addValoracion, getNotasMonumento, addNotaMonumento, deleteNotaMonumento } from '../services/api';
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

function StarRating({ value, onChange, readonly, size = '1.3rem' }) {
  return (
    <span className="star-rating" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          className={`star ${star <= value ? 'star-filled' : 'star-empty'} ${!readonly ? 'star-clickable' : ''}`}
          onClick={() => !readonly && onChange && onChange(star)}
        >
          {star <= value ? '\u2605' : '\u2606'}
        </span>
      ))}
    </span>
  );
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

  // Ratings state
  const [ratings, setRatings] = useState(null);
  const [userRating, setUserRating] = useState({ general: 0, conservacion: 0, accesibilidad: 0 });
  const [showExtraRatings, setShowExtraRatings] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingMsg, setRatingMsg] = useState('');

  // Notes state
  const [notas, setNotas] = useState([]);
  const [notaText, setNotaText] = useState('');
  const [notaTipo, setNotaTipo] = useState('nota');
  const [notaSubmitting, setNotaSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setWikiExtract(null);
    setRatings(null);
    setNotas([]);
    getMonumento(id)
      .then(setMonumento)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Load ratings & notes when monument loads
  useEffect(() => {
    if (!monumento) return;
    getValoraciones(monumento.id).then(data => {
      setRatings(data);
      if (data.user_rating) {
        setUserRating({
          general: data.user_rating.general || 0,
          conservacion: data.user_rating.conservacion || 0,
          accesibilidad: data.user_rating.accesibilidad || 0,
        });
        if (data.user_rating.conservacion || data.user_rating.accesibilidad) {
          setShowExtraRatings(true);
        }
      }
    }).catch(() => {});
    getNotasMonumento(monumento.id).then(setNotas).catch(() => {});
  }, [monumento]);

  const handleSubmitRating = async () => {
    if (!user || !userRating.general) return;
    setRatingSubmitting(true);
    setRatingMsg('');
    try {
      await addValoracion(monumento.id, userRating);
      const data = await getValoraciones(monumento.id);
      setRatings(data);
      setRatingMsg(t('detail.ratingsSaved'));
      setTimeout(() => setRatingMsg(''), 3000);
    } catch {
      setRatingMsg(t('detail.ratingsError'));
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleSubmitNota = async () => {
    if (!user || !notaText.trim()) return;
    setNotaSubmitting(true);
    try {
      const nota = await addNotaMonumento(monumento.id, notaTipo, notaText.trim());
      setNotas(prev => [nota, ...prev]);
      setNotaText('');
      setNotaTipo('nota');
    } catch { /* ignore */ }
    finally { setNotaSubmitting(false); }
  };

  const handleDeleteNota = async (notaId) => {
    try {
      await deleteNotaMonumento(monumento.id, notaId);
      setNotas(prev => prev.filter(n => n.id !== notaId));
    } catch { /* ignore */ }
  };

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
        <button className="back-btn" onClick={() => navigate(-1)} title={t('detail.back')}>
          ← {t('detail.back')}
        </button>
        <span className="breadcrumb-sep">/</span>
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
                  onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }}
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
                      onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }}
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

          {/* Ratings */}
          <section className="detail-section">
            <h2>{t('detail.ratings')}</h2>
            {ratings && ratings.total >= 3 ? (
              <div className="ratings-summary">
                <div className="ratings-main-score">
                  <span className="ratings-number">{ratings.media_general}</span>
                  <StarRating value={Math.round(ratings.media_general)} readonly size="1.1rem" />
                  <span className="ratings-count">{ratings.total} {t('detail.ratingsCount')}</span>
                </div>
                {ratings.total_conservacion >= 3 && (
                  <div className="ratings-detail-row">
                    <span className="ratings-label">{t('detail.ratingsConservation')}</span>
                    <StarRating value={Math.round(ratings.media_conservacion)} readonly size="0.9rem" />
                    <span className="ratings-small">{ratings.media_conservacion}</span>
                  </div>
                )}
                {ratings.total_accesibilidad >= 3 && (
                  <div className="ratings-detail-row">
                    <span className="ratings-label">{t('detail.ratingsAccessibility')}</span>
                    <StarRating value={Math.round(ratings.media_accesibilidad)} readonly size="0.9rem" />
                    <span className="ratings-small">{ratings.media_accesibilidad}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="ratings-few">{t('detail.ratingsNotEnough')}</p>
            )}

            {user ? (
              <div className="ratings-form">
                <span className="ratings-form-label">{t('detail.ratingsYours')}</span>
                <div className="ratings-form-row">
                  <span>{t('detail.ratingsGeneral')}</span>
                  <StarRating
                    value={userRating.general}
                    onChange={v => setUserRating(prev => ({ ...prev, general: v }))}
                    size="1.4rem"
                  />
                </div>
                {!showExtraRatings ? (
                  <button className="ratings-more-btn" onClick={() => setShowExtraRatings(true)}>
                    {t('detail.ratingsMore')}
                  </button>
                ) : (
                  <>
                    <div className="ratings-form-row">
                      <span>{t('detail.ratingsConservation')}</span>
                      <StarRating
                        value={userRating.conservacion}
                        onChange={v => setUserRating(prev => ({ ...prev, conservacion: v }))}
                        size="1.2rem"
                      />
                    </div>
                    <div className="ratings-form-row">
                      <span>{t('detail.ratingsAccessibility')}</span>
                      <StarRating
                        value={userRating.accesibilidad}
                        onChange={v => setUserRating(prev => ({ ...prev, accesibilidad: v }))}
                        size="1.2rem"
                      />
                    </div>
                  </>
                )}
                <button
                  className="btn btn-primary ratings-submit"
                  onClick={handleSubmitRating}
                  disabled={!userRating.general || ratingSubmitting}
                >
                  {ratingSubmitting ? t('detail.ratingsSaving') : t('detail.ratingsSave')}
                </button>
                {ratingMsg && <span className="ratings-msg">{ratingMsg}</span>}
              </div>
            ) : (
              <p className="ratings-login-hint">
                <Link to="/login">{t('detail.ratingsLoginHint')}</Link>
              </p>
            )}
          </section>

          {/* User notes */}
          <section className="detail-section">
            <h2>{t('detail.userNotes')}</h2>
            {user && (
              <div className="notas-form">
                <div className="notas-form-top">
                  <select value={notaTipo} onChange={e => setNotaTipo(e.target.value)}>
                    <option value="nota">{t('detail.notaTypeNota')}</option>
                    <option value="horario">{t('detail.notaTypeHorario')}</option>
                    <option value="precio">{t('detail.notaTypePrecio')}</option>
                  </select>
                  <input
                    type="text"
                    placeholder={
                      notaTipo === 'horario' ? t('detail.notaPlaceholderHorario') :
                      notaTipo === 'precio' ? t('detail.notaPlaceholderPrecio') :
                      t('detail.notaPlaceholderNota')
                    }
                    value={notaText}
                    onChange={e => setNotaText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && notaText.trim()) handleSubmitNota(); }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleSubmitNota}
                    disabled={!notaText.trim() || notaSubmitting}
                  >
                    {t('detail.notaSubmit')}
                  </button>
                </div>
              </div>
            )}
            <div className="notas-list">
              {notas.map(n => (
                <div key={n.id} className={`nota-item nota-tipo-${n.tipo}`}>
                  <div className="nota-header">
                    <span className={`nota-tipo-badge nota-badge-${n.tipo}`}>
                      {n.tipo === 'horario' ? t('detail.notaTypeHorario') :
                       n.tipo === 'precio' ? t('detail.notaTypePrecio') :
                       t('detail.notaTypeNota')}
                    </span>
                    <span className="nota-author">
                      {n.usuario_nombre || n.usuario_email}
                      {(n.usuario_rol === 'admin' || n.usuario_rol === 'colaborador') && (
                        <span className={`nota-rol-badge nota-rol-${n.usuario_rol}`}>
                          {n.usuario_rol}
                        </span>
                      )}
                    </span>
                    <span className="nota-date">{new Date(n.created_at).toLocaleDateString()}</span>
                    {user && (user.id === n.usuario_id || user.rol === 'admin') && (
                      <button className="nota-delete" onClick={() => handleDeleteNota(n.id)}>&times;</button>
                    )}
                  </div>
                  <p className="nota-text">{n.texto}</p>
                </div>
              ))}
              {notas.length === 0 && (
                <p className="notas-empty">{t('detail.notasEmpty')}</p>
              )}
            </div>
          </section>
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
