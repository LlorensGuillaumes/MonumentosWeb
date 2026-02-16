import { useState, useRef, useEffect } from 'react';
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
  const [profileForm, setProfileForm] = useState({});
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const menuRef = useRef(null);
  const rutasRef = useRef(null);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (rutasRef.current && !rutasRef.current.contains(e.target)) {
        setRutasOpen(false);
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
          <span className="logo-icon">🏛️</span>
          <span className="logo-text">{t('header.title')}</span>
        </Link>

        <nav className="nav">
          {user?.rol === 'admin' && (
            <Link
              to="/admin"
              className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
            >
              Admin
            </Link>
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
                to="/mapa"
                className={`nav-link ${location.pathname === '/mapa' ? 'active' : ''}`}
              >
                {t('nav.map')}
              </Link>
              <div className="nav-dropdown" ref={rutasRef}>
                <button
                  className={`nav-dropdown-btn ${location.pathname === '/rutas' || location.pathname.startsWith('/rutas-curadas') ? 'active' : ''}`}
                  onClick={() => setRutasOpen(!rutasOpen)}
                >
                  {t('nav.routes')} <span className="dropdown-arrow">&#9662;</span>
                </button>
                {rutasOpen && (
                  <div className="nav-dropdown-menu">
                    <Link to="/rutas" onClick={() => setRutasOpen(false)}>{t('nav.myRoutes')}</Link>
                    <Link to="/rutas-curadas" onClick={() => setRutasOpen(false)}>{t('nav.curatedRoutes')}</Link>
                  </div>
                )}
              </div>
              <Link
                to="/favoritos"
                className={`nav-icon-link ${location.pathname === '/favoritos' ? 'active' : ''}`}
                title={t('nav.favorites')}
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                {favoritoIds.size > 0 && (
                  <span className="fav-badge">{favoritoIds.size}</span>
                )}
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
          <ThemeToggle />
          <NotificationBell />
          <LanguageSelector />

          {stats && (
            <div className="stats-badge">
              <span>{stats.con_coordenadas.toLocaleString()}</span> {t('header.monuments')}
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
                    {(user.nombre || user.email)[0].toUpperCase()}
                  </span>
                )}
              </button>
              {menuOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-info">
                    <strong>{user.nombre || user.email.split('@')[0]}</strong>
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
