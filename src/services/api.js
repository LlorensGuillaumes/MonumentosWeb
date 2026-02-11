import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Interceptor: añadir token JWT si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: si 401 limpiar token
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
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

// ============== ADMIN: USUARIOS ==============

export const getUsuarios = (params = {}) =>
  api.get('/admin/usuarios', { params }).then(r => r.data);

export const updateUsuarioRol = (id, rol) =>
  api.patch(`/admin/usuarios/${id}/rol`, { rol }).then(r => r.data);

// ============== ADMIN: CONTACTOS ==============

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
    timeout: 60000,
  }).then(r => r.data);
};

export const getEmailStatus = () =>
  api.get('/email/status').then(r => r.data);

export const cancelEmail = () =>
  api.post('/email/cancel').then(r => r.data);

export default api;
