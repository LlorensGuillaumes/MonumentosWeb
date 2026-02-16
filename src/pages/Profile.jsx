import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';
import { getRutas, getMisPropuestas } from '../services/api';
import UserBadges from '../components/UserBadges';
import './Profile.css';

export default function Profile() {
  const { t } = useTranslation();
  const { user, favoritoIds, isPremium, updateProfile, changePassword } = useAuth();
  const [routeCount, setRouteCount] = useState(0);
  const [proposalCount, setProposalCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ nombre: '', current_password: '', new_password: '', confirm_password: '' });
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRutas().then(r => setRouteCount(Array.isArray(r) ? r.length : 0)).catch(() => {});
    getMisPropuestas({ limit: 1 }).then(r => setProposalCount(r.total || 0)).catch(() => {});
  }, []);

  const startEditing = () => {
    setForm({ nombre: user?.nombre || '', current_password: '', new_password: '', confirm_password: '' });
    setMsg(null);
    setEditing(true);
  };

  const handleSave = async () => {
    setMsg(null);
    setSaving(true);
    try {
      if (form.new_password) {
        if (form.new_password !== form.confirm_password) {
          setMsg({ type: 'error', text: t('profile.passwordMismatch') });
          setSaving(false);
          return;
        }
        await changePassword(form.current_password, form.new_password);
      }
      if (form.nombre !== (user?.nombre || '')) {
        await updateProfile({ nombre: form.nombre });
      }
      setMsg({ type: 'success', text: t('profile.saved') });
      setEditing(false);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || t('profile.saveError') });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString()
    : '';

  return (
    <div className="profile-page">
      <Helmet>
        <title>{t('profile.title')} - Patrimonio Europeo</title>
      </Helmet>

      <div className="profile-card">
        <div className="profile-avatar-section">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="profile-avatar" />
          ) : (
            <div className="profile-avatar-placeholder">
              {(user.nombre || user.email)[0].toUpperCase()}
            </div>
          )}
          <div className="profile-identity">
            <h1>{user.nombre || user.email.split('@')[0]}</h1>
            <p className="profile-email">{user.email}</p>
            <div className="profile-badges">
              {user.google_id && <span className="profile-badge badge-google">Google</span>}
              {user.rol !== 'user' && <span className="profile-badge badge-role">{user.rol}</span>}
              {isPremium ? (
                <span className="profile-badge badge-premium">Premium</span>
              ) : (
                <Link to="/precios" className="profile-badge badge-upgrade">{t('profile.upgradePlan')}</Link>
              )}
            </div>
          </div>
        </div>

        {memberSince && (
          <p className="profile-member-since">
            {t('profile.memberSince', { date: memberSince })}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="profile-stats">
        <Link to="/favoritos" className="profile-stat">
          <span className="profile-stat-value">{favoritoIds.size}</span>
          <span className="profile-stat-label">{t('profile.statFavorites')}</span>
        </Link>
        <Link to="/mis-rutas" className="profile-stat">
          <span className="profile-stat-value">{routeCount}</span>
          <span className="profile-stat-label">{t('profile.statRoutes')}</span>
        </Link>
        <Link to="/mis-propuestas" className="profile-stat">
          <span className="profile-stat-value">{proposalCount}</span>
          <span className="profile-stat-label">{t('profile.statProposals')}</span>
        </Link>
      </div>

      {/* Badges */}
      <div className="profile-section">
        <UserBadges stats={{ favorites: favoritoIds.size, routes: routeCount, proposals: proposalCount, ratings: 0 }} />
      </div>

      {/* Edit profile */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h2>{t('profile.personalInfo')}</h2>
          {!editing && (
            <button className="btn btn-secondary btn-sm" onClick={startEditing}>
              {t('profile.edit')}
            </button>
          )}
        </div>

        {editing ? (
          <div className="profile-form">
            <label className="profile-field">
              <span>{t('auth.name')}</span>
              <input
                type="text"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder={t('auth.namePlaceholder')}
              />
            </label>

            {!user.google_id && (
              <>
                <h3 className="profile-form-subtitle">{t('profile.changePassword')}</h3>
                <label className="profile-field">
                  <span>{t('profile.currentPassword')}</span>
                  <input
                    type="password"
                    value={form.current_password}
                    onChange={e => setForm(f => ({ ...f, current_password: e.target.value }))}
                  />
                </label>
                <label className="profile-field">
                  <span>{t('profile.newPassword')}</span>
                  <input
                    type="password"
                    value={form.new_password}
                    onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
                  />
                </label>
                <label className="profile-field">
                  <span>{t('profile.confirmPassword')}</span>
                  <input
                    type="password"
                    value={form.confirm_password}
                    onChange={e => setForm(f => ({ ...f, confirm_password: e.target.value }))}
                  />
                </label>
              </>
            )}

            {msg && (
              <div className={`profile-msg ${msg.type}`}>{msg.text}</div>
            )}

            <div className="profile-form-actions">
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? t('profile.saving') : t('profile.save')}
              </button>
              <button className="btn btn-secondary" onClick={() => setEditing(false)}>
                {t('profile.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-info-grid">
            <div className="profile-info-item">
              <span className="profile-info-label">{t('auth.name')}</span>
              <span className="profile-info-value">{user.nombre || '—'}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">{t('auth.email')}</span>
              <span className="profile-info-value">{user.email}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">{t('profile.authMethod')}</span>
              <span className="profile-info-value">{user.google_id ? 'Google' : 'Email'}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">{t('profile.plan')}</span>
              <span className="profile-info-value">{isPremium ? 'Premium' : t('pricing.plans.free')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="profile-links">
        <Link to="/favoritos" className="profile-link-card">
          <span>&#10084;&#65039;</span> {t('nav.favorites')}
        </Link>
        <Link to="/mis-rutas" className="profile-link-card">
          <span>&#128506;</span> {t('nav.myRoutes')}
        </Link>
        <Link to="/mis-propuestas" className="profile-link-card">
          <span>&#128221;</span> {t('nav.myProposals')}
        </Link>
        <Link to="/precios" className="profile-link-card">
          <span>&#11088;</span> {t('nav.pricing')}
        </Link>
      </div>
    </div>
  );
}
