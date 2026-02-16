import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getRutas, getRuta, deleteRuta, getRutaPdfUrl, shareRuta } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RoutesSkeleton } from '../components/Skeleton';
import PremiumCTA from '../components/PremiumCTA';
import './MyRoutes.css';

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateGPX(name, waypoints) {
  const escXml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const wpts = waypoints.map(w =>
    `  <wpt lat="${w.latitud}" lon="${w.longitud}">\n    <name>${escXml(w.denominacion || '')}</name>\n    <desc>${escXml([w.municipio].filter(Boolean).join(', '))}</desc>\n  </wpt>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="PatrimonioEuropeo"\n  xmlns="http://www.topografix.com/GPX/1/1">\n  <metadata><name>${escXml(name)}</name></metadata>\n${wpts}\n</gpx>`;
}

function generateKML(name, waypoints) {
  const escXml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const placemarks = waypoints.map(w =>
    `    <Placemark>\n      <name>${escXml(w.denominacion || '')}</name>\n      <description>${escXml([w.municipio].filter(Boolean).join(', '))}</description>\n      <Point><coordinates>${w.longitud},${w.latitud},0</coordinates></Point>\n    </Placemark>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Document>\n    <name>${escXml(name)}</name>\n${placemarks}\n  </Document>\n</kml>`;
}

export default function MyRoutes() {
  const { t } = useTranslation();
  const { isPremium } = useAuth();
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [exporting, setExporting] = useState(null);
  const [sharing, setSharing] = useState(null);
  const [shareUrl, setShareUrl] = useState({});

  useEffect(() => {
    getRutas()
      .then(setRutas)
      .catch(() => setRutas([]))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async (ruta, format) => {
    setExporting(`${ruta.id}-${format}`);
    try {
      const data = await getRuta(ruta.id);
      const paradas = data.paradas || [];
      if (format === 'gpx') {
        downloadFile(generateGPX(ruta.nombre, paradas), `${ruta.nombre}.gpx`, 'application/gpx+xml');
      } else {
        downloadFile(generateKML(ruta.nombre, paradas), `${ruta.nombre}.kml`, 'application/vnd.google-earth.kml+xml');
      }
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(null);
    }
  };

  const handleShare = async (ruta) => {
    setSharing(ruta.id);
    try {
      const data = await shareRuta(ruta.id);
      const url = `${window.location.origin}/ruta-publica/${data.share_id || ruta.id}`;
      setShareUrl(prev => ({ ...prev, [ruta.id]: url }));
      navigator.clipboard.writeText(url).catch(() => {});
    } catch {
      // Fallback: generate simple shareable URL
      const url = `${window.location.origin}/ruta-publica/${ruta.id}`;
      setShareUrl(prev => ({ ...prev, [ruta.id]: url }));
      navigator.clipboard.writeText(url).catch(() => {});
    } finally {
      setSharing(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('myRoutes.confirmDelete'))) return;
    setDeleting(id);
    try {
      await deleteRuta(id);
      setRutas(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="my-routes">
        <div className="my-routes-header">
          <h1>{t('myRoutes.title')}</h1>
        </div>
        <RoutesSkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="my-routes">
      <div className="my-routes-header">
        <h1>{t('myRoutes.title')}</h1>
        <Link to="/rutas" className="btn btn-primary">
          {t('myRoutes.createNew')}
        </Link>
      </div>

      {!isPremium && <PremiumCTA />}

      {rutas.length === 0 ? (
        <div className="my-routes-empty">
          <p>{t('myRoutes.empty')}</p>
          <Link to="/rutas" className="btn btn-primary">
            {t('myRoutes.createFirst')}
          </Link>
        </div>
      ) : (
        <div className="my-routes-list">
          {rutas.map(ruta => (
            <div key={ruta.id} className="my-route-card">
              <div className="my-route-info">
                <h3>{ruta.nombre}</h3>
                <div className="my-route-meta">
                  <span>{new Date(ruta.created_at).toLocaleDateString()}</span>
                  {ruta.radio_km && <span>{ruta.radio_km} km {t('myRoutes.radius')}</span>}
                </div>
              </div>
              <div className="my-route-actions">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => handleShare(ruta)}
                  disabled={sharing === ruta.id}
                  title={t('myRoutes.share')}
                >
                  {shareUrl[ruta.id] ? '✓ ' + t('myRoutes.copied') : sharing === ruta.id ? '...' : t('myRoutes.share')}
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => handleExport(ruta, 'gpx')}
                  disabled={exporting === `${ruta.id}-gpx`}
                >
                  {exporting === `${ruta.id}-gpx` ? '...' : 'GPX'}
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => handleExport(ruta, 'kml')}
                  disabled={exporting === `${ruta.id}-kml`}
                >
                  {exporting === `${ruta.id}-kml` ? '...' : 'KML'}
                </button>
                {isPremium && (
                  <a
                    href={getRutaPdfUrl(ruta.id)}
                    className="btn btn-outline btn-sm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    PDF
                  </a>
                )}
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(ruta.id)}
                  disabled={deleting === ruta.id}
                >
                  {deleting === ruta.id ? '...' : t('myRoutes.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
