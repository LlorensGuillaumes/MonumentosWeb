import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import api from '../services/api';
import MapView from '../components/Map';
import './AutorDetail.css';

export default function AutorDetail() {
  const { qid } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [bienes, setBienes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    let alive = true;
    const lang = (i18n.language || 'es').split('-')[0];
    const load = async () => {
      setLoading(true);
      const [inf, bs] = await Promise.all([
        api.get(`/personas/${qid}/info`, { params: { lang } }).then(r => r.data).catch(() => null),
        api.get(`/personas/${qid}/bienes`, { params: { orden: 'relevancia' } }).then(r => r.data.bienes || []).catch(() => []),
      ]);
      if (!alive) return;
      setInfo(inf);
      setBienes(bs);
      setLoading(false);
    };
    load();
    return () => { alive = false; };
  }, [qid, i18n.language]);

  const year = (iso) => (iso ? String(iso).slice(0, 4) : null);
  const nac = year(info?.nacimiento);
  const def = year(info?.defuncion);

  const mapMarkers = useMemo(() =>
    bienes
      .filter(b => b.latitud != null && b.longitud != null)
      .map((b, i) => ({
        id: b.id, n: i + 1, lat: b.latitud, lng: b.longitud,
        denominacion: b.denominacion, municipio: b.municipio, tipo: b.tipo_monumento,
      })),
    [bienes]);

  const nombre = info?.nombre || bienes[0]?.persona || qid;

  return (
    <div className="autor-detail-page">
      <Helmet><title>{nombre} - Patrimonio Europeo</title></Helmet>

      <nav className="breadcrumb">
        <button className="back-btn" onClick={() => navigate(-1)}>← {t('detail.back')}</button>
      </nav>

      {loading ? (
        <div className="autor-detail-loading">{t('autores.loadingObras', 'Cargando…')}</div>
      ) : (
        <>
          <header className="autor-detail-head">
            {info?.imagen && (
              <img className="autor-detail-img" src={info.imagen} alt={nombre}
                onError={e => { e.target.style.display = 'none'; }} />
            )}
            <div className="autor-detail-meta">
              <h1>{nombre}</h1>
              {info?.descripcion && <p className="autor-detail-desc">{info.descripcion}</p>}
              <div className="autor-detail-facts">
                {(nac || def) && <span>📅 {nac || '?'}{def ? ` – ${def}` : ''}</span>}
                {info?.lugar_nacimiento && <span>📍 {info.lugar_nacimiento}</span>}
                {info?.pais && <span>🏳️ {info.pais}</span>}
                <span>🏛️ {bienes.length} {t('autores.bienes', 'obras')}</span>
              </div>
            </div>
          </header>

          {info?.biografia && (
            <section className="autor-detail-bio">
              <h2>{t('autorDetail.biography', 'Biografía')}</h2>
              <p>{info.biografia}</p>
              {info.wikipedia_url && (
                <a href={info.wikipedia_url} target="_blank" rel="noopener noreferrer">
                  {t('autorDetail.wikipedia', 'Leer en Wikipedia')} ↗
                </a>
              )}
            </section>
          )}

          <section className="autor-detail-obras">
            <div className="autor-detail-obras-head">
              <h2>{t('autorDetail.works', 'Obras')} ({bienes.length})</h2>
              {mapMarkers.length > 0 && (
                <button className="autores-map-toggle" onClick={() => setShowMap(s => !s)}>
                  {showMap ? t('autores.hideMap', 'Ocultar mapa') : `${t('autores.viewMap', 'Ver en mapa')} (${mapMarkers.length})`}
                </button>
              )}
            </div>
            {showMap && (
              <div className="autor-detail-map">
                <MapView extraMarkers={mapMarkers} fitToExtra height="420px" showCCAASummary={false} onlyExtraMarkers />
              </div>
            )}
            <ul className="autor-detail-list">
              {bienes.map(b => (
                <li key={b.id}>
                  {b.imagen_url && <img src={b.imagen_url} alt={b.denominacion} loading="lazy" onError={e => { e.target.style.display = 'none'; }} />}
                  <div className="autor-detail-list-info">
                    <Link to={`/monumento/${b.id}`} className="autor-detail-list-nombre">{b.denominacion}</Link>
                    <div className="autor-detail-list-meta">
                      {[b.municipio, b.provincia, b.pais].filter(Boolean).join(' · ')}
                    </div>
                    {(b.tipo_monumento || b.periodo) && (
                      <div className="autor-detail-list-meta">
                        {b.tipo_monumento}{b.tipo_monumento && b.periodo ? ' · ' : ''}{b.periodo}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
