import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './PremiumCTA.css';

export default function PremiumCTA({ compact = false }) {
  const { t } = useTranslation();

  if (compact) {
    return (
      <Link to="/precios" className="premium-cta-compact">
        <span className="premium-cta-icon">&#11088;</span>
        <span>{t('premium.upgradeShort')}</span>
      </Link>
    );
  }

  return (
    <div className="premium-cta">
      <div className="premium-cta-content">
        <span className="premium-cta-icon">&#11088;</span>
        <div>
          <strong>{t('premium.title')}</strong>
          <p>{t('premium.description')}</p>
        </div>
      </div>
      <Link to="/precios" className="btn btn-primary premium-cta-btn">
        {t('premium.seePlans')}
      </Link>
    </div>
  );
}
