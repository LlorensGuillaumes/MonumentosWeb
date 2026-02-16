import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './MonumentoCard.css';

// Iconos por tipo/categoría
const getIcon = (tipo, categoria) => {
  const cat = (categoria || '').toLowerCase();
  const t = (tipo || '').toLowerCase();

  if (cat.includes('arqueol')) return '🏺';
  if (cat.includes('etnol')) return '🏚️';
  if (t.includes('castillo') || t.includes('fortaleza') || t.includes('torre')) return '🏰';
  if (t.includes('iglesia') || t.includes('catedral') || t.includes('ermita') || t.includes('convento')) return '⛪';
  if (t.includes('palacio') || t.includes('casa')) return '🏛️';
  if (t.includes('puente')) return '🌉';
  if (t.includes('molino')) return '🏭';
  if (cat.includes('arquitect')) return '🏛️';
  return '📍';
};

export default function MonumentoCard({ monumento }) {
  const icon = getIcon(monumento.tipo, monumento.categoria);
  const { compareList, addToCompare, removeFromCompare } = useApp();
  const isInCompare = compareList.some(m => m.id === monumento.id);

  return (
    <div className="monumento-card-wrapper">
      <Link to={`/monumento/${monumento.id}`} className="monumento-card">
        <div className="card-image">
          {monumento.imagen_url ? (
            <img src={monumento.imagen_url} alt={monumento.denominacion} loading="lazy" onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }} />
          ) : (
            <div className="card-placeholder">
              <span className="placeholder-icon">{icon}</span>
            </div>
          )}
          <span className="card-icon">{icon}</span>
        </div>
        <div className="card-content">
          <h3 className="card-title">{monumento.denominacion}</h3>
          <div className="card-location">
            <span className="location-icon">📍</span>
            {monumento.municipio || monumento.provincia || monumento.comunidad_autonoma}
          </div>
          {monumento.categoria && (
            <span className="card-category">{monumento.categoria}</span>
          )}
          {monumento.estilo && (
            <span className="card-style">{monumento.estilo}</span>
          )}
        </div>
      </Link>
      <button
        className={`card-compare-btn ${isInCompare ? 'active' : ''}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          isInCompare ? removeFromCompare(monumento.id) : addToCompare(monumento);
        }}
        title={isInCompare ? 'Remove from compare' : 'Add to compare'}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
        </svg>
      </button>
    </div>
  );
}
