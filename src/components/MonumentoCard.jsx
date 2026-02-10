import { Link } from 'react-router-dom';
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

  return (
    <Link to={`/monumento/${monumento.id}`} className="monumento-card">
      <div className="card-image">
        {monumento.imagen_url ? (
          <img src={monumento.imagen_url} alt={monumento.denominacion} loading="lazy" />
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
  );
}
