import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './CookieConsent.css';

const CONSENT_KEY = 'cookie_consent';

export default function CookieConsent() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner">
      <div className="cookie-content">
        <p>{t('cookies.message')}</p>
        <div className="cookie-actions">
          <button className="btn btn-primary cookie-accept" onClick={handleAccept}>
            {t('cookies.accept')}
          </button>
          <button className="btn btn-secondary cookie-reject" onClick={handleReject}>
            {t('cookies.reject')}
          </button>
        </div>
      </div>
    </div>
  );
}
