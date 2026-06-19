import { useState, useEffect, useRef } from 'react';
import './SearchAutocomplete.css';

export default function SearchAutocomplete({ value, onChange, onSearch, placeholder }) {
  const [localValue, setLocalValue] = useState(value || '');
  const syncTimeoutRef = useRef(null);

  // Re-sync from external value (e.g. reset/clear) without overwriting active typing
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleChange = (e) => {
    const q = e.target.value;
    setLocalValue(q);  // instant update — no global re-render

    // Debounced sync to parent (so global state and dependent renders happen only when typing pauses)
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => onChange(q), 300);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      // Flush pending debounced sync so the search uses the current text
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        onChange(localValue);
      }
      if (onSearch) onSearch();
    }
  };

  return (
    <div className="autocomplete-wrapper">
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="autocomplete-input"
      />
    </div>
  );
}
