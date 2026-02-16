import { useState, useEffect } from 'react';
import { getAdminSettings, updateAdminSettings } from '../services/api';

const DEFAULT_SETTINGS = {
  trial_days: 30,
  trial_enabled: true,
  price_basic_monthly: 1.99,
  price_basic_yearly: 12.99,
  price_premium_monthly: 2.99,
  price_premium_yearly: 19.99,
  monument_of_day_mode: 'auto', // auto | manual
  monument_of_day_id: '',
  max_user_photos: 5,
  max_photo_size_mb: 5,
  diary_enabled: true,
  photo_upload_enabled: true,
  nearby_radius_km: 25,
  nearby_limit: 20,
  autocomplete_enabled: true,
  shareable_routes_enabled: true,
  newsletter_enabled: true,
};

export default function AdminSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    getAdminSettings()
      .then(data => setSettings(prev => ({ ...prev, ...data })))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await updateAdminSettings(settings);
      setMsg({ type: 'success', text: 'Configuración guardada correctamente' });
      setTimeout(() => setMsg(null), 3000);
    } catch {
      setMsg({ type: 'error', text: 'Error al guardar la configuración' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-settings-loading">Cargando configuración...</div>;

  return (
    <div className="admin-settings">
      <div className="admin-header">
        <h1>Configuración</h1>
        <p className="admin-settings-hint">Ajustes globales de la plataforma. Los cambios se aplican inmediatamente.</p>
      </div>

      {/* Premium & Trial */}
      <section className="settings-section">
        <h2>Premium y Trial</h2>
        <div className="settings-grid">
          <label className="settings-field">
            <span>Trial habilitado</span>
            <select value={settings.trial_enabled ? 'yes' : 'no'} onChange={e => handleChange('trial_enabled', e.target.value === 'yes')}>
              <option value="yes">Sí</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Duración del trial (días)</span>
            <input
              type="number"
              min="1"
              max="365"
              value={settings.trial_days}
              onChange={e => handleChange('trial_days', parseInt(e.target.value) || 30)}
            />
          </label>
          <label className="settings-field">
            <span>Viajero - Precio mensual (€)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.price_basic_monthly}
              onChange={e => handleChange('price_basic_monthly', parseFloat(e.target.value) || 0)}
            />
          </label>
          <label className="settings-field">
            <span>Viajero - Precio anual (€)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.price_basic_yearly}
              onChange={e => handleChange('price_basic_yearly', parseFloat(e.target.value) || 0)}
            />
          </label>
          <label className="settings-field">
            <span>Premium - Precio mensual (€)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.price_premium_monthly}
              onChange={e => handleChange('price_premium_monthly', parseFloat(e.target.value) || 0)}
            />
          </label>
          <label className="settings-field">
            <span>Premium - Precio anual (€)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.price_premium_yearly}
              onChange={e => handleChange('price_premium_yearly', parseFloat(e.target.value) || 0)}
            />
          </label>
        </div>
      </section>

      {/* Monument of the Day */}
      <section className="settings-section">
        <h2>Monumento del Día</h2>
        <div className="settings-grid">
          <label className="settings-field">
            <span>Modo de selección</span>
            <select value={settings.monument_of_day_mode} onChange={e => handleChange('monument_of_day_mode', e.target.value)}>
              <option value="auto">Automático (rotación diaria)</option>
              <option value="manual">Manual (seleccionar ID)</option>
            </select>
          </label>
          {settings.monument_of_day_mode === 'manual' && (
            <label className="settings-field">
              <span>ID del monumento</span>
              <input
                type="text"
                value={settings.monument_of_day_id}
                onChange={e => handleChange('monument_of_day_id', e.target.value)}
                placeholder="ID del bien (ej: 12345)"
              />
            </label>
          )}
        </div>
      </section>

      {/* Photos */}
      <section className="settings-section">
        <h2>Fotos de Usuarios</h2>
        <div className="settings-grid">
          <label className="settings-field">
            <span>Subida de fotos habilitada</span>
            <select value={settings.photo_upload_enabled ? 'yes' : 'no'} onChange={e => handleChange('photo_upload_enabled', e.target.value === 'yes')}>
              <option value="yes">Sí</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Máximo de fotos por monumento</span>
            <input
              type="number"
              min="1"
              max="50"
              value={settings.max_user_photos}
              onChange={e => handleChange('max_user_photos', parseInt(e.target.value) || 5)}
            />
          </label>
          <label className="settings-field">
            <span>Tamaño máximo por foto (MB)</span>
            <input
              type="number"
              min="1"
              max="20"
              value={settings.max_photo_size_mb}
              onChange={e => handleChange('max_photo_size_mb', parseInt(e.target.value) || 5)}
            />
          </label>
        </div>
      </section>

      {/* Nearby */}
      <section className="settings-section">
        <h2>Monumentos Cercanos</h2>
        <div className="settings-grid">
          <label className="settings-field">
            <span>Radio por defecto (km)</span>
            <input
              type="number"
              min="1"
              max="200"
              value={settings.nearby_radius_km}
              onChange={e => handleChange('nearby_radius_km', parseInt(e.target.value) || 25)}
            />
          </label>
          <label className="settings-field">
            <span>Máximo de resultados</span>
            <input
              type="number"
              min="5"
              max="100"
              value={settings.nearby_limit}
              onChange={e => handleChange('nearby_limit', parseInt(e.target.value) || 20)}
            />
          </label>
        </div>
      </section>

      {/* Features */}
      <section className="settings-section">
        <h2>Funcionalidades</h2>
        <div className="settings-grid">
          <label className="settings-field">
            <span>Diario de viaje</span>
            <select value={settings.diary_enabled ? 'yes' : 'no'} onChange={e => handleChange('diary_enabled', e.target.value === 'yes')}>
              <option value="yes">Habilitado</option>
              <option value="no">Deshabilitado</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Autocompletado en búsqueda</span>
            <select value={settings.autocomplete_enabled ? 'yes' : 'no'} onChange={e => handleChange('autocomplete_enabled', e.target.value === 'yes')}>
              <option value="yes">Habilitado</option>
              <option value="no">Deshabilitado</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Rutas compartibles</span>
            <select value={settings.shareable_routes_enabled ? 'yes' : 'no'} onChange={e => handleChange('shareable_routes_enabled', e.target.value === 'yes')}>
              <option value="yes">Habilitado</option>
              <option value="no">Deshabilitado</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Newsletter</span>
            <select value={settings.newsletter_enabled ? 'yes' : 'no'} onChange={e => handleChange('newsletter_enabled', e.target.value === 'yes')}>
              <option value="yes">Habilitado</option>
              <option value="no">Deshabilitado</option>
            </select>
          </label>
        </div>
      </section>

      {msg && (
        <div className={`settings-msg settings-msg-${msg.type}`}>
          {msg.text}
        </div>
      )}

      <button
        className="btn btn-primary settings-save-btn"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </div>
  );
}
