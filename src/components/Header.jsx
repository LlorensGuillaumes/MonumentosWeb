import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import LanguageSelector from './LanguageSelector';
import './Header.css';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { stats } = useApp();
  const { user, logout, favoritoIds, updateProfile, changePassword } = useAuth();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const menuRef = useRef(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
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
          {user && (
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
                to="/favoritos"
                className={`nav-link ${location.pathname === '/favoritos' ? 'active' : ''}`}
              >
                {t('nav.favorites')}
                {favoritoIds.size > 0 && (
                  <span className="fav-badge">{favoritoIds.size}</span>
                )}
              </Link>
              <Link
                to="/rutas"
                className={`nav-link ${location.pathname === '/rutas' ? 'active' : ''}`}
              >
                {t('nav.routes')}
              </Link>
              <Link
                to="/proponer"
                className={`nav-link ${location.pathname === '/proponer' ? 'active' : ''}`}
              >
                {t('nav.propose')}
              </Link>
            </>
          )}
          <Link
            to="/contacto"
            className={`nav-link ${location.pathname === '/contacto' ? 'active' : ''}`}
          >
            {t('nav.contact')}
          </Link>
        </nav>

        <div className="header-right">
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
                  <button className="user-dropdown-item" onClick={openProfile}>
                    Mi perfil
                  </button>
                  <Link to="/favoritos" className="user-dropdown-item" onClick={() => setMenuOpen(false)}>
                    {t('nav.favorites')} ({favoritoIds.size})
                  </Link>
                  <Link to="/mis-rutas" className="user-dropdown-item" onClick={() => setMenuOpen(false)}>
                    {t('nav.myRoutes')}
                  </Link>
                  <Link to="/mis-propuestas" className="user-dropdown-item" onClick={() => setMenuOpen(false)}>
                    {t('nav.myProposals')}
                  </Link>
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
