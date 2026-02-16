import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMapEvents } from 'react-leaflet';
import { getMonumentosRadio, getMonumentos, getMonumento, optimizarRuta, createRuta, getRutaPdfUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PremiumCTA from '../components/PremiumCTA';
import 'leaflet/dist/leaflet.css';
import './RoutePlanner.css';

const MAX_STOPS = 25;
const RADIUS_OPTIONS = [10, 25, 50, 100];

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

function generateGPX(name, waypoints, trackCoords) {
  const escXml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const wpts = waypoints.map(w =>
    `  <wpt lat="${w.latitud}" lon="${w.longitud}">\n    <name>${escXml(w.denominacion || '')}</name>\n    <desc>${escXml([w.municipio, w.provincia].filter(Boolean).join(', '))}</desc>\n  </wpt>`
  ).join('\n');
  let trk = '';
  if (trackCoords && trackCoords.length > 1) {
    const pts = trackCoords.map(([lat, lng]) => `      <trkpt lat="${lat}" lon="${lng}" />`).join('\n');
    trk = `\n  <trk>\n    <name>${escXml(name)}</name>\n    <trkseg>\n${pts}\n    </trkseg>\n  </trk>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="PatrimonioEuropeo"\n  xmlns="http://www.topografix.com/GPX/1/1">\n  <metadata><name>${escXml(name)}</name></metadata>\n${wpts}${trk}\n</gpx>`;
}

function generateKML(name, waypoints, trackCoords) {
  const escXml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const placemarks = waypoints.map(w =>
    `    <Placemark>\n      <name>${escXml(w.denominacion || '')}</name>\n      <description>${escXml([w.municipio, w.provincia].filter(Boolean).join(', '))}</description>\n      <Point><coordinates>${w.longitud},${w.latitud},0</coordinates></Point>\n    </Placemark>`
  ).join('\n');
  let line = '';
  if (trackCoords && trackCoords.length > 1) {
    const coords = trackCoords.map(([lat, lng]) => `${lng},${lat},0`).join(' ');
    line = `\n    <Placemark>\n      <name>${escXml(name)}</name>\n      <LineString><coordinates>${coords}</coordinates></LineString>\n    </Placemark>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Document>\n    <name>${escXml(name)}</name>\n${placemarks}${line}\n  </Document>\n</kml>`;
}

function MapClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    },
  });
  return null;
}

export default function RoutePlanner() {
  const { t } = useTranslation();
  const { user, isPremium } = useAuth();

  // Search mode
  const [searchMode, setSearchMode] = useState('radio');
  const [searchMunicipio, setSearchMunicipio] = useState('');

  // Search state
  const [center, setCenter] = useState(null);
  const [radius, setRadius] = useState(25);
  const [filterPais, setFilterPais] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [searchText, setSearchText] = useState('');
  const [monuments, setMonuments] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Selection state
  const [selected, setSelected] = useState(new Set());

  // Detail modal state
  const [detailMonument, setDetailMonument] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Route state
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState(null);

  // Save state
  const [routeName, setRouteName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedRuta, setSavedRuta] = useState(null);
  const [saveError, setSaveError] = useState('');

  const resetResults = () => {
    setMonuments([]);
    setSelected(new Set());
    setRouteData(null);
    setRouteGeometry(null);
    setSavedRuta(null);
  };

  const handleMapClick = useCallback((latlng) => {
    setCenter({ lat: latlng.lat, lng: latlng.lng });
    resetResults();
  }, []);

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleMapClick({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {}
    );
  };

  const handleSearchRadius = async () => {
    if (!center) return;
    setSearchLoading(true);
    setRouteData(null);
    setRouteGeometry(null);
    setSavedRuta(null);
    try {
      const params = { lat: center.lat, lng: center.lng, km: radius, limit: 200 };
      if (filterPais) params.pais = filterPais;
      if (filterCategoria) params.categoria = filterCategoria;
      const data = await getMonumentosRadio(params);
      setMonuments(data.items || []);
      setSelected(new Set());
    } catch (err) {
      console.error('Error searching:', err);
      setMonuments([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchMunicipio = async () => {
    if (!searchMunicipio.trim()) return;
    setSearchLoading(true);
    setRouteData(null);
    setRouteGeometry(null);
    setSavedRuta(null);
    try {
      const params = { municipio: searchMunicipio.trim(), limit: 200 };
      if (filterPais) params.pais = filterPais;
      if (filterCategoria) params.categoria = filterCategoria;
      const data = await getMonumentos(params);
      setMonuments(data.items || []);
      setSelected(new Set());
    } catch (err) {
      console.error('Error searching:', err);
      setMonuments([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = searchMode === 'radio' ? handleSearchRadius : handleSearchMunicipio;

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_STOPS) {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    const ids = monuments.slice(0, MAX_STOPS).map(m => m.id);
    setSelected(new Set(ids));
  };

  const clearSelection = () => setSelected(new Set());

  const selectedMonuments = monuments.filter(m => selected.has(m.id));

  const handleOpenDetail = async (id) => {
    setDetailLoading(true);
    try {
      const data = await getMonumento(id);
      setDetailMonument(data);
    } catch (err) {
      console.error('Error loading detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOptimize = async () => {
    if (selectedMonuments.length < 2) return;
    setRouteLoading(true);
    try {
      const paradas = selectedMonuments.map(m => ({
        id: m.id,
        latitud: m.latitud,
        longitud: m.longitud,
      }));
      const result = await optimizarRuta(paradas);
      setRouteData(result);
      // Reorder selected monuments
      if (result.orden_optimizado) {
        const reordered = result.orden_optimizado.map(i => selectedMonuments[i]);
        // Update selection order by rebuilding the set in order
        setSelected(new Set(reordered.map(m => m.id)));
      }
      if (result.geometria) {
        setRouteGeometry(result.geometria.coordinates.map(([lng, lat]) => [lat, lng]));
      }
    } catch (err) {
      console.error('Error optimizing:', err);
    } finally {
      setRouteLoading(false);
    }
  };

  const getGoogleMapsUrl = () => {
    if (selectedMonuments.length === 0) return '#';
    const waypoints = selectedMonuments.map(m => `${m.latitud},${m.longitud}`);
    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const middle = waypoints.slice(1, -1).join('|');
    let url = `https://www.google.com/maps/dir/${origin}`;
    if (middle) url += `/${middle}`;
    url += `/${destination}`;
    return url;
  };

  const handleSaveRoute = async () => {
    if (!routeName.trim() || selectedMonuments.length === 0) return;
    setSaving(true);
    setSaveError('');
    try {
      const paradas = selectedMonuments.map((m, i) => ({
        bien_id: m.id,
        orden: i + 1,
      }));
      const ruta = await createRuta({
        nombre: routeName.trim(),
        centro_lat: center?.lat,
        centro_lng: center?.lng,
        radio_km: radius,
        paradas,
      });
      setSavedRuta(ruta);
    } catch (err) {
      if (err.response?.data?.code === 'PREMIUM_REQUIRED') {
        setSaveError(t('routes.premiumRequired'));
      } else {
        setSaveError(err.response?.data?.error || 'Error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSearchModeChange = (mode) => {
    setSearchMode(mode);
    resetResults();
  };

  return (
    <div className="route-planner">
      <div className="route-header-row">
        <h1>{t('routes.title')}</h1>
        <Link to="/mis-rutas" className="btn btn-outline">{t('routes.myRoutes')}</Link>
      </div>

      <div className="route-layout">
        {/* Map */}
        <div className="route-map-container">
          <MapContainer
            center={center ? [center.lat, center.lng] : [40.4, -3.7]}
            zoom={center ? 10 : 6}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapClickHandler onClick={handleMapClick} />
            {center && (
              <>
                <Marker position={[center.lat, center.lng]}>
                  <Popup>{t('routes.center')}</Popup>
                </Marker>
                {searchMode === 'radio' && (
                  <Circle
                    center={[center.lat, center.lng]}
                    radius={radius * 1000}
                    pathOptions={{ color: '#3b82f6', fillOpacity: 0.05, weight: 1 }}
                  />
                )}
              </>
            )}
            {monuments.map(m => (
              <Marker
                key={m.id}
                position={[m.latitud, m.longitud]}
                opacity={selected.has(m.id) ? 1 : 0.5}
                eventHandlers={{ click: () => toggleSelect(m.id) }}
              >
                <Popup>
                  <strong>{m.denominacion}</strong><br />
                  {m.municipio}
                  {m.distancia_km != null && <><br />{m.distancia_km.toFixed(1)} km</>}
                </Popup>
              </Marker>
            ))}
            {routeGeometry && (
              <Polyline positions={routeGeometry} pathOptions={{ color: '#2563eb', weight: 3 }} />
            )}
          </MapContainer>
        </div>

        {/* Sidebar */}
        <div className="route-sidebar">
          {/* Search mode tabs */}
          <div className="route-search-mode">
            <button
              className={`route-mode-tab ${searchMode === 'radio' ? 'active' : ''}`}
              onClick={() => handleSearchModeChange('radio')}
            >
              {t('routes.searchByRadius')}
            </button>
            <button
              className={`route-mode-tab ${searchMode === 'municipio' ? 'active' : ''}`}
              onClick={() => handleSearchModeChange('municipio')}
            >
              {t('routes.searchByMunicipality')}
            </button>
          </div>

          {/* Step 1: Set center (radio mode) */}
          {searchMode === 'radio' && (
            <div className="route-step">
              <h3>{t('routes.step1')}</h3>
              <p className="route-hint">{t('routes.step1Hint')}</p>
              <button className="btn btn-outline btn-sm" onClick={handleGeolocate}>
                {t('routes.useMyLocation')}
              </button>
              {center && (
                <span className="route-center-info">
                  {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
                </span>
              )}
            </div>
          )}

          {/* Step 2: Search params */}
          <div className="route-step">
            <h3>{searchMode === 'radio' ? t('routes.step2') : t('routes.step1').replace('1.', '1.')}</h3>

            {searchMode === 'municipio' && (
              <div className="route-filters">
                <label>
                  <span>{t('filters.municipality')}</span>
                  <input
                    type="text"
                    placeholder={t('routes.municipalityPlaceholder')}
                    value={searchMunicipio}
                    onChange={e => setSearchMunicipio(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  />
                </label>
              </div>
            )}

            <div className="route-filters">
              {searchMode === 'radio' && (
                <label>
                  <span>{t('routes.radius')}</span>
                  <select value={radius} onChange={e => setRadius(parseInt(e.target.value))}>
                    {RADIUS_OPTIONS.map(r => (
                      <option key={r} value={r}>{r} km</option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                <span>{t('routes.country')}</span>
                <select value={filterPais} onChange={e => setFilterPais(e.target.value)}>
                  <option value="">{t('routes.allCountries')}</option>
                  <option value="España">España</option>
                  <option value="Francia">Francia</option>
                  <option value="Portugal">Portugal</option>
                  <option value="Italia">Italia</option>
                </select>
              </label>
              <label>
                <span>{t('routes.category')}</span>
                <input
                  type="text"
                  placeholder={t('routes.categoryPlaceholder')}
                  value={filterCategoria}
                  onChange={e => setFilterCategoria(e.target.value)}
                />
              </label>
            </div>
            <button
              className="btn btn-primary btn-block"
              onClick={handleSearch}
              disabled={searchMode === 'radio' ? (!center || searchLoading) : (!searchMunicipio.trim() || searchLoading)}
            >
              {searchLoading ? t('routes.searching') : t('routes.search')}
            </button>
          </div>

          {/* Step 3: Results & selection */}
          {monuments.length > 0 && (
            <div className="route-step">
              <h3>{searchMode === 'radio' ? t('routes.step3') : t('routes.step3').replace('3.', '2.')}</h3>
              <div className="route-selection-bar">
                <span>{selected.size} / {MAX_STOPS} {t('routes.selected')}</span>
                <button className="btn-link" onClick={selectAll}>{t('routes.selectAll')}</button>
                <button className="btn-link" onClick={clearSelection}>{t('routes.clearSelection')}</button>
              </div>
              <div className="route-monuments-list">
                {monuments.map(m => (
                  <div
                    key={m.id}
                    className={`route-monument-item ${selected.has(m.id) ? 'selected' : ''}`}
                    onClick={() => handleOpenDetail(m.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(m.id)}
                      onChange={() => toggleSelect(m.id)}
                      onClick={e => e.stopPropagation()}
                    />
                    <div className="route-monument-img">
                      <img
                        src={m.imagen_url || '/no-image.svg'}
                        alt=""
                        loading="lazy"
                        onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }}
                      />
                    </div>
                    <div className="route-monument-info">
                      <strong>{m.denominacion}</strong>
                      <span>{[m.municipio, m.provincia].filter(Boolean).join(', ')}</span>
                      {m.distancia_km != null && (
                        <span className="route-monument-dist">{m.distancia_km.toFixed(1)} km</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Optimize & actions */}
          {selected.size >= 2 && (
            <div className="route-step">
              <h3>{searchMode === 'radio' ? t('routes.step4') : t('routes.step4').replace('4.', '3.')}</h3>

              {!isPremium && <PremiumCTA />}

              <button
                className="btn btn-primary btn-block"
                onClick={handleOptimize}
                disabled={routeLoading || !isPremium}
              >
                {routeLoading ? t('routes.optimizing') : t('routes.optimize')}
              </button>

              {routeData && (
                <div className="route-summary">
                  <div className="route-summary-stat">
                    <span className="route-summary-num">{routeData.distancia_km} km</span>
                    <span>{t('routes.totalDistance')}</span>
                  </div>
                  <div className="route-summary-stat">
                    <span className="route-summary-num">
                      {routeData.duracion_min < 60
                        ? `${routeData.duracion_min} min`
                        : `${Math.floor(routeData.duracion_min / 60)}h ${routeData.duracion_min % 60}m`}
                    </span>
                    <span>{t('routes.estimatedTime')}</span>
                  </div>
                </div>
              )}

              <div className="route-actions">
                <a
                  href={getGoogleMapsUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-block"
                >
                  {t('routes.openGoogleMaps')}
                </a>
                <div className="route-export-row">
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      const name = routeName.trim() || 'Ruta';
                      downloadFile(generateGPX(name, selectedMonuments, routeGeometry), `${name}.gpx`, 'application/gpx+xml');
                    }}
                  >
                    {t('routes.exportGPX')}
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      const name = routeName.trim() || 'Ruta';
                      downloadFile(generateKML(name, selectedMonuments, routeGeometry), `${name}.kml`, 'application/vnd.google-earth.kml+xml');
                    }}
                  >
                    {t('routes.exportKML')}
                  </button>
                </div>

                {savedRuta ? (
                  <a
                    href={getRutaPdfUrl(savedRuta.id)}
                    className="btn btn-primary btn-block"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('routes.downloadPdf')}
                  </a>
                ) : (
                  <div className="route-save-form">
                    <input
                      type="text"
                      placeholder={t('routes.routeNamePlaceholder')}
                      value={routeName}
                      onChange={e => setRouteName(e.target.value)}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={handleSaveRoute}
                      disabled={saving || !routeName.trim()}
                    >
                      {saving ? t('routes.saving') : t('routes.saveAndPdf')}
                    </button>
                    {saveError && <span className="route-save-error">{saveError}</span>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {(detailMonument || detailLoading) && (
        <div className="route-detail-overlay" onClick={() => { setDetailMonument(null); setDetailLoading(false); }}>
          <div className="route-detail-modal" onClick={e => e.stopPropagation()}>
            {detailLoading && !detailMonument ? (
              <div className="route-detail-loading">{t('detail.loading')}</div>
            ) : detailMonument && (
              <>
                <button className="route-detail-close" onClick={() => setDetailMonument(null)}>&times;</button>
                {detailMonument.imagen_url && (
                  <div className="route-detail-image">
                    <img
                      src={detailMonument.imagen_url}
                      alt={detailMonument.denominacion}
                      onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }}
                    />
                  </div>
                )}
                <div className="route-detail-body">
                  <h2>{detailMonument.denominacion}</h2>
                  <p className="route-detail-location">
                    {[detailMonument.municipio, detailMonument.provincia, detailMonument.comunidad_autonoma].filter(Boolean).join(', ')}
                  </p>
                  <div className="route-detail-tags">
                    {detailMonument.categoria && <span className="route-detail-tag">{detailMonument.categoria}</span>}
                    {detailMonument.tipo_bien && <span className="route-detail-tag">{detailMonument.tipo_bien}</span>}
                    {detailMonument.estilo && <span className="route-detail-tag">{detailMonument.estilo}</span>}
                  </div>
                  {detailMonument.descripcion && (
                    <div className="route-detail-desc">
                      <p>{detailMonument.descripcion}</p>
                    </div>
                  )}
                  <div className="route-detail-actions">
                    <Link
                      to={`/monumento/${detailMonument.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                    >
                      {t('routes.viewDetail')}
                    </Link>
                    <button className="btn btn-outline btn-sm" onClick={() => setDetailMonument(null)}>
                      {t('routes.closeDetail')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
