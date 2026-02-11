import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { getMonumentos } from '../services/api';
import MonumentoCard from '../components/MonumentoCard';
import Map from '../components/Map';
import './Home.css';

export default function Home() {
  const { stats } = useApp();
  const { t } = useTranslation();
  const [destacados, setDestacados] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar monumentos destacados (con imagen de Wikipedia)
    getMonumentos({
      solo_wikidata: true,
      limit: 8,
      page: Math.floor(Math.random() * 100) + 1,
    })
      .then(data => setDestacados(data.items.filter(m => m.imagen_url)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>{t('home.heroTitle')}</h1>
          <p>
            {t('home.heroSubtitle', { count: stats?.total?.toLocaleString() || '100,000' })}
          </p>
          <div className="hero-actions">
            <Link to="/buscar" className="btn btn-primary btn-lg">
              {t('home.exploreMonuments')}
            </Link>
            <Link to="/mapa" className="btn btn-secondary btn-lg">
              {t('home.viewOnMap')}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {stats && (
        <section className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon">🏛️</span>
              <span className="stat-value">{stats.total.toLocaleString()}</span>
              <span className="stat-label">{t('home.monuments')}</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📍</span>
              <span className="stat-value">{stats.con_coordenadas.toLocaleString()}</span>
              <span className="stat-label">{t('home.withLocation')}</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📚</span>
              <span className="stat-value">{stats.con_wikidata.toLocaleString()}</span>
              <span className="stat-label">{t('home.withWikipedia')}</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📷</span>
              <span className="stat-value">{stats.imagenes.toLocaleString()}</span>
              <span className="stat-label">{t('home.images')}</span>
            </div>
          </div>
        </section>
      )}

      {/* Map Preview */}
      <section className="map-section">
        <h2>{t('home.heritageMap')}</h2>
        <Map height="400px" filters={{ limit: 2000 }} />
        <Link to="/mapa" className="btn btn-outline">{t('home.viewFullMap')}</Link>
      </section>

      {/* Featured Section */}
      <section className="featured-section">
        <h2>{t('home.featuredMonuments')}</h2>
        {loading ? (
          <div className="loading">{t('home.loading')}</div>
        ) : (
          <div className="monumentos-grid">
            {destacados.map(m => (
              <MonumentoCard key={m.id} monumento={m} />
            ))}
          </div>
        )}
        <Link to="/buscar" className="btn btn-outline">{t('home.viewAll')}</Link>
      </section>

      {/* Regions Section grouped by country */}
      {stats?.por_region && (() => {
        const flags = { 'España': '🇪🇸', 'Francia': '🇫🇷', 'Portugal': '🇵🇹' };
        const countryOrder = ['España', 'Francia', 'Portugal'];
        const grouped = {};
        for (const r of stats.por_region) {
          if (!r.region) continue;
          const pais = r.pais || 'Otro';
          if (!grouped[pais]) grouped[pais] = [];
          grouped[pais].push(r);
        }
        for (const pais of Object.keys(grouped)) {
          grouped[pais].sort((a, b) => b.total - a.total);
        }
        const sortedCountries = Object.keys(grouped).sort(
          (a, b) => (countryOrder.indexOf(a) !== -1 ? countryOrder.indexOf(a) : 99)
                   - (countryOrder.indexOf(b) !== -1 ? countryOrder.indexOf(b) : 99)
        );
        return (
          <section className="regions-section">
            <h2>{t('home.exploreByRegion')}</h2>
            {sortedCountries.map(pais => (
              <div key={pais} className="country-regions">
                <h3 className="country-regions-header">
                  <span className="country-flag">{flags[pais] || '🌍'}</span>
                  {pais}
                  <span className="country-regions-count">
                    {grouped[pais].reduce((s, r) => s + r.total, 0).toLocaleString()} {t('home.monuments').toLowerCase()}
                  </span>
                </h3>
                <div className="regions-grid">
                  {grouped[pais].map(r => (
                    <Link
                      key={`${r.pais}-${r.region}`}
                      to={`/buscar?region=${encodeURIComponent(r.region)}${r.pais ? `&pais=${encodeURIComponent(r.pais)}` : ''}`}
                      className="region-card"
                    >
                      <span className="region-name">{r.region}</span>
                      <span className="region-count">{t('home.monumentsCount', { count: r.total.toLocaleString() })}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>
        );
      })()}
    </div>
  );
}
