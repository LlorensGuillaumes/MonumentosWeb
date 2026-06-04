import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import LanguageSelector from './LanguageSelector';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import './Header.css';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { stats } = useApp();
  const { user, logout, favoritoIds, updateProfile, changePassword } = useAuth();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [rutasOpen, setRutasOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');

  // Observe theme changes (the ThemeToggle component sets data-theme on the html element)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const [profileForm, setProfileForm] = useState({});
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const menuRef = useRef(null);
  const rutasRef = useRef(null);
  const rutasBtnRef = useRef(null);
  const settingsRef = useRef(null);
  const settingsDropdownRef = useRef(null);
  const [rutasMenuStyle, setRutasMenuStyle] = useState({});

  // Cuando se abre el dropdown de Rutas, calcular su posición fixed en móvil
  useEffect(() => {
    if (!rutasOpen || !rutasBtnRef.current) {
      setRutasMenuStyle({});
      return;
    }
    // Solo aplicamos position fixed en mobile (≤768px), en desktop el CSS por defecto se encarga
    if (window.innerWidth > 768) {
      setRutasMenuStyle({});
      return;
    }
    const rect = rutasBtnRef.current.getBoundingClientRect();
    setRutasMenuStyle({
      position: 'fixed',
      top: `${rect.bottom + 6}px`,
      left: `${Math.max(8, rect.left)}px`,
    });
  }, [rutasOpen]);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (rutasRef.current && !rutasRef.current.contains(e.target)) {
        setRutasOpen(false);
      }
      // Settings dropdown is rendered via Portal, so check both the button wrapper AND the portal node
      if (
        settingsRef.current && !settingsRef.current.contains(e.target) &&
        (!settingsDropdownRef.current || !settingsDropdownRef.current.contains(e.target))
      ) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const openProfile = () => {
    setMenuOpen(false);
    setProfileMsg(null);
    setProfileForm({
      nombre: user?.nombre || '',
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
    setProfileOpen(true);
  };

  const handleProfileSave = async () => {
    setProfileMsg(null);
    setProfileSaving(true);
    try {
      // Si tiene password (cuenta email) y quiere cambiar contraseña
      if (profileForm.current_password && profileForm.new_password) {
        if (profileForm.new_password !== profileForm.confirm_password) {
          setProfileMsg({ type: 'error', text: 'Las contraseñas nuevas no coinciden' });
          setProfileSaving(false);
          return;
        }
        await changePassword(profileForm.current_password, profileForm.new_password);
        setProfileMsg({ type: 'success', text: 'Contraseña actualizada correctamente' });
        setProfileForm(f => ({ ...f, current_password: '', new_password: '', confirm_password: '' }));
      }
      // Actualizar nombre si ha cambiado
      if (profileForm.nombre !== (user?.nombre || '')) {
        await updateProfile({ nombre: profileForm.nombre });
        setProfileMsg({ type: 'success', text: 'Perfil actualizado correctamente' });
      }
      if (!profileForm.current_password && profileForm.nombre === (user?.nombre || '')) {
        setProfileMsg({ type: 'error', text: 'No hay cambios que guardar' });
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.error || 'Error al guardar' });
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <img src="/logo-arc.svg" alt="" className="logo-icon" />
          <span className="logo-text">{t('header.title')}</span>
        </Link>

        <Link to="/" className="header-mobile-title">{t('header.title')}</Link>

        <nav className="nav">
          {user?.rol === 'admin' && (
            <>
              <Link
                to="/admin"
                className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
              >
                Admin
              </Link>
              <Link
                to="/preguntame"
                className={`nav-link ${location.pathname === '/preguntame' ? 'active' : ''}`}
              >
                {t('nav.askMe')}
              </Link>
            </>
          )}
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            {t('nav.home')}
          </Link>
          {user ? (
            <>
              <Link
                to="/buscar"
                className={`nav-link ${location.pathname === '/buscar' ? 'active' : ''}`}
              >
                {t('nav.search')}
              </Link>
              <Link
                to="/autores"
                className={`nav-link ${location.pathname === '/autores' ? 'active' : ''}`}
              >
                {t('nav.authors')}
              </Link>
              <Link
                to="/mapa"
                className={`nav-link ${location.pathname === '/mapa' ? 'active' : ''}`}
              >
                {t('nav.map')}
              </Link>
              <div className="nav-dropdown" ref={rutasRef}>
                <button
                  ref={rutasBtnRef}
                  className={`nav-dropdown-btn ${location.pathname === '/rutas' || location.pathname.startsWith('/rutas-curadas') ? 'active' : ''}`}
                  onClick={() => setRutasOpen(!rutasOpen)}
                >
                  {t('nav.routes')} <span className="dropdown-arrow">&#9662;</span>
                </button>
                {rutasOpen && (
                  <div className="nav-dropdown-menu" style={rutasMenuStyle}>
                    <Link to="/rutas" onClick={() => setRutasOpen(false)}>{t('nav.myRoutes')}</Link>
                    <Link to="/rutas-curadas" onClick={() => setRutasOpen(false)}>{t('nav.curatedRoutes')}</Link>
                  </div>
                )}
              </div>
              <Link
                to="/favoritos"
                className={`nav-icon-link ${location.pathname === '/favoritos' ? 'active' : ''} ${favoritoIds.size > 0 ? 'has-favs' : ''}`}
                title={t('nav.favorites')}
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </Link>
              <Link
                to="/contacto"
                className={`nav-icon-link ${location.pathname === '/contacto' ? 'active' : ''}`}
                title={t('nav.contact')}
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
              </Link>
            </>
          ) : (
            <>
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
              <Link
                to="/rutas-curadas"
                className={`nav-link ${location.pathname.startsWith('/rutas-curadas') ? 'active' : ''}`}
              >
                {t('nav.curatedRoutes')}
              </Link>
              <Link
                to="/precios"
                className={`nav-link ${location.pathname === '/precios' ? 'active' : ''}`}
              >
                {t('nav.pricing')}
              </Link>
              <Link
                to="/contacto"
                className={`nav-link ${location.pathname === '/contacto' ? 'active' : ''}`}
              >
                {t('nav.contact')}
              </Link>
            </>
          )}
        </nav>

        <div className="header-right">
          {/* Desktop: settings visibles directamente */}
          <div className="header-settings-desktop">
            <ThemeToggle />
            <NotificationBell />
            <LanguageSelector />
          </div>

          {/* Mobile: botón hamburguesa que despliega los mismos controles */}
          <div className="header-settings-mobile" ref={settingsRef}>
            <button
              className="settings-hamburger"
              onClick={() => setSettingsOpen(o => !o)}
              aria-label="Abrir menú de configuración"
              title="Configuración"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            {settingsOpen && createPortal(
              <div className="settings-dropdown-portal">
                <div className="settings-backdrop" onClick={() => setSettingsOpen(false)} />
                <div className="settings-dropdown-floating" ref={settingsDropdownRef}>
                  <div
                    className="settings-row"
                    onMouseDown={e => {
                      // Forward to the inner button on mousedown so the doc-listener doesn't close us first
                      const btn = e.currentTarget.querySelector('button');
                      if (btn && !btn.contains(e.target)) {
                        e.preventDefault();
                        btn.click();
                      }
                    }}
                  >
                    <ThemeToggle />
                    <span className="settings-label">{isDark ? t('header.lightMode', 'Modo claro') : t('header.darkMode', 'Modo oscuro')}</span>
                  </div>
                  <div
                    className="settings-row"
                    onMouseDown={e => {
                      const btn = e.currentTarget.querySelector('button');
                      if (btn && !btn.contains(e.target)) {
                        e.preventDefault();
                        btn.click();
                      }
                    }}
                  >
                    <NotificationBell />
                    <span className="settings-label">{t('header.notifications', 'Notificaciones')}</span>
                  </div>
                  <div
                    className="settings-row"
                    onMouseDown={e => {
                      // Don't intercept if click is inside the language dropdown menu (options list)
                      if (e.target.closest('.language-menu')) return;
                      const btn = e.currentTarget.querySelector('.language-trigger');
                      if (btn && !btn.contains(e.target)) {
                        e.preventDefault();
                        btn.click();
                      }
                    }}
                  >
                    <LanguageSelector />
                    <span className="settings-label">{t('header.language', 'Idioma')}</span>
                  </div>

                  <button
                    type="button"
                    className="settings-close-btn"
                    onClick={() => setSettingsOpen(false)}
                  >
                    {t('header.close', 'Cerrar')}
                  </button>
                </div>
              </div>,
              document.body
            )}
          </div>

          {stats && (
            <div className="stats-badge">
              <span>{stats.total.toLocaleString()}</span> {t('header.monuments')}
            </div>
          )}

          {user ? (
            <div className="user-menu" ref={menuRef}>
              <button
                className="user-btn"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="user-avatar" />
                ) : (
                  <span className="user-initial">
                    {((user.nombre || user.email || '?')[0] || '?').toUpperCase()}
                  </span>
                )}
              </button>
              {menuOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-info">
                    <strong>{user.nombre || (user.email ? user.email.split('@')[0] : '')}</strong>
                    <small>{user.email}</small>
                  </div>
                  <hr />
                  <Link to="/perfil" className="user-dropdown-item" onClick={() => setMenuOpen(false)}>
                    {t('profile.title')}
                  </Link>
                  <Link to="/favoritos" className="user-dropdown-item" onClick={() => setMenuOpen(false)}>
                    {t('nav.favorites')} ({favoritoIds.size})
                  </Link>
                  <Link to="/mis-rutas" className="user-dropdown-item" onClick={() => setMenuOpen(false)}>
                    {t('nav.myRoutes')}
                  </Link>
                  <Link to="/diario" className="user-dropdown-item" onClick={() => setMenuOpen(false)}>
                    {t('nav.diary')}
                  </Link>
                  <Link to="/mis-estadisticas" className="user-dropdown-item" onClick={() => setMenuOpen(false)}>
                    {t('nav.myStats')}
                  </Link>
                  <Link to="/mis-propuestas" className="user-dropdown-item" onClick={() => setMenuOpen(false)}>
                    {t('nav.myProposals')}
                  </Link>
                  <hr />
                  <Link to="/proponer" className="user-dropdown-item" onClick={() => setMenuOpen(false)}>
                    {t('nav.propose')}
                  </Link>
                  <Link to="/precios" className="user-dropdown-item" onClick={() => setMenuOpen(false)}>
                    {t('nav.pricing')}
                  </Link>
                  <hr />
                  <button className="user-dropdown-item" onClick={handleLogout}>
                    {t('auth.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="login-btn">
              {t('auth.loginBtn')}
            </Link>
          )}
        </div>
      </div>

      {profileOpen && (
        <div className="modal-overlay" onClick={() => setProfileOpen(false)}>
          <div className="modal-content profile-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Mi perfil</h2>
              <button className="detail-close" onClick={() => setProfileOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="profile-info">
                {user?.email}
                {user?.google_id ? ' (cuenta Google)' : ' (cuenta email)'}
                {user?.rol && user.rol !== 'user' && <strong> — {user.rol}</strong>}
              </p>

              <p className="profile-section-title">Nombre</p>
              <label className="detail-field">
                <span>Nombre</span>
                <input
                  type="text"
                  value={profileForm.nombre}
                  onChange={e => setProfileForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Tu nombre"
                />
              </label>

              {!user?.google_id && (
                <>
                  <p className="profile-section-title">Cambiar contraseña</p>
                  <label className="detail-field">
                    <span>Actual</span>
                    <input
                      type="password"
                      value={profileForm.current_password}
                      onChange={e => setProfileForm(f => ({ ...f, current_password: e.target.value }))}
                      placeholder="Contraseña actual"
                    />
                  </label>
                  <label className="detail-field">
                    <span>Nueva</span>
                    <input
                      type="password"
                      value={profileForm.new_password}
                      onChange={e => setProfileForm(f => ({ ...f, new_password: e.target.value }))}
                      placeholder="Nueva contraseña"
                    />
                  </label>
                  <label className="detail-field">
                    <span>Confirmar</span>
                    <input
                      type="password"
                      value={profileForm.confirm_password}
                      onChange={e => setProfileForm(f => ({ ...f, confirm_password: e.target.value }))}
                      placeholder="Repetir nueva contraseña"
                    />
                  </label>
                </>
              )}

              {profileMsg && (
                <div className={profileMsg.type === 'success' ? 'profile-success' : 'profile-error'}>
                  {profileMsg.text}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="detail-save-btn" onClick={handleProfileSave} disabled={profileSaving}>
                {profileSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
