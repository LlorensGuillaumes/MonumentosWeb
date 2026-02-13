import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  authLogin, authRegister, authGoogle, authMe, authUpdate,
  getFavoritoIds, addFavorito, removeFavorito,
  changePassword as apiChangePassword,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { i18n } = useTranslation();
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [favoritoIds, setFavoritoIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  // Cargar favoritos al tener usuario
  useEffect(() => {
    if (user) {
      getFavoritoIds()
        .then(ids => setFavoritoIds(new Set(ids)))
        .catch(() => setFavoritoIds(new Set()));
    } else {
      setFavoritoIds(new Set());
    }
  }, [user]);

  // Aplicar idioma del usuario al login (solo cuando cambia el usuario, no en cada render)
  useEffect(() => {
    if (user?.idioma_por_defecto) {
      i18n.changeLanguage(user.idioma_por_defecto);
    }
  }, [user?.idioma_por_defecto]); // eslint-disable-line react-hooks/exhaustive-deps

  // Verificar token al cargar
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token && user) {
      authMe().then(u => {
        setUser(u);
        localStorage.setItem('auth_user', JSON.stringify(u));
      }).catch(() => {
        logout();
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAuth = (token, userData) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    setUser(userData);
  };

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { token, user: u } = await authLogin({ email, password });
      saveAuth(token, u);
      return u;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email, password, nombre, idioma_por_defecto) => {
    setLoading(true);
    try {
      const { token, user: u } = await authRegister({ email, password, nombre, idioma_por_defecto });
      saveAuth(token, u);
      return u;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (googleData) => {
    setLoading(true);
    try {
      const { token, user: u } = await authGoogle(googleData);
      saveAuth(token, u);
      return u;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    setFavoritoIds(new Set());
  }, []);

  const updateProfile = useCallback(async (data) => {
    const u = await authUpdate(data);
    setUser(u);
    localStorage.setItem('auth_user', JSON.stringify(u));
    return u;
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    return await apiChangePassword({ current_password: currentPassword, new_password: newPassword });
  }, []);

  const toggleFavorito = useCallback(async (bienId) => {
    if (!user) return false;
    const isFav = favoritoIds.has(bienId);
    // Optimistic update
    setFavoritoIds(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(bienId);
      else next.add(bienId);
      return next;
    });
    try {
      if (isFav) {
        await removeFavorito(bienId);
      } else {
        await addFavorito(bienId);
      }
      return !isFav;
    } catch {
      // Revert
      setFavoritoIds(prev => {
        const next = new Set(prev);
        if (isFav) next.add(bienId);
        else next.delete(bienId);
        return next;
      });
      return isFav;
    }
  }, [user, favoritoIds]);

  const isFavorito = useCallback((bienId) => {
    return favoritoIds.has(bienId);
  }, [favoritoIds]);

  const isPremium = user
    ? user.rol === 'admin' || (user.premium && (!user.premium_hasta || new Date(user.premium_hasta) > new Date()))
    : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        favoritoIds,
        isPremium,
        login,
        register,
        loginWithGoogle,
        logout,
        updateProfile,
        changePassword,
        toggleFavorito,
        isFavorito,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
