import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getMisPropuestas } from '../services/api';
import './NotificationBell.css';

export default function NotificationBell() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [seen, setSeen] = useState(() => {
    const s = localStorage.getItem('notifications_seen');
    return s ? JSON.parse(s) : [];
  });
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Poll for proposal status changes
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      try {
        const data = await getMisPropuestas({ limit: 20 });
        const items = data.items || [];
        const notifs = items
          .filter(p => p.estado !== 'pendiente')
          .map(p => ({
            id: `proposal-${p.id}`,
            type: p.estado === 'aprobada' ? 'success' : 'info',
            text: p.estado === 'aprobada'
              ? t('notifications.proposalApproved', { name: p.nombre })
              : t('notifications.proposalRejected', { name: p.nombre }),
            link: p.estado === 'aprobada' && p.monumento_id ? `/monumento/${p.monumento_id}` : '/mis-propuestas',
            time: p.updated_at,
          }));
        setNotifications(notifs);
      } catch { /* ignore */ }
    };
    check();
    const interval = setInterval(check, 60000); // every minute
    return () => clearInterval(interval);
  }, [user, t]);

  const unseen = notifications.filter(n => !seen.includes(n.id));

  const handleOpen = () => {
    setOpen(!open);
    if (!open && unseen.length > 0) {
      const newSeen = [...new Set([...seen, ...notifications.map(n => n.id)])];
      setSeen(newSeen);
      localStorage.setItem('notifications_seen', JSON.stringify(newSeen));
    }
  };

  if (!user) return null;

  return (
    <div className="notification-bell" ref={ref}>
      <button className="bell-btn" onClick={handleOpen} aria-label="Notifications">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unseen.length > 0 && <span className="bell-badge">{unseen.length}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <strong>{t('notifications.title')}</strong>
          </div>
          {notifications.length === 0 ? (
            <div className="notification-empty">{t('notifications.empty')}</div>
          ) : (
            <div className="notification-list">
              {notifications.slice(0, 10).map(n => (
                <Link
                  key={n.id}
                  to={n.link}
                  className={`notification-item ${!seen.includes(n.id) ? 'unread' : ''}`}
                  onClick={() => setOpen(false)}
                >
                  <span className={`notification-dot ${n.type}`} />
                  <span className="notification-text">{n.text}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
