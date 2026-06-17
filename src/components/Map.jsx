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

// Override Hispania Nostra per als 3 casos de sinèrgia (mateix mapping que a Detail.jsx)
const HN_SYNERGY_OVERRIDE_MAP = {
  230187: 'verde',  // Palacio de Rubalcava
  24724: 'negra',   // Torre del río de la Miel
  24718: 'negra',   // Abrigo del río de la Miel A
  78209: 'roja',    // Castillo de Tejeda — té heritage_label real
};

// Detecta a quina llista HN pertany el bien (Roja / Verde / Negra).
// Prioritat: 1) override sinèrgia hardcoded · 2) camp hn_lista pre-calculat al backend · 3) regex sobre heritage_label/tipo/categoria
const getHNListType = (props) => {
  if (!props) return null;
  if (HN_SYNERGY_OVERRIDE_MAP[props.id]) return HN_SYNERGY_OVERRIDE_MAP[props.id];
  if (props.hn_lista && ['roja','verde','negra'].includes(props.hn_lista)) return props.hn_lista;
  const fields = [props.heritage_label, props.tipo, props.categoria].filter(Boolean);
  for (const f of fields) {
    const m = f.toLowerCase().match(/lista\s+(roja|verde|verda|negra)/);
    if (m) return m[1] === 'verda' ? 'verde' : m[1];
  }
  return null;
};

const HN_COLORS = {
  roja: '#dc2626',
  verde: '#16a34a',
  negra: '#1f2937',
};

// Componente que vuela el mapa a una coordenada cuando cambia flyTo
function FlyToHandler({ flyTo }) {
  const map = useMap();
  useEffect(() => {
    if (flyTo && flyTo.lat != null && flyTo.lng != null) {
      map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom || 16, { duration: 1.2 });
    }
  }, [flyTo, map]);
  return null;
}

// Componente para manejar eventos del mapa (usa refs para evitar closures obsoletas)
function MapEvents({ onBoundsChange }) {
  const callbackRef = useRef(onBoundsChange);
  callbackRef.current = onBoundsChange;

  const map = useMap();

  useEffect(() => {
    let timeout = null;
    const fireBounds = () => {
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
    // Debounce para coalescer múltiples moveend en un único callback
    const debouncedHandler = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(fireBounds, 250);
    };
    map.on('moveend', debouncedHandler);
    // Dispara la carga inicial al montar (con un pequeño delay para evitar duplicados con StrictMode)
    timeout = setTimeout(fireBounds, 100);
    return () => {
      if (timeout) clearTimeout(timeout);
      map.off('moveend', debouncedHandler);
    };
  }, [map]);

  return null;
}

// Componente helper: hace fitBounds cuando cambian los markers extra (citados por el chat).
function FitExtraBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const valid = points.filter(p => p.lat != null && p.lng != null);
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.flyTo([valid[0].lat, valid[0].lng], 12, { duration: 0.8 });
      return;
    }
    const bounds = L.latLngBounds(valid.map(p => [p.lat, p.lng]));
    map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 11, duration: 0.8 });
  }, [points, map]);
  return null;
}

export default function Map({ filters = {}, height = '500px', onMarkerClick, showCCAASummary = true, flyTo = null, highlight = null, extraMarkers = [], fitToExtra = false, showFilters = false, onFiltersChange = null, onlyExtraMarkers = false }) {
  const { mapBounds: savedMapBounds, setMapBounds, mapMarkers: cachedMarkers, mapCCAAMarkers: cachedCCAA, mapViewMode: cachedViewMode, setMapCache } = useApp();
  // Restauramos cache anterior para que al volver del detalle se vean los marcadores aunque la query nueva falle
  // En modo onlyExtraMarkers no se muestra catálogo base.
  const [markers, setMarkers] = useState(() => onlyExtraMarkers ? [] : (cachedMarkers || []));
  const [ccaaMarkers, setCCAAMarkers] = useState(() => onlyExtraMarkers ? [] : (cachedCCAA || []));
  const [loading, setLoading] = useState(false);
  const [currentBounds, setCurrentBounds] = useState(savedMapBounds || null);
  const [zoom, setZoom] = useState(savedMapBounds?.zoom || 6);
  const [viewMode, setViewMode] = useState(() => {
    if (cachedViewMode) return cachedViewMode;
    if (showCCAASummary && savedMapBounds?.zoom >= 7) return 'detail';
    return 'ccaa';
  });

  // Persistir markers en context para restaurarlos al volver del detalle
  useEffect(() => {
    if (onlyExtraMarkers) return;
    if (markers.length > 0 || ccaaMarkers.length > 0) {
      setMapCache({ mapMarkers: markers, mapCCAAMarkers: ccaaMarkers, mapViewMode: viewMode });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, ccaaMarkers, viewMode]);

  // En modo onlyExtraMarkers, mantén markers/ccaa vacíos siempre (sobrescribe cualquier restauración accidental)
  useEffect(() => {
    if (onlyExtraMarkers) {
      setMarkers([]);
      setCCAAMarkers([]);
      setViewMode('detail');
    }
  }, [onlyExtraMarkers]);
  const navigate = useNavigate();
  const loadingRef = useRef(false);
  const { t } = useTranslation();

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

  // Token incremental para descartar respuestas obsoletas si se solapan peticiones
  const loadTokenRef = useRef(0);
  const loadMarkers = useCallback(async (bbox, currentZoom) => {
    if (onlyExtraMarkers) return;
    const myToken = ++loadTokenRef.current;
    setLoading(true);

    try {
      const params = { ...filters };

      // Ajustar límite según zoom (proporcional al área visible)
      if (currentZoom >= 16) {
        params.limit = 200;
      } else if (currentZoom >= 13) {
        params.limit = 1000;
      } else if (currentZoom >= 10) {
        params.limit = 3000;
      } else if (currentZoom >= 8) {
        params.limit = 4000;
      } else if (currentZoom >= 6) {
        params.limit = 2500;
      } else {
        params.limit = 1500;
      }

      if (bbox) {
        params.bbox = `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`;
      }

      // Reintento si recibe 429 (rate limit Render): hasta 2 reintentos con backoff exponencial
      let geojson;
      let attempt = 0;
      while (true) {
        try {
          geojson = await getGeoJSON(params);
          break;
        } catch (err) {
          if (err.response?.status === 429 && attempt < 2 && myToken === loadTokenRef.current) {
            attempt++;
            await new Promise(r => setTimeout(r, 1500 * attempt));
            if (myToken !== loadTokenRef.current) return;
          } else {
            throw err;
          }
        }
      }
      // Solo aplicar si esta petición sigue siendo la más reciente
      if (myToken === loadTokenRef.current) {
        setMarkers(geojson.features || []);
      }
    } catch (err) {
      console.error('Error loading markers:', err);
    } finally {
      if (myToken === loadTokenRef.current) {
        setLoading(false);
      }
    }
  }, [filters]);

  // Cargar resumen de CCAA/regiones (con todos los filtros activos)
  const ccaaTokenRef = useRef(0);
  const loadCCAAResumen = useCallback(async () => {
    if (onlyExtraMarkers) return;
    const myToken = ++ccaaTokenRef.current;
    try {
      let geojson;
      try {
        geojson = await getCCAAResumen(filters);
      } catch (err) {
        if (err.response?.status === 429 && myToken === ccaaTokenRef.current) {
          await new Promise(r => setTimeout(r, 1500));
          if (myToken !== ccaaTokenRef.current) return;
          geojson = await getCCAAResumen(filters);
        } else {
          throw err;
        }
      }
      if (myToken === ccaaTokenRef.current) {
        setCCAAMarkers(geojson.features || []);
      }
    } catch (err) {
      console.error('Error loading CCAA summary:', err);
    }
  }, [filters]);

  // Refs para acceder al estado actual dentro de efectos sin añadirlos como dependencia
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const boundsRef = useRef(currentBounds);
  boundsRef.current = currentBounds;

  // Detectar si hay filtros de contenido activos (no geográficos)
  const hasContentFilters = filters.clasificacion || filters.estilo ||
    filters.tipo_monumento || filters.periodo || filters.q ||
    filters.evento || filters.evento_padre ||
    filters.solo_imagen || filters.solo_wikidata || (filters.hn_listas && filters.hn_listas.length > 0);

  // Recargar SOLO cuando cambian los filtros (la carga inicial la dispara MapEvents al montar)
  // Skip primera ejecución para evitar duplicar la carga inicial.
  const initialMountRef = useRef(true);
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      return;
    }
    const effectiveBounds = boundsRef.current;
    if (!effectiveBounds) return;

    if (showCCAASummary) {
      if (viewModeRef.current === 'detail') {
        loadMarkers(effectiveBounds, effectiveBounds.zoom || zoom);
      } else if (hasContentFilters) {
        setViewMode('detail');
        loadMarkers(effectiveBounds, effectiveBounds.zoom || zoom);
      } else {
        loadCCAAResumen();
        setViewMode('ccaa');
      }
    } else {
      loadMarkers(effectiveBounds, effectiveBounds.zoom || zoom);
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

    if (showCCAASummary && newBounds.zoom >= 7) {
      // Vista detalle: siempre cargar marcadores en zoom alto
      if (viewMode !== 'detail') setViewMode('detail');
      loadMarkers(newBounds, newBounds.zoom);
    } else if (showCCAASummary && newBounds.zoom < 7 && !hasContentFilters) {
      // Vista resumen CCAA: volver a CCAA y refrescar conteos
      if (viewMode !== 'ccaa') setViewMode('ccaa');
      loadCCAAResumen();
    } else if (!showCCAASummary || hasContentFilters) {
      // Sin resumen CCAA o con filtros activos: siempre detalle
      if (viewMode !== 'detail') setViewMode('detail');
      loadMarkers(newBounds, newBounds.zoom);
    }
  }, [loadMarkers, loadCCAAResumen, showCCAASummary, viewMode, hasContentFilters]);

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
        <FlyToHandler flyTo={flyTo} />

        {/* Vista resumen CCAA */}
        {!onlyExtraMarkers && viewMode === 'ccaa' && ccaaMarkers.map((feature) => {
          const count = feature.properties.total;
          const size = count > 20000 ? 60 : count > 10000 ? 50 : count > 5000 ? 42 : 35;
          return (
            <Marker
              key={`${feature.properties.region}-${feature.properties.pais}`}
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
        {!onlyExtraMarkers && viewMode === 'detail' && (
          <MarkerClusterGroup {...clusterOptions}>
            {markers.map((feature) => {
              const hnList = getHNListType(feature.properties);
              const fillColor = hnList
                ? HN_COLORS[hnList]
                : getCategoryColor(feature.properties.tipo_monumento, feature.properties.categoria);
              return (
              <CircleMarker
                key={feature.properties.id}
                center={[
                  feature.geometry.coordinates[1],
                  feature.geometry.coordinates[0],
                ]}
                radius={hnList ? 9 : 6}
                pathOptions={{
                  fillColor,
                  fillOpacity: hnList ? 0.9 : (feature.properties.coords_precision === 'municipio' ? 0.35 : 0.8),
                  color: hnList ? '#fff' : (feature.properties.coords_precision === 'municipio' ? '#888' : '#fff'),
                  weight: hnList ? 2 : 1,
                  dashArray: feature.properties.coords_precision === 'municipio' ? '3,2' : null,
                }}
                eventHandlers={{
                  click: () => handleMarkerClick(feature),
                }}
              >
                <Popup>
                  <div className="popup-content">
                    <h4>{feature.properties.nombre}</h4>
                    <p>{feature.properties.municipio}, {feature.properties.provincia}</p>
                    {feature.properties.coords_precision === 'municipio' && (
                      <p className="popup-aviso-aprox">📍 {t('map.ubicAprox', 'Ubicación aproximada (centro del municipio)')}</p>
                    )}
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
            );})}
          </MarkerClusterGroup>
        )}

        {/* Marcador EXTRA para el monumento seleccionado desde el buscador */}
        {highlight && highlight.lat != null && highlight.lng != null && (
          <Marker
            position={[highlight.lat, highlight.lng]}
            icon={L.divIcon({
              html: `<div class="highlight-marker">
                       <div class="highlight-pulse"></div>
                       <div class="highlight-pin">
                         <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                           <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>
                         </svg>
                       </div>
                     </div>`,
              className: 'highlight-marker-wrapper',
              iconSize: [40, 50],
              iconAnchor: [20, 30],
            })}
            zIndexOffset={1000}
          >
            {highlight.name && (
              <Popup>
                <div className="popup-content">
                  <h4>{highlight.name}</h4>
                  {highlight.id && (
                    <button
                      className="popup-btn"
                      onClick={() => navigate(`/monumento/${highlight.id}`)}
                    >
                      {t('map.viewDetail')}
                    </button>
                  )}
                </div>
              </Popup>
            )}
          </Marker>
        )}

        {/* Marcadores numerados extra (usado por /preguntame para los #id citados por el chat) */}
        {extraMarkers.map((m) => {
          if (m.lat == null || m.lng == null) return null;
          const numbered = m.n != null;
          return (
            <Marker
              key={`extra-${m.id}`}
              position={[m.lat, m.lng]}
              icon={L.divIcon({
                className: numbered ? 'extra-num-wrapper' : 'extra-pin-wrapper',
                html: numbered
                  ? `<div class="extra-num-marker"><span>${m.n}</span></div>`
                  : `<div class="extra-pin-marker"></div>`,
                iconSize: numbered ? [34, 42] : [22, 30],
                iconAnchor: numbered ? [17, 42] : [11, 30],
              })}
              zIndexOffset={2000}
            >
              <Popup>
                <div className="popup-content">
                  <h4>{numbered ? `${m.n}. ` : ''}{m.denominacion}</h4>
                  {m.municipio && <p style={{ margin: 0, fontSize: '0.85em', color: '#6b7280' }}>{m.municipio}</p>}
                  <button
                    className="popup-btn"
                    onClick={() => navigate(`/monumento/${m.id}`)}
                  >
                    {t('map.viewDetail')}
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {fitToExtra && <FitExtraBounds points={extraMarkers} />}
      </MapContainer>

      {(() => {
        const ALL_LEGEND = [
          { key: 'militar', color: '#7c3aed', label: 'map.legend.castles' },
          { key: 'religiosa', color: '#be185d', label: 'map.legend.churches' },
          { key: 'civil', color: '#0369a1', label: 'map.legend.palaces' },
          { key: 'arqueologica', color: '#92400e', label: 'map.legend.archaeology' },
          { key: 'etnologica', color: '#065f46', label: 'map.legend.ethnologic' },
          { key: 'infraestructura', color: '#475569', label: 'map.legend.infrastructure' },
          { key: 'otros', color: '#3b82f6', label: 'map.legend.others' },
        ];
        const selected = (filters.clasificacion || '').split(',').filter(Boolean);
        // Si showFilters=true: chips clickables que disparan onFiltersChange.
        // Si no: leyenda estática (comportamiento clásico).
        if (showFilters && onFiltersChange) {
          const toggle = (key) => {
            const set = new Set(selected);
            if (set.has(key)) set.delete(key);
            else set.add(key);
            onFiltersChange({ ...filters, clasificacion: Array.from(set).join(',') });
          };
          return (
            <div className="map-legend map-legend-filters">
              {ALL_LEGEND.map(l => {
                const isActive = selected.length === 0 || selected.includes(l.key);
                return (
                  <button
                    key={l.key}
                    type="button"
                    className={`legend-item legend-chip ${isActive ? 'active' : 'inactive'}`}
                    onClick={() => toggle(l.key)}
                    style={isActive ? { borderColor: l.color } : undefined}
                  >
                    <span className="legend-dot" style={{ background: l.color }}></span>
                    {t(l.label)}
                  </button>
                );
              })}
            </div>
          );
        }
        const visible = selected.length > 0
          ? ALL_LEGEND.filter(l => selected.includes(l.key))
          : ALL_LEGEND;
        if (visible.length === 0) return null;
        return (
          <div className="map-legend">
            {visible.map(l => (
              <span key={l.key} className="legend-item">
                <span className="legend-dot" style={{ background: l.color }}></span>
                {t(l.label)}
              </span>
            ))}
          </div>
        );
      })()}

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
