import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getFavoritos } from '../services/api';
import MonumentoCard from '../components/MonumentoCard';
import './Favoritos.css';

function exportFavoritesCSV(items) {
  const header = 'Nombre,Municipio,Provincia,Region,Pais,Categoria,Estilo,Latitud,Longitud';
  const esc = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const rows = items.map(m =>
    [m.denominacion, m.municipio, m.provincia, m.comunidad_autonoma, m.pais, m.categoria, m.estilo, m.latitud, m.longitud].map(esc).join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'favoritos.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Favoritos() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, toggleFavorito } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [removing, setRemoving] = useState(null);

  const reload = () => {
    setLoading(true);
    getFavoritos({ page, limit: 24 })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    reload();
  }, [user, page, navigate]);

  const handleRemove = async (id) => {
    setRemoving(id);
    await toggleFavorito(id);
    setData(prev => {
      if (!prev) return prev;
      const items = prev.items.filter(m => m.id !== id);
      return { ...prev, items, total: prev.total - 1 };
    });
    setRemoving(null);
  };

  if (!user) return null;

  return (
    <div className="favoritos-page">
      <h1>{t('favorites.title')}</h1>

      {loading && <div className="loading">{t('detail.loading')}</div>}

      {!loading && data && data.items.length === 0 && (
        <div className="favoritos-empty">
          <p>{t('favorites.empty')}</p>
          <Link to="/buscar" className="btn btn-primary">
            {t('favorites.explore')}
          </Link>
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <>
          <div className="favoritos-toolbar">
            <p className="favoritos-count">
              {t('favorites.count', { count: data.total })}
            </p>
            <button className="btn btn-outline btn-sm" onClick={() => exportFavoritesCSV(data.items)}>
              {t('favorites.exportCSV')}
            </button>
          </div>
          <div className="favoritos-grid">
            {data.items.map((item) => (
              <div key={item.id} className="favorito-item">
                <MonumentoCard monumento={item} />
                <button
                  className="favorito-remove-btn"
                  disabled={removing === item.id}
                  onClick={() => handleRemove(item.id)}
                  title={t('favorites.remove')}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {data.pages > 1 && (
            <div className="favoritos-pagination">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page <= 1}
                className="btn btn-outline"
              >
                {t('search.previous')}
              </button>
              <span>{page} / {data.pages}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= data.pages}
                className="btn btn-outline"
              >
                {t('search.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
