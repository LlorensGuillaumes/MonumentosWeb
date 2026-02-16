import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMonumentosRadio } from '../services/api';
import './NearbyMonuments.css';

export default function NearbyMonuments() {
  const { t } = useTranslation();
  const [monuments, setMonuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [located, setLocated] = useState(false);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError(t('nearby.noGeolocation'));
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const data = await getMonumentosRadio({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            km: 25,
            limit: 12,
          });
          setMonuments(data.items || []);
          setLocated(true);
        } catch {
          setError(t('nearby.error'));
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError(t('nearby.denied'));
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  if (!located) {
    return (
      <section className="nearby">
        <h2>{t('nearby.title')}</h2>
        <p className="nearby-desc">{t('nearby.description')}</p>
        <button className="btn btn-primary nearby-locate-btn" onClick={handleLocate} disabled={loading}>
          {loading ? (
            <>{t('nearby.locating')}</>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
              </svg>
              {t('nearby.locateMe')}
            </>
          )}
        </button>
        {error && <p className="nearby-error">{error}</p>}
      </section>
    );
  }

  return (
    <section className="nearby">
      <h2>{t('nearby.title')}</h2>
      {monuments.length === 0 ? (
        <p className="nearby-empty">{t('nearby.noResults')}</p>
      ) : (
        <div className="nearby-grid">
          {monuments.map(m => (
            <Link key={m.id} to={`/monumento/${m.id}`} className="nearby-card">
              <img
                src={m.imagen_url || '/no-image.svg'}
                alt=""
                loading="lazy"
                onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }}
              />
              <div className="nearby-card-info">
                <strong>{m.denominacion}</strong>
                <span>{m.municipio}</span>
                {m.distancia_km != null && (
                  <span className="nearby-dist">{m.distancia_km.toFixed(1)} km</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
