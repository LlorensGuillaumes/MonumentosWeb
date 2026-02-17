import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getFiltros, getMonumentos, getMonumentosRadio, getMonumento, optimizarRuta, createRuta, getRutaPdfUrl } from '../services/api';
import { getRouteById } from '../data/curatedRoutes';
import { useAuth } from '../context/AuthContext';
import PremiumCTA from '../components/PremiumCTA';
import SearchableSelect from '../components/SearchableSelect';
import 'leaflet/dist/leaflet.css';
import './RoutePlanner.css';

const MAX_STOPS = 25;

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

function MapBoundsUpdater({ monuments }) {
  const map = useMap();
  const prevKeyRef = useRef('');
  useEffect(() => {
    if (!monuments?.length) return;
    const key = monuments.map(m => m.id).sort().join(',');
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;
    const points = monuments.filter(m => m.latitud && m.longitud).map(m => [m.latitud, m.longitud]);
    if (points.length === 1) map.setView(points[0], 14);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 15 });
  }, [monuments, map]);
  return null;
}

export default function RoutePlanner() {
  const { t } = useTranslation();
  const { user, isPremium } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Phase: 'search' or 'route'
  const [phase, setPhase] = useState('search');
  const [curatedLoading, setCuratedLoading] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  // Cascading filter state
  const [pais, setPais] = useState('');
  const [region, setRegion] = useState('');
  const [provincia, setProvincia] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [filtros, setFiltros] = useState(null);
  const [filtrosLoading, setFiltrosLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [hoveredId, setHoveredId] = useState(null);

  // Type & period filters
  const [filterTipoMonumento, setFilterTipoMonumento] = useState('');
  const [filterPeriodo, setFilterPeriodo] = useState('');
  const [searchText, setSearchText] = useState('');
  const [monuments, setMonuments] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Selection state — stores full monument objects (accumulated across searches)
  const [selected, setSelected] = useState(new Set());
  const [selectedMonumentsMap, setSelectedMonumentsMap] = useState(new Map());

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

  // Load initial filters
  useEffect(() => {
    getFiltros().then(setFiltros).catch(() => {});
  }, []);

  // Load curated route if from_curated param is present
  const curatedLoadedRef = useRef(false);
  useEffect(() => {
    const curatedId = searchParams.get('from_curated');
    if (!curatedId || curatedLoadedRef.current) return;
    const route = getRouteById(curatedId);
    if (!route) return;
    curatedLoadedRef.current = true;

    const loadCurated = async () => {
      setCuratedLoading(true);
      try {
        let items = [];
        if (route.radiusSearch) {
          const data = await getMonumentosRadio({
            lat: route.radiusSearch.lat,
            lng: route.radiusSearch.lng,
            km: route.radiusSearch.km,
            limit: route.searchParams.limit || 30,
            ...(route.searchParams.categoria && { categoria: route.searchParams.categoria }),
            ...(route.searchParams.estilo && { estilo: route.searchParams.estilo }),
            ...(route.searchParams.pais && { pais: route.searchParams.pais }),
          });
          items = data.items || [];
        }
        if (items.length < 3) {
          const data = await getMonumentos(route.searchParams);
          items = data.items || [];
        }
        // Show all monuments in search phase so user can pick which ones to include
        const withCoords = items.filter(m => m.latitud && m.longitud);
        setMonuments(withCoords);
        setTotalCount(withCoords.length);
        setRouteName(route.name);
        setFiltersCollapsed(true);
        // Clean the URL param
        setSearchParams({}, { replace: true });
      } catch (err) {
        console.error('Error loading curated route:', err);
      } finally {
        setCuratedLoading(false);
      }
    };

    loadCurated();
  }, [searchParams, setSearchParams]);

  // Cascading filter handlers — NO reset of selection
  const handlePaisChange = async (value) => {
    setPais(value);
    setRegion('');
    setProvincia('');
    setMunicipio('');
    setFilterTipoMonumento('');
    setFilterPeriodo('');
    setMonuments([]);
    setTotalCount(0);
    setFiltrosLoading(true);
    try {
      const data = await getFiltros(value ? { pais: value } : {});
      setFiltros(data);
    } catch (e) { /* ignore */ }
    setFiltrosLoading(false);
  };

  const handleRegionChange = async (value) => {
    setRegion(value);
    setProvincia('');
    setMunicipio('');
    setMonuments([]);
    setTotalCount(0);
    setFiltrosLoading(true);
    try {
      const params = {};
      if (pais) params.pais = pais;
      if (value) params.region = value;
      const data = await getFiltros(params);
      setFiltros(data);
    } catch (e) { /* ignore */ }
    setFiltrosLoading(false);
  };

  const handleProvinciaChange = async (value) => {
    setProvincia(value);
    setMunicipio('');
    setMonuments([]);
    setTotalCount(0);
    setFiltrosLoading(true);
    try {
      const params = {};
      if (pais) params.pais = pais;
      if (region) params.region = region;
      if (value) params.provincia = value;
      const data = await getFiltros(params);
      setFiltros(data);
    } catch (e) { /* ignore */ }
    setFiltrosLoading(false);
  };

  const handleMunicipioChange = (value) => {
    setMunicipio(value);
    setMonuments([]);
    setTotalCount(0);
  };

  // Dynamic labels by country
  const labels = (() => {
    switch (pais) {
      case 'Portugal': return {
        region: t('filters.portugal.region'),
        provincia: t('filters.portugal.province'),
        municipio: t('filters.portugal.municipality'),
      };
      case 'Francia': return {
        region: t('filters.france.region'),
        provincia: t('filters.france.province'),
        municipio: t('filters.france.municipality'),
      };
      case 'Italia': return {
        region: t('filters.italy.region'),
        provincia: t('filters.italy.province'),
        municipio: t('filters.italy.municipality'),
      };
      default: return {
        region: t('filters.region'),
        provincia: t('filters.province'),
        municipio: t('filters.municipality'),
      };
    }
  })();

  // Filtered options
  const regionesFiltradas = filtros?.regiones
    ? (pais ? filtros.regiones.filter(r => r.pais === pais) : filtros.regiones)
    : [];

  const provinciasFiltradas = (filtros?.provincias || []).filter(p =>
    (!pais || p.pais === pais) &&
    (!region || p.region === region)
  );

  const hasGeoFilter = pais || region || provincia;
  const municipiosFiltrados = hasGeoFilter
    ? (filtros?.municipios || []).filter(m =>
        (!pais || m.pais === pais) &&
        (!region || m.region === region) &&
        (!provincia || m.provincia === provincia)
      )
    : [];

  // Unified search — preserves existing selection
  const handleSearch = async () => {
    if (!pais && !region && !provincia && !municipio) return;
    setSearchLoading(true);
    setRouteData(null);
    setRouteGeometry(null);
    setSavedRuta(null);
    try {
      const params = { limit: 200, solo_coords: true };
      if (pais) params.pais = pais;
      if (region) params.region = region;
      if (provincia) params.provincia = provincia;
      if (municipio) params.municipio = municipio;
      if (filterTipoMonumento) params.tipo_monumento = filterTipoMonumento;
      if (filterPeriodo) params.periodo = filterPeriodo;
      const data = await getMonumentos(params);
      setMonuments(data.items || []);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error('Error searching:', err);
      setMonuments([]);
      setTotalCount(0);
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleSelect = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setSelectedMonumentsMap(prevMap => {
          const nm = new Map(prevMap);
          nm.delete(id);
          return nm;
        });
      } else if (next.size < MAX_STOPS) {
        next.add(id);
        // Find monument data and store it
        const mon = monuments.find(m => m.id === id);
        if (mon) {
          setSelectedMonumentsMap(prevMap => new Map(prevMap).set(id, mon));
        }
      }
      return next;
    });
  }, [monuments]);

  const removeStop = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setSelectedMonumentsMap(prevMap => {
      const nm = new Map(prevMap);
      nm.delete(id);
      return nm;
    });
  }, []);

  const filteredMonuments = [...monuments].sort((a, b) => (selected.has(b.id) ? 1 : 0) - (selected.has(a.id) ? 1 : 0));

  const selectAll = () => {
    const toSelect = filteredMonuments.slice(0, MAX_STOPS);
    setSelected(prev => {
      const next = new Set(prev);
      toSelect.forEach(m => { if (next.size < MAX_STOPS) next.add(m.id); });
      return next;
    });
    setSelectedMonumentsMap(prevMap => {
      const nm = new Map(prevMap);
      toSelect.forEach(m => nm.set(m.id, m));
      return nm;
    });
  };

  const clearSelection = () => {
    setSelected(new Set());
    setSelectedMonumentsMap(new Map());
  };

  // Get ordered list of selected monuments (preserving selection order)
  const selectedMonuments = [...selectedMonumentsMap.values()].filter(m => selected.has(m.id));

  // Also sync monuments from search results into the map
  useEffect(() => {
    if (monuments.length > 0) {
      setSelectedMonumentsMap(prevMap => {
        const nm = new Map(prevMap);
        monuments.forEach(m => {
          if (selected.has(m.id) && !nm.has(m.id)) {
            nm.set(m.id, m);
          }
        });
        return nm;
      });
    }
  }, [monuments, selected]);

  // Monuments to show on map: in search phase show search results, in route phase show selected
  const mapMonuments = phase === 'route' ? selectedMonuments : filteredMonuments;

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

  const handleGenerateRoute = () => {
    if (selectedMonuments.length < 2) return;
    setRouteData(null);
    setRouteGeometry(null);
    setSavedRuta(null);
    setSaveError('');
    setPhase('route');
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
      if (result.orden_optimizado) {
        const reordered = result.orden_optimizado.map(i => selectedMonuments[i]);
        // Rebuild the map in optimized order
        const newMap = new Map();
        reordered.forEach(m => newMap.set(m.id, m));
        setSelectedMonumentsMap(newMap);
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

  const handleBackToSearch = () => {
    setPhase('search');
  };

  const getGoogleMapsUrl = () => {
    if (selectedMonuments.length === 0) return '#';
    const waypoints = selectedMonuments.map(m => `${m.latitud},${m.longitud}`);
    return `https://www.google.com/maps/dir/${waypoints.join('/')}`;
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

  if (curatedLoading) {
    return (
      <div className="route-planner">
        <div className="route-header-row">
          <h1>{t('routes.title')}</h1>
        </div>
        <div className="route-curated-loading">
          <div className="route-curated-spinner" />
          <p>{t('routes.searching')}</p>
        </div>
      </div>
    );
  }

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
            center={[40.4, -3.7]}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapBoundsUpdater monuments={mapMonuments} />
            {mapMonuments.map((m, idx) => (
              <CircleMarker
                key={m.id}
                center={[m.latitud, m.longitud]}
                radius={hoveredId === m.id ? 10 : selected.has(m.id) ? 7 : 5}
                pathOptions={{
                  color: hoveredId === m.id ? '#dc2626' : selected.has(m.id) ? '#1d4ed8' : '#3b82f6',
                  fillColor: hoveredId === m.id ? '#dc2626' : selected.has(m.id) ? '#1d4ed8' : '#3b82f6',
                  fillOpacity: hoveredId === m.id ? 1 : selected.has(m.id) ? 0.9 : 0.5,
                  weight: hoveredId === m.id ? 3 : selected.has(m.id) ? 2 : 1,
                }}
                eventHandlers={{
                  click: () => phase === 'search' ? toggleSelect(m.id) : handleOpenDetail(m.id),
                  mouseover: () => setHoveredId(m.id),
                  mouseout: () => setHoveredId(null),
                }}
              >
                <Tooltip direction="top" offset={[0, -5]} opacity={0.9}>
                  <strong>{phase === 'route' ? `${idx + 1}. ` : ''}{m.denominacion}</strong><br />
                  {m.municipio}
                </Tooltip>
              </CircleMarker>
            ))}
            {routeGeometry && (
              <Polyline positions={routeGeometry} pathOptions={{ color: '#2563eb', weight: 3 }} />
            )}
          </MapContainer>
        </div>

        {/* Sidebar */}
        <div className="route-sidebar">
          {phase === 'search' ? (
            <>
              {/* Selection badge when there are already selected monuments */}
              {selected.size > 0 && (
                <div className="route-selection-badge">
                  <span>{selected.size} {t('routes.selected')}</span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleGenerateRoute}
                    disabled={selected.size < 2}
                  >
                    {t('routes.routeReady')} ({selected.size} {t('routes.stops')})
                  </button>
                </div>
              )}

              {/* Step 1: Location filters (collapsible) */}
              <div className={`route-step ${filtersCollapsed ? 'route-step-collapsed' : ''}`}>
                <div className="route-step-header" onClick={() => setFiltersCollapsed(prev => !prev)}>
                  <h3>{t('routes.selectLocation')}</h3>
                  <span className={`route-step-chevron ${filtersCollapsed ? 'collapsed' : ''}`}>&#9650;</span>
                </div>

                {!filtersCollapsed && (
                  <>
                    {filtros && (
                      <div className="route-cascading-filters">
                        {filtros.paises && filtros.paises.length > 1 && (
                          <div className="route-filter-group">
                            <label>{t('filters.country')}</label>
                            <SearchableSelect
                              value={pais}
                              onChange={handlePaisChange}
                              options={filtros.paises}
                              placeholder={t('filters.allCountries')}
                              disabled={filtrosLoading}
                            />
                          </div>
                        )}

                        <div className="route-filter-group">
                          <label>{labels.region}</label>
                          <SearchableSelect
                            value={region}
                            onChange={handleRegionChange}
                            options={regionesFiltradas}
                            placeholder={t('filters.allRegions')}
                            disabled={filtrosLoading}
                          />
                        </div>

                        <div className="route-filter-group">
                          <label>{labels.provincia}</label>
                          <SearchableSelect
                            value={provincia}
                            onChange={handleProvinciaChange}
                            options={provinciasFiltradas}
                            placeholder={t('filters.allProvinces')}
                            disabled={filtrosLoading}
                          />
                        </div>

                        <div className="route-filter-group">
                          <label>{labels.municipio}</label>
                          <SearchableSelect
                            value={municipio}
                            onChange={handleMunicipioChange}
                            options={municipiosFiltrados}
                            placeholder={hasGeoFilter ? t('filters.allMunicipalities') : t('filters.selectFilterFirst')}
                            disabled={!hasGeoFilter || filtrosLoading}
                          />
                        </div>
                      </div>
                    )}

                    {filtros?.tipos_monumento?.length > 0 && (
                      <div className="route-filter-group">
                        <label>{t('filters.monumentType')}</label>
                        <SearchableSelect
                          value={filterTipoMonumento}
                          onChange={setFilterTipoMonumento}
                          options={filtros.tipos_monumento}
                          placeholder={t('filters.allMonumentTypes')}
                        />
                      </div>
                    )}

                    {filtros?.periodos?.length > 0 && (
                      <div className="route-filter-group">
                        <label>{t('filters.period')}</label>
                        <SearchableSelect
                          value={filterPeriodo}
                          onChange={setFilterPeriodo}
                          options={filtros.periodos}
                          placeholder={t('filters.allPeriods')}
                        />
                      </div>
                    )}

                    <button
                      className="btn btn-primary btn-block"
                      onClick={handleSearch}
                      disabled={(!pais && !region && !provincia && !municipio) || searchLoading}
                    >
                      {searchLoading ? t('routes.searching') : t('routes.search')}
                    </button>

                    {monuments.length > 0 && totalCount > monuments.length && (
                      <div className="route-results-info route-results-warning">
                        {t('routes.showingLimited', { shown: monuments.length, total: totalCount })}
                      </div>
                    )}
                    {monuments.length > 0 && totalCount <= monuments.length && (
                      <div className="route-results-info">
                        {monuments.length} {t('routes.found', '')}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Step 2: Results & selection */}
              {filteredMonuments.length > 0 && (
                <div className="route-step">
                  <h3>{t('routes.step3').replace('3. ', '')}</h3>
                  <div className="route-selection-bar">
                    <span>{selected.size} / {MAX_STOPS} {t('routes.selected')}</span>
                    {(filterTipoMonumento || filterPeriodo) && (
                      <span className="route-filter-count">({filteredMonuments.length} {t('routes.filtered')})</span>
                    )}
                    <button className="btn-link" onClick={selectAll}>{t('routes.selectAll')}</button>
                    <button className="btn-link" onClick={clearSelection}>{t('routes.clearSelection')}</button>
                  </div>
                  <div className="route-monuments-list">
                    {filteredMonuments.map(m => (
                      <div
                        key={m.id}
                        className={`route-monument-item ${selected.has(m.id) ? 'selected' : ''} ${hoveredId === m.id ? 'hovered' : ''}`}
                        onClick={() => handleOpenDetail(m.id)}
                        onMouseEnter={() => setHoveredId(m.id)}
                        onMouseLeave={() => setHoveredId(null)}
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
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate route — sticky bottom action */}
              {selected.size >= 2 && (
                <div className="route-generate-sticky">
                  <button
                    className="btn btn-primary btn-block btn-lg"
                    onClick={handleGenerateRoute}
                  >
                    {t('routes.routeReady')} ({selected.size} {t('routes.stops')})
                  </button>
                </div>
              )}
            </>
          ) : (
            /* ==================== ROUTE PHASE ==================== */
            <>
              {/* Route header + add more */}
              <div className="route-step route-phase-header">
                <div className="route-phase-title-row">
                  <h3>{t('routes.routeReady')}</h3>
                  <span className="route-phase-count">{selectedMonuments.length} {t('routes.stops')}</span>
                </div>
                <button
                  className="btn btn-outline btn-block btn-sm"
                  onClick={handleBackToSearch}
                >
                  {t('routes.addMore')}
                </button>
              </div>

              {/* Compact ordered stop list */}
              <div className="route-step route-step-stops">
                <div className="route-stops-list">
                  {selectedMonuments.map((m, idx) => (
                    <div
                      key={m.id}
                      className={`route-stop-item ${hoveredId === m.id ? 'hovered' : ''}`}
                      onMouseEnter={() => setHoveredId(m.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => handleOpenDetail(m.id)}
                    >
                      <div className="route-stop-number">{idx + 1}</div>
                      <div className="route-stop-info">
                        <strong>{m.denominacion}</strong>
                        <span>{[m.municipio, m.provincia].filter(Boolean).join(', ')}</span>
                      </div>
                      <button
                        className="route-stop-remove"
                        onClick={e => { e.stopPropagation(); removeStop(m.id); }}
                        title={t('routes.removeStop')}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions: export, optimize, save */}
              <div className="route-step">
                <div className="route-actions">
                  <a
                    href={getGoogleMapsUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-block"
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
                </div>
              </div>

              {/* Optimize & save — premium */}
              <div className="route-step">
                {!isPremium && <PremiumCTA />}

                <button
                  className="btn btn-outline btn-block"
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
            </>
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
