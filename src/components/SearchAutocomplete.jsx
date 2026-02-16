import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMonumentos } from '../services/api';
import './SearchAutocomplete.css';

export default function SearchAutocomplete({ value, onChange, onSearch, placeholder }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const q = e.target.value;
    onChange(q);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await getMonumentos({ q, limit: 6, solo_coords: true });
        setSuggestions(data.items || []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (m) => {
    setShowSuggestions(false);
    navigate(`/monumento/${m.id}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setShowSuggestions(false);
      if (onSearch) onSearch();
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        className="autocomplete-input"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="autocomplete-dropdown">
          {suggestions.map(m => (
            <button key={m.id} className="autocomplete-item" onClick={() => handleSelect(m)}>
              {m.imagen_url && (
                <img src={m.imagen_url} alt="" onError={e => { e.target.style.display = 'none'; }} />
              )}
              <div className="autocomplete-item-info">
                <strong>{m.denominacion}</strong>
                <span>{[m.municipio, m.provincia].filter(Boolean).join(', ')}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
