import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAdminImagenes, deleteAdminImagen, setImagenPrincipal, aprobarImagen } from '../services/api';
import './ImagenesAdmin.css';

export default function ImagenesAdmin({ bienId }) {
  const { user } = useAuth();
  const [imgs, setImgs] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const esAdmin = user && (user.rol === 'admin' || user.rol === 'colaborador');

  const load = useCallback(async () => {
    setLoading(true);
    try { setImgs(await getAdminImagenes(bienId)); } catch { /* ignore */ }
    setLoading(false);
  }, [bienId]);

  useEffect(() => { if (open && esAdmin) load(); }, [open, esAdmin, load]);

  if (!esAdmin) return null;

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta imagen del bien?')) return;
    await deleteAdminImagen(id).catch(() => {});
    setImgs(prev => prev.filter(i => i.id !== id));
  };
  const handlePrincipal = async (id) => {
    await setImagenPrincipal(id).catch(() => {});
    setImgs(prev => prev.map(i => ({ ...i, es_principal: i.id === id })));
  };
  const handleAprobar = async (id) => {
    await aprobarImagen(id).catch(() => {});
    setImgs(prev => prev.map(i => i.id === id ? { ...i, estado: 'aprobada' } : i));
  };

  return (
    <section className="detail-section img-admin">
      <h2>
        🛠️ Gestión de imágenes
        <button className="btn btn-outline btn-sm" onClick={() => setOpen(o => !o)}>
          {open ? 'Ocultar' : 'Gestionar'}
        </button>
      </h2>
      {open && (loading ? <p>Cargando…</p> : (
        <div className="img-admin-grid">
          {imgs.map(i => (
            <div key={i.id} className={`img-admin-card${i.es_principal ? ' principal' : ''}${i.estado === 'pendiente' ? ' pendiente' : ''}`}>
              <img src={i.url} alt="" loading="lazy" onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }} />
              <div className="img-admin-meta">
                <span className="img-fuente">{i.fuente || '—'}</span>
                {i.estado === 'pendiente' && <span className="img-pend">pendiente</span>}
                {i.es_principal && <span className="img-prin">★ principal</span>}
                {i.usuario_nombre && <span className="img-user">{i.usuario_nombre}</span>}
              </div>
              <div className="img-admin-actions">
                {!i.es_principal && <button onClick={() => handlePrincipal(i.id)} title="Marcar como principal">★</button>}
                {i.estado === 'pendiente' && <button onClick={() => handleAprobar(i.id)} title="Aprobar">✓</button>}
                <button className="del" onClick={() => handleDelete(i.id)} title="Eliminar">🗑</button>
              </div>
            </div>
          ))}
          {!imgs.length && <p>Sin imágenes.</p>}
        </div>
      ))}
    </section>
  );
}
