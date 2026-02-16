import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMonumentos } from '../services/api';
import './MonumentOfDay.css';

export default function MonumentOfDay() {
  const { t } = useTranslation();
  const [monument, setMonument] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use date as seed for consistent daily rotation
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const page = (seed % 500) + 1;

    getMonumentos({ solo_wikidata: true, solo_imagen: true, limit: 1, page })
      .then(data => {
        if (data.items?.length > 0) {
          setMonument(data.items[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !monument) return null;

  return (
    <section className="motd">
      <div className="motd-badge">{t('monumentOfDay.badge')}</div>
      <Link to={`/monumento/${monument.id}`} className="motd-card">
        <div className="motd-image">
          <img
            src={monument.imagen_url}
            alt={monument.denominacion}
            onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }}
          />
          <div className="motd-overlay">
            <h3>{monument.denominacion}</h3>
            <p>{[monument.municipio, monument.provincia, monument.comunidad_autonoma].filter(Boolean).join(', ')}</p>
            {monument.categoria && <span className="motd-tag">{monument.categoria}</span>}
          </div>
        </div>
      </Link>
    </section>
  );
}
