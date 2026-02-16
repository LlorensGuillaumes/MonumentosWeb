import { useTranslation } from 'react-i18next';
import './UserBadges.css';

const BADGES = [
  { id: 'explorer', icon: '&#128065;', key: 'badges.explorer', condition: (s) => s.favorites >= 5 },
  { id: 'collector', icon: '&#11088;', key: 'badges.collector', condition: (s) => s.favorites >= 25 },
  { id: 'traveler', icon: '&#128506;', key: 'badges.traveler', condition: (s) => s.routes >= 1 },
  { id: 'navigator', icon: '&#129517;', key: 'badges.navigator', condition: (s) => s.routes >= 5 },
  { id: 'critic', icon: '&#128172;', key: 'badges.critic', condition: (s) => s.ratings >= 5 },
  { id: 'contributor', icon: '&#128221;', key: 'badges.contributor', condition: (s) => s.proposals >= 1 },
  { id: 'ambassador', icon: '&#127942;', key: 'badges.ambassador', condition: (s) => s.proposals >= 5 },
];

export default function UserBadges({ stats }) {
  const { t } = useTranslation();

  const earned = BADGES.filter(b => b.condition(stats));
  const locked = BADGES.filter(b => !b.condition(stats));

  if (earned.length === 0 && locked.length === 0) return null;

  return (
    <div className="user-badges">
      <h3>{t('badges.title')}</h3>
      <div className="badges-grid">
        {earned.map(b => (
          <div key={b.id} className="badge-item earned" title={t(b.key + 'Desc')}>
            <span className="badge-icon" dangerouslySetInnerHTML={{ __html: b.icon }} />
            <span className="badge-name">{t(b.key)}</span>
          </div>
        ))}
        {locked.map(b => (
          <div key={b.id} className="badge-item locked" title={t(b.key + 'Desc')}>
            <span className="badge-icon" dangerouslySetInnerHTML={{ __html: b.icon }} />
            <span className="badge-name">{t(b.key)}</span>
          </div>
        ))}
      </div>
      <p className="badges-progress">
        {t('badges.progress', { earned: earned.length, total: BADGES.length })}
      </p>
    </div>
  );
}
