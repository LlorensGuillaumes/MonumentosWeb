import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { getUserStats } from '../services/api';
import './UserStats.css';

export default function UserStats() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="user-stats-page">
        <h1>{t('userStats.title')}</h1>
        <div className="user-stats-loading">{t('detail.loading')}</div>
      </div>
    );
  }

  // Fallback with empty data if API not ready
  const s = stats || {
    favorites_count: 0,
    routes_count: 0,
    proposals_count: 0,
    diary_count: 0,
    ratings_count: 0,
    notes_count: 0,
    photos_count: 0,
    countries_visited: [],
    regions_visited: [],
    member_since: null,
  };

  return (
    <div className="user-stats-page">
      <Helmet>
        <title>{t('userStats.title')} - Patrimonio Europeo</title>
      </Helmet>

      <h1>{t('userStats.title')}</h1>

      <div className="stats-cards">
        <div className="stat-card-item">
          <span className="stat-card-icon">❤️</span>
          <span className="stat-card-value">{s.favorites_count}</span>
          <span className="stat-card-label">{t('userStats.favorites')}</span>
        </div>
        <div className="stat-card-item">
          <span className="stat-card-icon">🗺️</span>
          <span className="stat-card-value">{s.routes_count}</span>
          <span className="stat-card-label">{t('userStats.routes')}</span>
        </div>
        <div className="stat-card-item">
          <span className="stat-card-icon">📔</span>
          <span className="stat-card-value">{s.diary_count}</span>
          <span className="stat-card-label">{t('userStats.diaryEntries')}</span>
        </div>
        <div className="stat-card-item">
          <span className="stat-card-icon">⭐</span>
          <span className="stat-card-value">{s.ratings_count}</span>
          <span className="stat-card-label">{t('userStats.ratings')}</span>
        </div>
        <div className="stat-card-item">
          <span className="stat-card-icon">📝</span>
          <span className="stat-card-value">{s.notes_count}</span>
          <span className="stat-card-label">{t('userStats.notes')}</span>
        </div>
        <div className="stat-card-item">
          <span className="stat-card-icon">📷</span>
          <span className="stat-card-value">{s.photos_count}</span>
          <span className="stat-card-label">{t('userStats.photos')}</span>
        </div>
        <div className="stat-card-item">
          <span className="stat-card-icon">💡</span>
          <span className="stat-card-value">{s.proposals_count}</span>
          <span className="stat-card-label">{t('userStats.proposals')}</span>
        </div>
        <div className="stat-card-item">
          <span className="stat-card-icon">🌍</span>
          <span className="stat-card-value">{(s.regions_visited || []).length}</span>
          <span className="stat-card-label">{t('userStats.regionsVisited')}</span>
        </div>
      </div>

      {(s.regions_visited || []).length > 0 && (
        <div className="stats-section-block">
          <h2>{t('userStats.regionsExplored')}</h2>
          <div className="stats-tags">
            {s.regions_visited.map(r => (
              <Link key={r} to={`/buscar?region=${encodeURIComponent(r)}`} className="stats-tag">
                {r}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="stats-actions">
        <Link to="/favoritos" className="btn btn-outline">{t('userStats.viewFavorites')}</Link>
        <Link to="/mis-rutas" className="btn btn-outline">{t('userStats.viewRoutes')}</Link>
        <Link to="/diario" className="btn btn-outline">{t('userStats.viewDiary')}</Link>
      </div>
    </div>
  );
}
