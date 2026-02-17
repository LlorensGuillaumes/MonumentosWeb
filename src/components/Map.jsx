import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, useMap, CircleMarker, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { getGeoJSON, getCCAAResumen } from '../services/api';
import 'leaflet/dist/leaflet.css';
import './Map.css';

// Colores por clasificación normalizada (usa tipo_monumento del backend)
const TIPO_TO_COLOR = {
  // Religiosa → rosa
  'Iglesia / Ermita': '#be185d',
  'Catedral': '#be185d',
  'Monasterio / Convento': '#be185d',
  'Arte religioso': '#be185d',
  'Mezquita / Sinagoga': '#be185d',
  'Cruz / Crucero': '#be185d',
  // Militar → violeta
  'Castillo / Fortaleza': '#7c3aed',
  'Torre': '#7c3aed',
  'Muralla': '#7c3aed',
  // Civil → azul
  'Edificio civil': '#0369a1',
  'Palacio': '#0369a1',
  'Casa señorial / Mansión': '#0369a1',
  'Teatro': '#0369a1',
  'Museo': '#0369a1',
  'Monumento conmemorativo': '#0369a1',
  // Arqueológica → marrón
  'Yacimiento arqueológico': '#92400e',
  'Megalítico': '#92400e',
  // Etnológica → verde
  'Arquitectura rural': '#065f46',
  'Molino': '#065f46',
  'Patrimonio industrial': '#065f46',
  // Infraestructura → gris
  'Puente': '#475569',
  'Acueducto': '#475569',
  'Fuente': '#475569',
  'Faro': '#475569',
  'Obra hidráulica': '#475569',
  'Plaza de toros': '#475569',
  'Cementerio': '#475569',
  'Balneario / Termas': '#475569',
};

const getCategoryColor = (tipoMonumento, categoria) => {
  if (tipoMonumento && TIPO_TO_COLOR[tipoMonumento]) return TIPO_TO_COLOR[tipoMonumento];
  // Fallback para monumentos sin tipo_monumento asignado
  const cat = (categoria || '').toLowerCase();
  if (cat.includes('arqueol') || cat.includes('archeol')) return '#92400e';
  if (cat.includes('etnol') || cat.includes('ethnol')) return '#065f46';
  if (cat.includes('militar') || cat.includes('military')) return '#7c3aed';
  if (cat.includes('religio') || cat.includes('cultu')) return '#be185d';
  if (cat.includes('civil')) return '#0369a1';
  return '#3b82f6';
};

// Componente para manejar eventos del mapa (usa refs para evitar closures obsoletas)
function MapEvents({ onBoundsChange }) {
  const callbackRef = useRef(onBoundsChange);
  callbackRef.current = onBoundsChange;

  const map = useMap();

  useEffect(() => {
    const handler = () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      callbackRef.current?.({
        minLon: bounds.getWest(),
        minLat: bounds.getSouth(),
        maxLon: bounds.getEast(),
        maxLat: bounds.getNorth(),
        zoom,
      });
    };
    map.on('moveend', handler);
    return () => map.off('moveend', handler);
  }, [map]);

  return null;
}

export default function Map({ filters = {}, height = '500px', onMarkerClick, showCCAASummary = true }) {
  const [markers, setMarkers] = useState([]);
  const [ccaaMarkers, setCCAAMarkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentBounds, setCurrentBounds] = useState(null);
  const [zoom, setZoom] = useState(6);
  const [viewMode, setViewMode] = useState('ccaa'); // 'ccaa' o 'detail'
  const navigate = useNavigate();
  const loadingRef = useRef(false);
  const { t } = useTranslation();
  const { mapBounds: savedMapBounds, setMapBounds } = useApp();

  // Centro según país seleccionado en filtros
  const getDefaultView = () => {
    switch (filters.pais) {
      case 'Portugal': return { center: [39.5, -8.0], zoom: 7 };
      case 'Francia': return { center: [46.6, 2.2], zoom: 6 };
      case 'España': return { center: [40.4, -3.7], zoom: 6 };
      case 'Italia': return { center: [41.9, 12.5], zoom: 6 };
      default: return { center: [44.0, 6.0], zoom: 5 }; // Vista Europa occidental
    }
  };

  // Restaurar posición guardada si existe, si no usar la por defecto
  const getInitialView = () => {
    if (savedMapBounds?.center) {
      return { center: savedMapBounds.center, zoom: savedMapBounds.zoom || 6 };
    }
    return getDefaultView();
  };
  const { center: defaultCenter, zoom: defaultZoom } = getInitialView();

  const loadMarkers = useCallback(async (bbox, currentZoom) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const params = { ...filters };

      // Ajustar límite según zoom
      // Zoom bajo = menos detalle, zoom alto = más detalle
      if (currentZoom >= 10) {
        params.limit = 10000;
      } else if (currentZoom >= 8) {
        params.limit = 5000;
      } else if (currentZoom >= 6) {
        params.limit = 3000;
      } else {
        params.limit = 1500;
      }

      // Siempre usar bbox para cargar solo lo visible
      if (bbox) {
        params.bbox = `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;
      }

      const geojson = await getGeoJSON(params);
      setMarkers(geojson.features || []);
    } catch (err) {
      console.error('Error loading markers:', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [filters]);

  // Cargar resumen de CCAA/regiones
  const loadCCAAResumen = useCallback(async () => {
    try {
      const params = {};
      if (filters.pais) params.pais = filters.pais;
      const geojson = await getCCAAResumen(params);
      setCCAAMarkers(geojson.features || []);
    } catch (err) {
      console.error('Error loading CCAA summary:', err);
    }
  }, [filters.pais]);

  // Refs para acceder al estado actual dentro de efectos sin añadirlos como dependencia
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const boundsRef = useRef(currentBounds);
  boundsRef.current = currentBounds;

  // Detectar si hay filtros de contenido activos (no geográficos)
  const hasContentFilters = filters.clasificacion || filters.estilo ||
    filters.tipo_monumento || filters.periodo || filters.q;

  // Cargar inicial y recargar al cambiar filtros
  useEffect(() => {
    // Bounds por defecto cuando no tenemos bounds reales del mapa
    const fallbackBounds = { minLon: -18.5, minLat: 27, maxLon: 25, maxLat: 52, zoom: defaultZoom };
    const effectiveBounds = boundsRef.current || fallbackBounds;

    if (showCCAASummary) {
      if (viewModeRef.current === 'detail') {
        // Ya en detalle: recargar marcadores con los nuevos filtros
        loadMarkers(effectiveBounds, effectiveBounds.zoom || zoom);
      } else if (hasContentFilters) {
        // Filtro de contenido aplicado en vista CCAA: cambiar a detalle automáticamente
        setViewMode('detail');
        loadMarkers(effectiveBounds, effectiveBounds.zoom || zoom);
      } else {
        // Sin filtros de contenido: vista CCAA normal
        loadCCAAResumen();
        setViewMode('ccaa');
      }
    } else {
      loadMarkers(fallbackBounds, defaultZoom);
      setViewMode('detail');
    }
  }, [filters, showCCAASummary, loadCCAAResumen]);

  const handleBoundsChange = useCallback((newBounds) => {
    setCurrentBounds(newBounds);
    setZoom(newBounds.zoom);

    // Persistir posición en contexto para restaurar al volver de detalle
    setMapBounds({
      ...newBounds,
      center: [(newBounds.minLat + newBounds.maxLat) / 2, (newBounds.minLon + newBounds.maxLon) / 2],
    });

    // Cambiar de vista CCAA a detalle cuando el zoom es alto
    if (showCCAASummary && newBounds.zoom >= 7 && viewMode === 'ccaa') {
      setViewMode('detail');
      loadMarkers(newBounds, newBounds.zoom);
    } else if (showCCAASummary && newBounds.zoom < 7 && viewMode === 'detail' && !hasContentFilters) {
      // Volver a vista CCAA solo si no hay filtros de contenido activos
      setViewMode('ccaa');
    } else if (viewMode === 'detail') {
      // Recargar detalle (cualquier zoom si hay filtros activos, o zoom >= 7 sin filtros)
      loadMarkers(newBounds, newBounds.zoom);
    }
  }, [loadMarkers, showCCAASummary, viewMode, hasContentFilters]);

  const handleMarkerClick = (feature) => {
    if (onMarkerClick) {
      onMarkerClick(feature);
    } else {
      navigate(`/monumento/${feature.properties.id}`);
    }
  };

  // Opciones del cluster
  const clusterOptions = useMemo(() => ({
    chunkedLoading: true,
    maxClusterRadius: 60,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    disableClusteringAtZoom: 15,
    iconCreateFunction: (cluster) => {
      const count = cluster.getChildCount();
      let size = 'small';
      let sizeClass = 30;

      if (count > 1000) {
        size = 'xlarge';
        sizeClass = 50;
      } else if (count > 500) {
        size = 'large';
        sizeClass = 44;
      } else if (count > 100) {
        size = 'medium';
        sizeClass = 38;
      }

      return L.divIcon({
        html: `<div class="cluster-icon cluster-${size}">
                 <span>${count > 999 ? Math.round(count/1000) + 'k' : count}</span>
               </div>`,
        className: 'custom-cluster-icon',
        iconSize: [sizeClass, sizeClass],
      });
    },
  }), []);

  return (
    <div className="map-container" style={{ height }}>
      {loading && <div className="map-loading">{t('map.loading')}</div>}

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        preferCanvas={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapEvents onBoundsChange={handleBoundsChange} />

        {/* Vista resumen CCAA */}
        {viewMode === 'ccaa' && ccaaMarkers.map((feature) => {
          const count = feature.properties.total;
          const size = count > 20000 ? 60 : count > 10000 ? 50 : count > 5000 ? 42 : 35;
          return (
            <Marker
              key={feature.properties.region}
              position={[
                feature.geometry.coordinates[1],
                feature.geometry.coordinates[0],
              ]}
              icon={L.divIcon({
                html: `<div class="ccaa-marker" style="width:${size}px;height:${size}px">
                         <span class="ccaa-count">${count > 999 ? Math.round(count/1000) + 'k' : count}</span>
                         <span class="ccaa-name">${feature.properties.region.replace('Comunidad de ', '').replace('Comunitat ', '').replace('Region de ', '').substring(0, 10)}</span>
                       </div>`,
                className: 'ccaa-marker-wrapper',
                iconSize: [size, size + 15],
                iconAnchor: [size/2, size/2 + 7],
              })}
            >
              <Popup>
                <div className="popup-content">
                  <h4>{feature.properties.region}</h4>
                  <p><strong>{feature.properties.total.toLocaleString()}</strong> {t('map.monuments')}</p>
                  <p className="zoom-hint">{t('map.zoomHint')}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Vista detalle con clustering */}
        {viewMode === 'detail' && (
          <MarkerClusterGroup {...clusterOptions}>
            {markers.map((feature) => (
              <CircleMarker
                key={feature.properties.id}
                center={[
                  feature.geometry.coordinates[1],
                  feature.geometry.coordinates[0],
                ]}
                radius={6}
                pathOptions={{
                  fillColor: getCategoryColor(feature.properties.tipo_monumento, feature.properties.categoria),
                  fillOpacity: 0.8,
                  color: '#fff',
                  weight: 1,
                }}
                eventHandlers={{
                  click: () => handleMarkerClick(feature),
                }}
              >
                <Popup>
                  <div className="popup-content">
                    <h4>{feature.properties.nombre}</h4>
                    <p>{feature.properties.municipio}, {feature.properties.provincia}</p>
                    {feature.properties.tipo_monumento && (
                      <span className="popup-tag popup-tag-tipo">{feature.properties.tipo_monumento}</span>
                    )}
                    {feature.properties.periodo && (
                      <span className="popup-tag popup-tag-periodo">{feature.properties.periodo}</span>
                    )}
                    {!feature.properties.tipo_monumento && feature.properties.categoria && (
                      <span className="popup-tag">{feature.properties.categoria}</span>
                    )}
                    {feature.properties.imagen && (
                      <img
                        src={feature.properties.imagen}
                        alt={feature.properties.nombre}
                        className="popup-image"
                        loading="lazy"
                        onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }}
                      />
                    )}
                    <button
                      className="popup-btn"
                      onClick={() => handleMarkerClick(feature)}
                    >
                      {t('map.viewDetail')}
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MarkerClusterGroup>
        )}
      </MapContainer>

      <div className="map-legend">
        <span className="legend-item"><span className="legend-dot" style={{background: '#7c3aed'}}></span> {t('map.legend.castles')}</span>
        <span className="legend-item"><span className="legend-dot" style={{background: '#be185d'}}></span> {t('map.legend.churches')}</span>
        <span className="legend-item"><span className="legend-dot" style={{background: '#0369a1'}}></span> {t('map.legend.palaces')}</span>
        <span className="legend-item"><span className="legend-dot" style={{background: '#92400e'}}></span> {t('map.legend.archaeology')}</span>
        <span className="legend-item"><span className="legend-dot" style={{background: '#065f46'}}></span> {t('map.legend.ethnologic')}</span>
        <span className="legend-item"><span className="legend-dot" style={{background: '#475569'}}></span> {t('map.legend.infrastructure')}</span>
        <span className="legend-item"><span className="legend-dot" style={{background: '#3b82f6'}}></span> {t('map.legend.others')}</span>
      </div>

      <div className="map-count">
        {viewMode === 'ccaa'
          ? t('map.monumentsInRegions', {
              count: ccaaMarkers.reduce((sum, f) => sum + f.properties.total, 0).toLocaleString(),
              regions: ccaaMarkers.length
            })
          : t('map.monumentsCount', { count: markers.length.toLocaleString() })
        }
        {viewMode === 'ccaa' && <span className="zoom-hint"> ({t('map.zoomHint')})</span>}
      </div>
    </div>
  );
}
