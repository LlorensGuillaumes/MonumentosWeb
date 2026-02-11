import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, login, register, loginWithGoogle, loading } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [idioma, setIdioma] = useState(i18n.language || 'es');
  const [error, setError] = useState(null);

  // Si ya está logueado, redirigir
  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  // Inicializar Google Sign-In
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-btn'),
          { theme: 'outline', size: 'large', width: 320, text: 'continue_with' }
        );
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.head.appendChild(script);
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoogleResponse = async (response) => {
    try {
      setError(null);
      // Decode JWT to get user info
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      await loginWithGoogle({
        credential: response.credential,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        googleId: payload.sub,
        idioma_por_defecto: i18n.language?.split('-')[0] || 'es',
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || t('auth.googleError'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, nombre, idioma);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || t('auth.genericError'));
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>{mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}</h1>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'register' && (
            <div className="form-group">
              <label>{t('auth.name')}</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder={t('auth.namePlaceholder')}
              />
            </div>
          )}

          <div className="form-group">
            <label>{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('auth.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'register' ? t('auth.passwordMin') : ''}
              required
              minLength={mode === 'register' ? 6 : undefined}
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label>{t('auth.defaultLanguage')}</label>
              <select value={idioma} onChange={(e) => setIdioma(e.target.value)}>
                <option value="es">Español</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="pt">Português</option>
                <option value="ca">Català</option>
                <option value="eu">Euskara</option>
                <option value="gl">Galego</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? t('auth.loading') : (mode === 'login' ? t('auth.loginBtn') : t('auth.registerBtn'))}
          </button>
        </form>

        {GOOGLE_CLIENT_ID && (
          <>
            <div className="login-divider">
              <span>{t('auth.or')}</span>
            </div>
            <div id="google-signin-btn" className="google-btn-wrapper" />
          </>
        )}

        <p className="login-switch">
          {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
          >
            {mode === 'login' ? t('auth.registerLink') : t('auth.loginLink')}
          </button>
        </p>
      </div>
    </div>
  );
}
