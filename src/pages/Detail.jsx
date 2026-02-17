import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { getMonumento, getMonumentos, getMonumentosRadio, getWikipediaExtract, getValoraciones, addValoracion, getNotasMonumento, addNotaMonumento, deleteNotaMonumento } from '../services/api';
import PhotoUpload from '../components/PhotoUpload';
import { useAuth } from '../context/AuthContext';
import { DetailSkeleton } from '../components/Skeleton';
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

  // Share
  const [copied, setCopied] = useState(false);

  // Related monuments
  const [relatedMonuments, setRelatedMonuments] = useState([]);

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

  // Load related monuments
  useEffect(() => {
    if (!monumento) return;
    setRelatedMonuments([]);
    const fetchRelated = async () => {
      try {
        let items = [];
        if (monumento.estilo) {
          const data = await getMonumentos({ estilo: monumento.estilo, limit: 5 });
          items = data.items || [];
        } else if (monumento.categoria && monumento.comunidad_autonoma) {
          const data = await getMonumentos({ categoria: monumento.categoria, region: monumento.comunidad_autonoma, limit: 5 });
          items = data.items || [];
        } else if (monumento.latitud && monumento.longitud) {
          const data = await getMonumentosRadio({ lat: monumento.latitud, lng: monumento.longitud, km: 30, limit: 5 });
          items = data.items || [];
        }
        setRelatedMonuments(items.filter(m => m.id !== monumento.id).slice(0, 4));
      } catch { /* ignore */ }
    };
    fetchRelated();
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
    return <DetailSkeleton />;
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

  const metaDesc = [monumento.categoria, monumento.municipio, monumento.provincia, monumento.comunidad_autonoma].filter(Boolean).join(', ');

  return (
    <div className="detail-page">
      <Helmet>
        <title>{monumento.denominacion} - Patrimonio Europeo</title>
        <meta name="description" content={`${monumento.denominacion} - ${metaDesc}`} />
        <meta property="og:title" content={monumento.denominacion} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={window.location.href} />
        {monumento.imagen_url && <meta property="og:image" content={monumento.imagen_url} />}
        <meta name="twitter:card" content={monumento.imagen_url ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={monumento.denominacion} />
        <meta name="twitter:description" content={metaDesc} />
        {monumento.imagen_url && <meta name="twitter:image" content={monumento.imagen_url} />}
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'LandmarkOrHistoricalBuilding',
          name: monumento.denominacion,
          description: monumento.descripcion_completa || monumento.wiki_descripcion || metaDesc,
          ...(monumento.imagen_url && { image: monumento.imagen_url }),
          ...(hasLocation && { geo: { '@type': 'GeoCoordinates', latitude: monumento.latitud, longitude: monumento.longitud } }),
          address: {
            '@type': 'PostalAddress',
            ...(monumento.municipio && { addressLocality: monumento.municipio }),
            ...(monumento.provincia && { addressRegion: monumento.provincia }),
            ...(monumento.pais && { addressCountry: monumento.pais }),
          },
          ...(monumento.wikipedia_url && { sameAs: monumento.wikipedia_url }),
          ...(monumento.inception && { foundingDate: monumento.inception }),
          ...(monumento.arquitecto && { founder: { '@type': 'Person', name: monumento.arquitecto } }),
        })}</script>
      </Helmet>
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

          {/* Share */}
          <div className="detail-share">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(monumento.denominacion + ' - ' + window.location.href)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="share-btn share-whatsapp"
              title="WhatsApp"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(monumento.denominacion)}&url=${encodeURIComponent(window.location.href)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="share-btn share-twitter"
              title="X / Twitter"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="share-btn share-facebook"
              title="Facebook"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <button
              className="share-btn share-copy"
              title={t('detail.copyLink')}
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              )}
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
            {monumento.tipo_monumento && (
              <span className="tag tag-monument-type">{monumento.tipo_monumento}</span>
            )}
            {monumento.estilo && (
              <span className="tag tag-style">{monumento.estilo}</span>
            )}
            {monumento.periodo && (
              <span className="tag tag-period">{monumento.periodo}</span>
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
                      loading="lazy"
                      className={selectedImage === img.url ? 'active' : ''}
                      onClick={() => setSelectedImage(img.url)}
                      onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* User Photos */}
          <PhotoUpload bienId={monumento.id} />

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

          {/* Related monuments */}
          {relatedMonuments.length > 0 && (
            <section className="detail-section">
              <h2>{t('detail.relatedMonuments')}</h2>
              <div className="related-grid">
                {relatedMonuments.map(rm => (
                  <Link key={rm.id} to={`/monumento/${rm.id}`} className="related-card">
                    <img
                      src={rm.imagen_url || '/no-image.svg'}
                      alt=""
                      loading="lazy"
                      onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }}
                    />
                    <div className="related-card-info">
                      <strong>{rm.denominacion}</strong>
                      <span>{rm.municipio}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Ratings - hide if no ratings and no user */}
          {(ratings?.total > 0 || user) && (
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
              ) : user ? (
                <p className="section-cta">{t('detail.beFirstToRate')}</p>
              ) : null}

              {user && (
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
              )}
            </section>
          )}

          {/* User notes - hide if no notes and no user */}
          {(notas.length > 0 || user) && (
            <section className="detail-section">
              <h2>{t('detail.userNotes')}</h2>
              {user && (
                <div className="notas-form">
                  {notas.length === 0 && (
                    <p className="section-cta">{t('detail.beFirstNote')}</p>
                  )}
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
              </div>
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
