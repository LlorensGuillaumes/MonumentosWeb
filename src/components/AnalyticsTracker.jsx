import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '../services/api';

/**
 * Envía un evento "pageview" cada vez que cambia la ruta. Anonymous-friendly:
 * funciona tanto si el usuario está logueado como si no. Si el backend está
 * caído, los errores se silencian para no romper la UX.
 *
 * No renderiza nada. Móntalo una sola vez dentro del BrowserRouter.
 */
export default function AnalyticsTracker() {
  const { pathname, search } = useLocation();
  const lastTracked = useRef(null);

  useEffect(() => {
    const fullPath = pathname + search;
    // Evita duplicados si el efecto se dispara dos veces en StrictMode dev
    if (lastTracked.current === fullPath) return;
    lastTracked.current = fullPath;
    trackEvent('pageview');
  }, [pathname, search]);

  return null;
}
