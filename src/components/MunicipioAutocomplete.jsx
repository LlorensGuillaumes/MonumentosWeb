import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getMonumentos } from '../services/api';
import './MunicipioAutocomplete.css';

// Normalize: remove accents, lowercase
function normalize(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function MunicipioAutocomplete({ value, onChange, onSelect, placeholder, pais }) {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMunicipio, setSelectedMunicipio] = useState('');
  const timeoutRef = useRef(null);
  const wrapperRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const q = e.target.value;
    onChange(q);
    setSelectedMunicipio('');

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (q.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Search monuments with this text to get matching municipios
        const params = { q, limit: 100, solo_coords: true };
        if (pais) params.pais = pais;
        const data = await getMonumentos(params);
        const items = data.items || [];

        // Extract unique municipios that match the query
        const normalizedQ = normalize(q);
        const municipioMap = new Map();

        for (const m of items) {
          if (!m.municipio) continue;
          const key = m.municipio;
          if (!municipioMap.has(key)) {
            municipioMap.set(key, {
              municipio: m.municipio,
              provincia: m.provincia,
              comunidad_autonoma: m.comunidad_autonoma,
              pais: m.pais,
              count: 1,
            });
          } else {
            municipioMap.get(key).count++;
          }
        }

        // Also search for municipios that contain the text in their name
        const params2 = { municipio: q, limit: 50, solo_coords: true };
        if (pais) params2.pais = pais;
        const data2 = await getMonumentos(params2);
        for (const m of (data2.items || [])) {
          if (!m.municipio) continue;
          const key = m.municipio;
          if (!municipioMap.has(key)) {
            municipioMap.set(key, {
              municipio: m.municipio,
              provincia: m.provincia,
              comunidad_autonoma: m.comunidad_autonoma,
              pais: m.pais,
              count: 1,
            });
          }
        }

        // Filter: only those whose normalized name contains the query
        const results = Array.from(municipioMap.values())
          .filter(m => normalize(m.municipio).includes(normalizedQ))
          .sort((a, b) => {
            // Exact match first, then starts-with, then contains
            const aN = normalize(a.municipio);
            const bN = normalize(b.municipio);
            if (aN === normalizedQ) return -1;
            if (bN === normalizedQ) return 1;
            if (aN.startsWith(normalizedQ) && !bN.startsWith(normalizedQ)) return -1;
            if (bN.startsWith(normalizedQ) && !aN.startsWith(normalizedQ)) return 1;
            return a.municipio.localeCompare(b.municipio);
          })
          .slice(0, 15);

        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  };

  const handleSelect = (mun) => {
    setSelectedMunicipio(mun.municipio);
    onChange(mun.municipio);
    setShowDropdown(false);
    if (onSelect) onSelect(mun.municipio);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
    }
    if (e.key === 'Enter' && !showDropdown) {
      // Let parent handle enter
      return;
    }
    if (e.key === 'Enter' && showDropdown && suggestions.length === 1) {
      e.preventDefault();
      handleSelect(suggestions[0]);
    }
  };

  return (
    <div className="mun-autocomplete" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && !selectedMunicipio && setShowDropdown(true)}
        placeholder={placeholder}
        className="mun-autocomplete-input"
      />
      {loading && <span className="mun-autocomplete-spinner" />}
      {showDropdown && suggestions.length > 0 && (
        <div className="mun-autocomplete-dropdown">
          {suggestions.map((m, i) => (
            <button
              key={`${m.municipio}-${i}`}
              className="mun-autocomplete-item"
              onClick={() => handleSelect(m)}
            >
              <strong>{m.municipio}</strong>
              <span>{[m.provincia, m.comunidad_autonoma].filter(Boolean).join(', ')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
