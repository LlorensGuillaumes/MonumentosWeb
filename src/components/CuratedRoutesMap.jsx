import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import './CuratedRoutesMap.css';

const THEME_COLORS = {
  romanesque:    '#be185d',
  gothic:        '#7c3aed',
  mudejar:       '#d97706',
  renaissance:   '#0369a1',
  monasteries:   '#059669',
  castles:       '#7c3aed',
  islamic:       '#d97706',
  preromanesque: '#92400e',
  roman:         '#a16207',
  megalithic:    '#525252',
  camino:        '#eab308',
  modernist:     '#be185d',
  palaces:       '#0369a1',
  fortifications:'#7c3aed',
  hiking:        '#059669',
  cultural:      '#3b82f6',
  religious:     '#be185d',
};

const makeIcon = (color, icon) => L.divIcon({
  html: `<div class="route-marker" style="background:${color}">${icon || '📍'}</div>`,
  className: 'route-marker-wrapper',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

export default function CuratedRoutesMap({ routes, height = 'calc(100vh - 280px)' }) {
  const withCoords = useMemo(
    () => routes.filter(r => r.center && r.center.lat != null && r.center.lng != null),
    [routes]
  );

  return (
    <div className="curated-routes-map" style={{ height }}>
      <MapContainer
        center={[42, -3]}
        zoom={5}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={20}
          disableClusteringAtZoom={5}
          showCoverageOnHover={false}
        >
          {withCoords.map(route => {
            const color = THEME_COLORS[route.theme] || '#3b82f6';
            const icon = makeIcon(color, route.themeIcon);
            return (
              <Marker
                key={route.id}
                position={[route.center.lat, route.center.lng]}
                icon={icon}
              >
                <Popup>
                  <div className="route-popup">
                    <strong>{route.displayName || route.name}</strong>
                    {route.description && <p>{route.description.slice(0, 140)}{route.description.length > 140 ? '…' : ''}</p>}
                    <div className="route-popup-meta">
                      {route.countries?.join(', ')} · {route.stopsEstimate} stops
                    </div>
                    <Link to={route.linkTo} className="route-popup-link">Ver ruta →</Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
