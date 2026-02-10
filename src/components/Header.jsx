import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import LanguageSelector from './LanguageSelector';
import './Header.css';

export default function Header() {
  const location = useLocation();
  const { stats } = useApp();
  const { t } = useTranslation();

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <span className="logo-icon">🏛️</span>
          <span className="logo-text">{t('header.title')}</span>
        </Link>

        <nav className="nav">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            {t('nav.home')}
          </Link>
          <Link
            to="/buscar"
            className={`nav-link ${location.pathname === '/buscar' ? 'active' : ''}`}
          >
            {t('nav.search')}
          </Link>
          <Link
            to="/mapa"
            className={`nav-link ${location.pathname === '/mapa' ? 'active' : ''}`}
          >
            {t('nav.map')}
          </Link>
        </nav>

        <LanguageSelector />

        {stats && (
          <div className="stats-badge">
            <span>{stats.con_coordenadas.toLocaleString()}</span> {t('header.monuments')}
          </div>
        )}
      </div>
    </header>
  );
}
