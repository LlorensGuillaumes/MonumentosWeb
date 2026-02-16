import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getMonumentos } from '../services/api';
import MonumentoCard from '../components/MonumentoCard';
import Map from '../components/Map';
import NewsletterForm from '../components/NewsletterForm';
import MonumentOfDay from '../components/MonumentOfDay';
import NearbyMonuments from '../components/NearbyMonuments';
import './Home.css';

export default function Home() {
  const { stats } = useApp();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
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
      <Helmet>
        <title>{t('home.heroTitle')} - Patrimonio Europeo</title>
        <meta name="description" content={t('home.heroSubtitle', { count: stats?.total?.toLocaleString() || '100,000' })} />
      </Helmet>
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

      {/* CTA Banner for non-logged users */}
      {!user && (
        <section className="cta-banner">
          <div className="cta-content">
            <h2>{t('home.ctaTitle')}</h2>
            <p>{t('home.ctaText')}</p>
            <Link to="/login" className="btn btn-primary btn-lg">{t('home.ctaButton')}</Link>
          </div>
        </section>
      )}

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

      {/* Features Section */}
      <section className="features-section">
        <h2>{t('home.whyUseTitle')}</h2>
        <div className="features-grid">
          <div className="feature-card">
            <span className="feature-icon">&#128270;</span>
            <h3>{t('home.feature1Title')}</h3>
            <p>{t('home.feature1Desc')}</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">&#128506;</span>
            <h3>{t('home.feature2Title')}</h3>
            <p>{t('home.feature2Desc')}</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">&#128247;</span>
            <h3>{t('home.feature3Title')}</h3>
            <p>{t('home.feature3Desc')}</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">&#127760;</span>
            <h3>{t('home.feature4Title')}</h3>
            <p>{t('home.feature4Desc')}</p>
          </div>
        </div>
      </section>

      {/* Monument of the Day */}
      <MonumentOfDay />

      {/* Nearby Monuments */}
      <NearbyMonuments />

      {/* Map Preview */}
      <section className="map-section">
        <h2>{t('home.heritageMap')}</h2>
        <Map
          height="400px"
          filters={{ limit: 2000 }}
          onMarkerClick={!user ? () => navigate('/login') : undefined}
        />
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

      {/* Testimonials */}
      <section className="testimonials-section">
        <h2>{t('home.testimonialsTitle')}</h2>
        <div className="testimonials-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="testimonial-card">
              <p className="testimonial-text">{t(`home.testimonial${i}`)}</p>
              <div className="testimonial-author">
                <strong>{t(`home.testimonial${i}Author`)}</strong>
                <span>{t(`home.testimonial${i}Role`)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <NewsletterForm variant="home" />

      {/* Pricing preview for non-logged users */}
      {!user && (
        <section className="pricing-preview">
          <h2>{t('home.pricingPreviewTitle')}</h2>
          <p>{t('home.pricingPreviewDesc')}</p>
          <Link to="/precios" className="btn btn-primary btn-lg">{t('home.pricingPreviewCTA')}</Link>
        </section>
      )}

      {/* Regions Section grouped by country */}
      {stats?.por_region && (() => {
        const flags = { 'España': '🇪🇸', 'Italia': '🇮🇹', 'Francia': '🇫🇷', 'Portugal': '🇵🇹' };
        const countryOrder = ['España', 'Italia', 'Francia', 'Portugal'];
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
