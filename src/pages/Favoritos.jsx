import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getFavoritos } from '../services/api';
import MonumentoCard from '../components/MonumentoCard';
import './Favoritos.css';

export default function Favoritos() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setLoading(true);
    getFavoritos({ page, limit: 24 })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, page, navigate]);

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
          <p className="favoritos-count">
            {t('favorites.count', { count: data.total })}
          </p>
          <div className="favoritos-grid">
            {data.items.map((item) => (
              <MonumentoCard key={item.id} monumento={item} />
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
