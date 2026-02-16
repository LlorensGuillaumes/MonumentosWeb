import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import '../pages/Compare.css';

export default function CompareBar() {
  const { t } = useTranslation();
  const { compareList, removeFromCompare, clearCompare } = useApp();

  if (compareList.length === 0) return null;

  return (
    <div className="compare-bar">
      <div className="compare-bar-items">
        <strong>{t('compare.comparing', { count: compareList.length })}:</strong>
        {compareList.map(m => (
          <div key={m.id} className="compare-bar-item">
            <span>{m.denominacion}</span>
            <button onClick={() => removeFromCompare(m.id)}>&times;</button>
          </div>
        ))}
      </div>
      <div className="compare-bar-actions">
        <button className="btn btn-outline btn-sm" onClick={clearCompare} style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
          {t('compare.clearAll')}
        </button>
        {compareList.length >= 2 && (
          <Link to="/comparar" className="btn btn-primary btn-sm">
            {t('compare.compareNow')}
          </Link>
        )}
      </div>
    </div>
  );
}
