import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getMonumentos } from '../services/api';
import './SearchAutocomplete.css';

export default function SearchAutocomplete({ value, onChange, onSearch, onSelect, placeholder }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [localValue, setLocalValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef(null);
  const syncTimeoutRef = useRef(null);
  const wrapperRef = useRef(null);

  // Re-sync from external value (e.g. reset/clear) without overwriting active typing
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

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
    setLocalValue(q);  // instant update — no global re-render

    // Debounced sync to parent (so global state and dependent renders happen only when typing pauses)
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => onChange(q), 300);

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
    if (onSelect) {
      onSelect(m);
    } else {
      navigate(`/monumento/${m.id}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      // Flush pending debounced sync so the search uses the current text
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        onChange(localValue);
      }
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
        value={localValue}
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
