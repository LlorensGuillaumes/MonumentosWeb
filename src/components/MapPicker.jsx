import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapPicker.css';

const COUNTRY_CENTERS = {
  'España': [40.0, -3.7, 6],
  'Francia': [46.6, 2.3, 6],
  'Portugal': [39.5, -8.0, 7],
  'Italia': [42.5, 12.5, 6],
};

export default function MapPicker({ value, onChange, pais }) {
  const { t } = useTranslation();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [latInput, setLatInput] = useState(value?.lat || '');
  const [lngInput, setLngInput] = useState(value?.lng || '');

  // Initialize map
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const center = COUNTRY_CENTERS[pais] || [40.0, -3.7, 6];
    const map = L.map(mapRef.current, {
      center: [center[0], center[1]],
      zoom: center[2],
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);

    // Click handler
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      updateMarker(map, lat, lng);
      setLatInput(lat.toFixed(6));
      setLngInput(lng.toFixed(6));
      onChange?.({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) });
    });

    mapInstanceRef.current = map;

    // Set initial marker if value exists
    if (value?.lat && value?.lng) {
      updateMarker(map, value.lat, value.lng);
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Recenter when country changes
  useEffect(() => {
    if (!mapInstanceRef.current || !pais) return;
    const center = COUNTRY_CENTERS[pais];
    if (center) {
      mapInstanceRef.current.setView([center[0], center[1]], center[2]);
    }
  }, [pais]);

  // Sync external value changes
  useEffect(() => {
    if (value?.lat && value?.lng) {
      setLatInput(value.lat);
      setLngInput(value.lng);
      if (mapInstanceRef.current) {
        updateMarker(mapInstanceRef.current, value.lat, value.lng);
      }
    }
  }, [value?.lat, value?.lng]);

  function updateMarker(map, lat, lng) {
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'map-picker-marker',
          html: '<div class="map-picker-pin"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 24],
        }),
      }).addTo(map);
    }
  }

  const handleManualCoords = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      if (mapInstanceRef.current) {
        updateMarker(mapInstanceRef.current, lat, lng);
        mapInstanceRef.current.setView([lat, lng], 14);
      }
      onChange?.({ lat, lng });
    }
  };

  return (
    <div className="map-picker">
      <div ref={mapRef} className="map-picker-map" />
      <p className="map-picker-hint">{t('proposal.locationHint')}</p>
      <div className="map-picker-coords">
        <label>
          <span>{t('proposal.latitude')}</span>
          <input
            type="number"
            step="any"
            value={latInput}
            onChange={(e) => setLatInput(e.target.value)}
            onBlur={handleManualCoords}
            placeholder="41.6560"
          />
        </label>
        <label>
          <span>{t('proposal.longitude')}</span>
          <input
            type="number"
            step="any"
            value={lngInput}
            onChange={(e) => setLngInput(e.target.value)}
            onBlur={handleManualCoords}
            placeholder="-0.8773"
          />
        </label>
      </div>
    </div>
  );
}
