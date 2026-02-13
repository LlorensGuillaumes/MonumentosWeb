import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getRutas, deleteRuta, getRutaPdfUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './MyRoutes.css';

export default function MyRoutes() {
  const { t } = useTranslation();
  const { isPremium } = useAuth();
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    getRutas()
      .then(setRutas)
      .catch(() => setRutas([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm(t('myRoutes.confirmDelete'))) return;
    setDeleting(id);
    try {
      await deleteRuta(id);
      setRutas(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <div className="loading">{t('detail.loading')}</div>;
  }

  return (
    <div className="my-routes">
      <div className="my-routes-header">
        <h1>{t('myRoutes.title')}</h1>
        <Link to="/rutas" className="btn btn-primary">
          {t('myRoutes.createNew')}
        </Link>
      </div>

      {!isPremium && (
        <div className="premium-banner">
          <span className="premium-icon">&#11088;</span>
          <div>
            <strong>{t('myRoutes.premiumTitle')}</strong>
            <p>{t('myRoutes.premiumDesc')}</p>
          </div>
        </div>
      )}

      {rutas.length === 0 ? (
        <div className="my-routes-empty">
          <p>{t('myRoutes.empty')}</p>
          <Link to="/rutas" className="btn btn-primary">
            {t('myRoutes.createFirst')}
          </Link>
        </div>
      ) : (
        <div className="my-routes-list">
          {rutas.map(ruta => (
            <div key={ruta.id} className="my-route-card">
              <div className="my-route-info">
                <h3>{ruta.nombre}</h3>
                <div className="my-route-meta">
                  <span>{new Date(ruta.created_at).toLocaleDateString()}</span>
                  {ruta.radio_km && <span>{ruta.radio_km} km {t('myRoutes.radius')}</span>}
                </div>
              </div>
              <div className="my-route-actions">
                {isPremium && (
                  <a
                    href={getRutaPdfUrl(ruta.id)}
                    className="btn btn-outline btn-sm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    PDF
                  </a>
                )}
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(ruta.id)}
                  disabled={deleting === ruta.id}
                >
                  {deleting === ruta.id ? '...' : t('myRoutes.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
