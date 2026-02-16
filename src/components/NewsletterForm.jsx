import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './NewsletterForm.css';

export default function NewsletterForm({ variant = 'default' }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      // Store locally until backend endpoint exists
      const subs = JSON.parse(localStorage.getItem('newsletter_subs') || '[]');
      if (!subs.includes(email)) {
        subs.push(email);
        localStorage.setItem('newsletter_subs', JSON.stringify(subs));
      }
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className={`newsletter-form ${variant}`}>
        <p className="newsletter-success">{t('newsletter.success')}</p>
      </div>
    );
  }

  return (
    <div className={`newsletter-form ${variant}`}>
      {variant === 'home' && (
        <>
          <h3>{t('newsletter.title')}</h3>
          <p>{t('newsletter.subtitle')}</p>
        </>
      )}
      <form onSubmit={handleSubmit} className="newsletter-input-group">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={t('newsletter.placeholder')}
          required
        />
        <button type="submit" className="btn btn-primary" disabled={status === 'loading'}>
          {status === 'loading' ? t('newsletter.subscribing') : t('newsletter.subscribe')}
        </button>
      </form>
      {status === 'error' && <p className="newsletter-error">{t('newsletter.error')}</p>}
    </div>
  );
}
