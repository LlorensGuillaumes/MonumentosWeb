import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';
import { activateTrial, getAdminSettings } from '../services/api';
import './Pricing.css';

const PLAN_FEATURES = {
  free: [
    'pricing.features.search',
    'pricing.features.favorites',
    'pricing.features.map',
    'pricing.features.share',
    'pricing.features.compare',
  ],
  basic: [
    'pricing.features.allFree',
    'pricing.features.routes5',
    'pricing.features.gpxKml',
    'pricing.features.ratings',
    'pricing.features.notes',
    'pricing.features.proposals',
  ],
  premium: [
    'pricing.features.allBasic',
    'pricing.features.routesUnlimited',
    'pricing.features.pdf',
    'pricing.features.optimize',
    'pricing.features.priority',
    'pricing.features.earlyAccess',
  ],
};

const DEFAULT_PRICES = {
  price_basic_monthly: 1.99,
  price_basic_yearly: 12.99,
  price_premium_monthly: 2.99,
  price_premium_yearly: 19.99,
};

function buildPlans(prices) {
  return [
    { id: 'free', icon: '🏛️', features: PLAN_FEATURES.free },
    { id: 'basic', popular: true, icon: '🗺️', priceMonthly: prices.price_basic_monthly, priceYearly: prices.price_basic_yearly, features: PLAN_FEATURES.basic },
    { id: 'premium', icon: '👑', priceMonthly: prices.price_premium_monthly, priceYearly: prices.price_premium_yearly, features: PLAN_FEATURES.premium },
  ];
}

const COMPARISON_FEATURES = [
  { key: 'search', free: true, basic: true, premium: true },
  { key: 'favorites', free: true, basic: true, premium: true },
  { key: 'mapView', free: true, basic: true, premium: true },
  { key: 'share', free: true, basic: true, premium: true },
  { key: 'compare', free: true, basic: true, premium: true },
  { key: 'curatedRoutes', free: true, basic: true, premium: true },
  { key: 'customRoutes', free: false, basic: '5', premium: '∞' },
  { key: 'gpxKmlExport', free: false, basic: true, premium: true },
  { key: 'pdfExport', free: false, basic: false, premium: true },
  { key: 'routeOptimize', free: false, basic: false, premium: true },
  { key: 'ratingsNotes', free: false, basic: true, premium: true },
  { key: 'photoUpload', free: false, basic: true, premium: true },
  { key: 'diary', free: false, basic: true, premium: true },
  { key: 'proposeSites', free: false, basic: true, premium: true },
  { key: 'prioritySupport', free: false, basic: false, premium: true },
  { key: 'earlyAccess', free: false, basic: false, premium: true },
];

export default function Pricing() {
  const { t } = useTranslation();
  const { user, isPremium } = useAuth();
  const [yearly, setYearly] = useState(true);
  const [trialActivating, setTrialActivating] = useState(false);
  const [trialMsg, setTrialMsg] = useState('');
  const [prices, setPrices] = useState(DEFAULT_PRICES);

  useEffect(() => {
    getAdminSettings()
      .then(data => {
        const p = {};
        if (data.price_basic_monthly != null) p.price_basic_monthly = data.price_basic_monthly;
        if (data.price_basic_yearly != null) p.price_basic_yearly = data.price_basic_yearly;
        if (data.price_premium_monthly != null) p.price_premium_monthly = data.price_premium_monthly;
        if (data.price_premium_yearly != null) p.price_premium_yearly = data.price_premium_yearly;
        if (Object.keys(p).length) setPrices(prev => ({ ...prev, ...p }));
      })
      .catch(() => {});
  }, []);

  const plans = buildPlans(prices);

  const handleActivateTrial = async () => {
    setTrialActivating(true);
    setTrialMsg('');
    try {
      await activateTrial();
      setTrialMsg(t('pricing.trialActivated'));
    } catch (err) {
      setTrialMsg(err.response?.data?.error || t('pricing.trialError'));
    } finally {
      setTrialActivating(false);
    }
  };

  return (
    <div className="pricing-page">
      <Helmet>
        <title>{t('pricing.title')} - Patrimonio Europeo</title>
      </Helmet>

      <div className="pricing-header">
        <h1>{t('pricing.title')}</h1>
        <p>{t('pricing.subtitle')}</p>

        <div className="pricing-toggle">
          <span className={!yearly ? 'active' : ''}>{t('pricing.monthly')}</span>
          <button
            className={`toggle-switch ${yearly ? 'on' : ''}`}
            onClick={() => setYearly(!yearly)}
            aria-label="Toggle billing period"
          >
            <span className="toggle-knob" />
          </button>
          <span className={yearly ? 'active' : ''}>
            {t('pricing.yearly')}
            <span className="save-badge">{t('pricing.save20')}</span>
          </span>
        </div>
      </div>

      <div className="pricing-grid">
        {plans.map(plan => (
          <div key={plan.id} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
            {plan.popular && <div className="popular-badge">{t('pricing.popular')}</div>}
            <div className="plan-icon">{plan.icon}</div>
            <h2>{t(`pricing.plans.${plan.id}`)}</h2>
            <p className="plan-desc">{t(`pricing.plans.${plan.id}Desc`)}</p>

            <div className="plan-price">
              {plan.priceMonthly ? (
                <>
                  <span className="price-amount">
                    {yearly ? plan.priceYearly : plan.priceMonthly}€
                  </span>
                  <span className="price-period">/ {t('pricing.month')}</span>
                  {yearly && (
                    <span className="price-billed">
                      {t('pricing.billedYearly', { amount: (plan.priceYearly * 12).toFixed(0) })}
                    </span>
                  )}
                </>
              ) : (
                <span className="price-free">{t('pricing.free')}</span>
              )}
            </div>

            <ul className="plan-features">
              {plan.features.map(f => (
                <li key={f}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.3 4.3L6 11.6L2.7 8.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t(f)}
                </li>
              ))}
            </ul>

            <div className="plan-cta">
              {plan.id === 'free' ? (
                user ? (
                  <span className="plan-current">{t('pricing.currentPlan')}</span>
                ) : (
                  <Link to="/login" className="btn btn-secondary">{t('pricing.signUpFree')}</Link>
                )
              ) : user && !isPremium ? (
                <button className="btn btn-primary" onClick={handleActivateTrial} disabled={trialActivating}>
                  {trialActivating ? '...' : t('pricing.startTrial')}
                </button>
              ) : (
                <button className="btn btn-primary" disabled>
                  {t('pricing.comingSoon')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Trial banner */}
      {user && !isPremium && (
        <div className="trial-banner">
          <div className="trial-banner-content">
            <h3>{t('pricing.trialTitle')}</h3>
            <p>{t('pricing.trialDesc')}</p>
            {trialMsg && <p className={`trial-msg ${trialMsg.includes('Error') ? 'error' : 'success'}`}>{trialMsg}</p>}
          </div>
          <button className="btn btn-primary btn-lg" onClick={handleActivateTrial} disabled={trialActivating}>
            {trialActivating ? '...' : t('pricing.startTrial')}
          </button>
        </div>
      )}

      {/* Feature comparison table */}
      <div className="pricing-comparison">
        <h2>{t('pricing.comparisonTitle')}</h2>
        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>{t('pricing.feature')}</th>
                <th>{t('pricing.plans.free')}</th>
                <th className="highlight">{t('pricing.plans.basic')}</th>
                <th>{t('pricing.plans.premium')}</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_FEATURES.map(f => (
                <tr key={f.key}>
                  <td>{t(`pricing.compare.${f.key}`)}</td>
                  {['free', 'basic', 'premium'].map(plan => {
                    const val = f[plan];
                    return (
                      <td key={plan} className={plan === 'basic' ? 'highlight' : ''}>
                        {val === true ? (
                          <span className="check">✓</span>
                        ) : val === false ? (
                          <span className="cross">—</span>
                        ) : (
                          <span className="value">{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pricing-faq">
        <h2>{t('pricing.faqTitle')}</h2>
        <div className="faq-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="faq-item">
              <h3>{t(`pricing.faq${i}Q`)}</h3>
              <p>{t(`pricing.faq${i}A`)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
