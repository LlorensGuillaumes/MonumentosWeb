import axios from 'axios';

const API_PRIMARY = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const API_FALLBACK = import.meta.env.VITE_API_URL_FALLBACK || '';

let activeBaseURL = API_PRIMARY;

const api = axios.create({
  baseURL: activeBaseURL,
  timeout: 30000,
});

// Interceptor: añadir token JWT si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.baseURL = activeBaseURL;
  return config;
});

// Interceptor: si 401 limpiar token y redirigir a login (si era usuario logueado);
// si error de red, intentar failover.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      const wasAuthenticated = !!localStorage.getItem('auth_token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');

      // Si estaba logueado y NO estamos ya en /login, redirigir con notice ?expired=1.
      // Esto evita "UI fantasma" (estado React logueado pero token inválido)
      // tras rotación de JWT_SECRET, expiración natural o invalidación del backend.
      if (wasAuthenticated && typeof window !== 'undefined'
          && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=1';
        return Promise.reject(err);
      }
    }

    // Failover: error de red (no respuesta del servidor) y tenemos URL de respaldo
    const isNetworkError = !err.response && err.code !== 'ERR_CANCELED';
    if (isNetworkError && API_FALLBACK && activeBaseURL !== API_FALLBACK && !err.config._retried) {
      console.warn('API primary failed, switching to fallback:', API_FALLBACK);
      activeBaseURL = API_FALLBACK;
      err.config._retried = true;
      err.config.baseURL = API_FALLBACK;
      return api.request(err.config);
    }

    return Promise.reject(err);
  }
);

// ============== DATOS ==============

export const getStats = () => api.get('/stats').then(r => r.data);

export const getMonumentos = (params = {}) =>
  api.get('/monumentos', { params }).then(r => r.data);

export const getMonumento = (id) =>
  api.get(`/monumentos/${id}`).then(r => r.data);

export const getGeoJSON = (params = {}) =>
  api.get('/geojson', { params }).then(r => r.data);

export const getFiltros = (params = {}) =>
  api.get('/filtros', { params }).then(r => r.data);

export const getCCAAResumen = (params = {}) =>
  api.get('/ccaa-resumen', { params }).then(r => r.data);

export const getMunicipios = (params = {}) =>
  api.get('/municipios', { params }).then(r => r.data);

// ============== WIKIPEDIA ==============

export const getWikipediaExtract = (id, lang) =>
  api.get(`/monumentos/${id}/wikipedia`, { params: lang ? { lang } : {} }).then(r => r.data).catch(() => null);

// ============== AUTH ==============

export const authRegister = (data) =>
  api.post('/auth/register', data).then(r => r.data);

export const authLogin = (data) =>
  api.post('/auth/login', data).then(r => r.data);

export const authGoogle = (data) =>
  api.post('/auth/google', data).then(r => r.data);

export const authMe = () =>
  api.get('/auth/me').then(r => r.data);

export const authUpdate = (data) =>
  api.put('/auth/me', data).then(r => r.data);

// ============== FAVORITOS ==============

export const getFavoritos = (params = {}) =>
  api.get('/favoritos', { params }).then(r => r.data);

export const getFavoritoIds = () =>
  api.get('/favoritos/ids').then(r => r.data);

export const addFavorito = (bienId) =>
  api.post(`/favoritos/${bienId}`).then(r => r.data);

export const removeFavorito = (bienId) =>
  api.delete(`/favoritos/${bienId}`).then(r => r.data);

// ============== AUTH: PASSWORD ==============

export const changePassword = (data) =>
  api.put('/auth/me/password', data).then(r => r.data);

export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', { email }).then(r => r.data);

export const resetPassword = (token, password) =>
  api.post('/auth/reset-password', { token, password }).then(r => r.data);

// ============== ADMIN: USUARIOS ==============

export const getUsuarios = (params = {}) =>
  api.get('/admin/usuarios', { params }).then(r => r.data);

export const updateUsuarioRol = (id, rol) =>
  api.patch(`/admin/usuarios/${id}/rol`, { rol }).then(r => r.data);

export const updateUsuarioPremium = (id, data) =>
  api.patch(`/admin/usuarios/${id}/premium`, data).then(r => r.data);

// ============== ADMIN: CONTACTOS ==============

export const createContacto = (data) =>
  api.post('/contactos', data).then(r => r.data);

export const getContactos = (params = {}) =>
  api.get('/contactos', { params }).then(r => r.data);

export const getContactosStats = () =>
  api.get('/contactos/stats').then(r => r.data);

export const updateContacto = (id, data) =>
  api.patch(`/contactos/${id}`, data).then(r => r.data);

export const getNotasContacto = (id) =>
  api.get(`/contactos/${id}/notas`).then(r => r.data);

export const createNotaContacto = (id, texto, es_tarea = false) =>
  api.post(`/contactos/${id}/notas`, { texto, es_tarea }).then(r => r.data);

export const updateNotaContacto = (id, notaId, data) =>
  api.patch(`/contactos/${id}/notas/${notaId}`, data).then(r => r.data);

export const deleteNotaContacto = (id, notaId) =>
  api.delete(`/contactos/${id}/notas/${notaId}`).then(r => r.data);

export const getTareas = (params = {}) =>
  api.get('/tareas', { params }).then(r => r.data);

// ============== ADMIN: ANALYTICS ==============

export const getAnalyticsSummary = () =>
  api.get('/admin/analytics/summary').then(r => r.data);

export const getAnalyticsRegistrations = (periodo = 'month') =>
  api.get('/admin/analytics/registrations', { params: { periodo } }).then(r => r.data);

export const getAnalyticsLoginsPerDay = (dias = 30) =>
  api.get('/admin/analytics/logins-per-day', { params: { dias } }).then(r => r.data);

export const getAnalyticsTopUsers = (limit = 10) =>
  api.get('/admin/analytics/top-users', { params: { limit } }).then(r => r.data);

// ============== EMAIL MASIVO ==============

export const sendEmails = ({ contacto_ids, asunto, cuerpo, gmail_user, gmail_pass, archivos = [], incluir_pdf_monumentos = false }) => {
  const formData = new FormData();
  formData.append('contacto_ids', JSON.stringify(contacto_ids));
  formData.append('asunto', asunto);
  formData.append('cuerpo', cuerpo);
  formData.append('gmail_user', gmail_user);
  formData.append('gmail_pass', gmail_pass);
  formData.append('incluir_pdf_monumentos', String(incluir_pdf_monumentos));
  archivos.forEach(file => formData.append('archivos', file));
  return api.post('/email/send', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  }).then(r => r.data);
};

export const getEmailStatus = () =>
  api.get('/email/status').then(r => r.data);

export const cancelEmail = () =>
  api.post('/email/cancel').then(r => r.data);

// ============== ADMIN: MENSAJES ==============

export const getMensajes = (params = {}) =>
  api.get('/admin/mensajes', { params }).then(r => r.data);

export const getMensajesCount = () =>
  api.get('/admin/mensajes/count').then(r => r.data);

export const getMensaje = (id) =>
  api.get(`/admin/mensajes/${id}`).then(r => r.data);

export const updateMensaje = (id, data) =>
  api.patch(`/admin/mensajes/${id}`, data).then(r => r.data);

export const deleteMensaje = (id) =>
  api.delete(`/admin/mensajes/${id}`).then(r => r.data);

export const getMensajeArchivoUrl = (mensajeId, archivoId) =>
  `${API_BASE}/admin/mensajes/${mensajeId}/archivos/${archivoId}`;

// ============== PROPUESTAS ==============

export const submitPropuesta = (formData) =>
  api.post('/propuestas', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  }).then(r => r.data);

export const getMisPropuestas = (params = {}) =>
  api.get('/propuestas/mis', { params }).then(r => r.data);

export const getAdminPropuestas = (params = {}) =>
  api.get('/admin/propuestas', { params }).then(r => r.data);

export const getAdminPropuestasCount = () =>
  api.get('/admin/propuestas/count').then(r => r.data);

export const getAdminPropuesta = (id) =>
  api.get(`/admin/propuestas/${id}`).then(r => r.data);

export const updateAdminPropuesta = (id, data) =>
  api.patch(`/admin/propuestas/${id}`, data).then(r => r.data);

export const aprobarPropuesta = (id) =>
  api.post(`/admin/propuestas/${id}/aprobar`).then(r => r.data);

export const rechazarPropuesta = (id, notas) =>
  api.post(`/admin/propuestas/${id}/rechazar`, { notas }).then(r => r.data);

export const searchWikidata = (q, pais) =>
  api.get('/admin/wikidata/search', { params: { q, pais } }).then(r => r.data);

export const getPropuestaImagenUrl = (propId, imgId) =>
  `${API_BASE}/admin/propuestas/${propId}/imagenes/${imgId}`;

// ============== NOTAS MONUMENTO ==============

export const getNotasMonumento = (bienId) =>
  api.get(`/monumentos/${bienId}/notas`).then(r => r.data);

export const addNotaMonumento = (bienId, tipo, texto) =>
  api.post(`/monumentos/${bienId}/notas`, { tipo, texto }).then(r => r.data);

export const deleteNotaMonumento = (bienId, notaId) =>
  api.delete(`/monumentos/${bienId}/notas/${notaId}`).then(r => r.data);

// ============== VALORACIONES ==============

export const getValoraciones = (bienId) =>
  api.get(`/monumentos/${bienId}/valoraciones`).then(r => r.data);

export const addValoracion = (bienId, data) =>
  api.post(`/monumentos/${bienId}/valoraciones`, data).then(r => r.data);

// ============== BÚSQUEDA POR RADIO ==============

export const getMonumentosRadio = (params = {}) =>
  api.get('/monumentos/radio', { params }).then(r => r.data);

// ============== RUTAS ==============

export const createRuta = (data) =>
  api.post('/rutas', data).then(r => r.data);

export const getRutas = () =>
  api.get('/rutas').then(r => r.data);

export const getRuta = (id) =>
  api.get(`/rutas/${id}`).then(r => r.data);

export const deleteRuta = (id) =>
  api.delete(`/rutas/${id}`).then(r => r.data);

export const optimizarRuta = (paradas) =>
  api.post('/rutas/optimizar', { paradas }).then(r => r.data);

export const getRutaPdfUrl = (id) => {
  const token = localStorage.getItem('auth_token');
  return `${API_BASE}/rutas/${id}/pdf?token=${token}`;
};

// ============== ADMIN SETTINGS ==============

export const getAdminSettings = () =>
  api.get('/admin/settings').then(r => r.data).catch(() => {
    // Fallback to localStorage if backend not ready
    const stored = localStorage.getItem('admin_settings');
    return stored ? JSON.parse(stored) : {};
  });

export const updateAdminSettings = (settings) =>
  api.put('/admin/settings', settings).then(r => r.data).catch(() => {
    // Fallback to localStorage
    const current = JSON.parse(localStorage.getItem('admin_settings') || '{}');
    const updated = { ...current, ...settings };
    localStorage.setItem('admin_settings', JSON.stringify(updated));
    return updated;
  });

// ============== MONUMENT OF THE DAY ==============

export const getMonumentOfDay = () =>
  api.get('/monument-of-day').then(r => r.data).catch(() => null);

// ============== USER PHOTOS ==============

export const getMonumentoPhotos = (bienId) =>
  api.get(`/monumentos/${bienId}/photos`).then(r => r.data);

export const uploadMonumentoPhoto = (bienId, file, caption = '') => {
  const formData = new FormData();
  formData.append('foto', file);
  if (caption) formData.append('descripcion', caption);
  return api.post(`/monumentos/${bienId}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  }).then(r => r.data);
};

export const deleteMonumentoPhoto = (bienId, photoId) =>
  api.delete(`/monumentos/${bienId}/photos/${photoId}`).then(r => r.data);

// ============== TRAVEL DIARY ==============

export const getDiaryEntries = (params = {}) =>
  api.get('/diary', { params }).then(r => r.data);

export const addDiaryEntry = (data) =>
  api.post('/diary', data).then(r => r.data);

export const updateDiaryEntry = (id, data) =>
  api.put(`/diary/${id}`, data).then(r => r.data);

export const deleteDiaryEntry = (id) =>
  api.delete(`/diary/${id}`).then(r => r.data);

// ============== PREMIUM TRIAL ==============

export const activateTrial = () =>
  api.post('/auth/activate-trial').then(r => r.data);

// ============== SHAREABLE ROUTES ==============

export const getPublicRuta = (shareId) =>
  api.get(`/rutas/public/${shareId}`).then(r => r.data);

export const shareRuta = (id) =>
  api.post(`/rutas/${id}/share`).then(r => r.data);

// ============== USER STATS ==============

export const getUserStats = () =>
  api.get('/auth/stats').then(r => r.data);

// ============== AUTOCOMPLETE ==============

export const getAutocomplete = (q) =>
  api.get('/autocomplete', { params: { q } }).then(r => r.data);

// ============== SOCIAL HISTORY ==============

export const getSocialHistory = () =>
  api.get('/admin/social-history').then(r => r.data);

export const addSocialHistory = (bien_id, platform) =>
  api.post('/admin/social-history', { bien_id, platform }).then(r => r.data);

// ============== CONTACTO ==============

export const sendContact = ({ email, asunto, mensaje, archivos = [] }) => {
  const formData = new FormData();
  formData.append('email', email);
  formData.append('asunto', asunto);
  formData.append('mensaje', mensaje);
  archivos.forEach(file => formData.append('archivos', file));
  return api.post('/contact', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  }).then(r => r.data);
};

// ============== SOCIAL ACCOUNTS (menciones en posts) ==============

export const getSocialAccountsSuggest = (params = {}) =>
  api.get('/admin/social-accounts/suggest', { params }).then(r => r.data);

export const markSocialAccountsUsed = (account_ids) =>
  api.post('/admin/social-accounts/mark-used', { account_ids }).then(r => r.data);

export const getSocialAccounts = () =>
  api.get('/admin/social-accounts').then(r => r.data);

// ============== RUTAS CULTURALES ==============

export const getRutasCulturales = (lang) =>
  api.get('/rutas-culturales', { params: lang ? { lang } : {} }).then(r => r.data);

export const getRutaCultural = (slug) =>
  api.get(`/rutas-culturales/${slug}`).then(r => r.data);

// ============== ANALYTICS DE TRAFICO ==============

/**
 * Envía un evento al backend. No bloquea la UI: si falla, swallow silently.
 * Anonymous-friendly: si el usuario no está logueado, igualmente se registra.
 */
export const trackEvent = (event_type, opts = {}) => {
  try {
    const payload = {
      event_type,
      url: window.location.pathname + window.location.search,
      referrer: document.referrer || null,
      session_id: getSessionId(),
      ...opts,
    };
    // fire-and-forget; keepalive permite enviarlo aunque el usuario navegue
    return fetch(`${activeBaseURL}/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('auth_token')
          ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
          : {}),
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // never break UX
    return Promise.resolve();
  }
};

// Session ID per agrupar visites d'una mateixa sessió. Generat al primer ús,
// guardat a sessionStorage (s'esborra en tancar pestanya).
function getSessionId() {
  try {
    const KEY = 'pe_session_id';
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

// ============== ADMIN TRAFFIC ANALYTICS ==============

export const getTrafficSummary = (dias = 30) =>
  api.get('/admin/analytics/traffic/summary', { params: { dias } }).then(r => r.data);

export const getTrafficByDay = (dias = 30) =>
  api.get('/admin/analytics/traffic/by-day', { params: { dias } }).then(r => r.data);

export const getTrafficTopUrls = (dias = 30, limit = 15) =>
  api.get('/admin/analytics/traffic/top-urls', { params: { dias, limit } }).then(r => r.data);

export const getTrafficTopReferrers = (dias = 30, limit = 15) =>
  api.get('/admin/analytics/traffic/top-referrers', { params: { dias, limit } }).then(r => r.data);

export const getTrafficTopMonumentos = (dias = 30, limit = 15) =>
  api.get('/admin/analytics/traffic/top-monumentos', { params: { dias, limit } }).then(r => r.data);

export const getTrafficTopAcciones = (dias = 30) =>
  api.get('/admin/analytics/traffic/top-acciones', { params: { dias } }).then(r => r.data);

export default api;
