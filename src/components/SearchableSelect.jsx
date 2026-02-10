import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './SearchableSelect.css';

function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function matchSearch(text, query) {
  return removeAccents(text).toLowerCase().includes(removeAccents(query).toLowerCase());
}

const MAX_VISIBLE = 100;

export default function SearchableSelect({ value, onChange, options = [], placeholder = 'Todos' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const { t } = useTranslation();

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Focus en el input al abrir
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  const filtered = search
    ? options.filter(o => matchSearch(o.label || o.value, search))
    : options;

  // Si hay muchas opciones y no hay búsqueda, limitar las visibles
  const needsSearch = !search && filtered.length > MAX_VISIBLE;
  const visibleOptions = needsSearch ? filtered.slice(0, MAX_VISIBLE) : filtered;

  const selectedOption = options.find(o => o.value === value);
  const selectedLabel = selectedOption?.label || selectedOption?.value || '';

  const handleSelect = useCallback((val) => {
    onChange(val);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  const handleClear = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onChange('');
    setSearch('');
  }, [onChange]);

  const handleTriggerClick = useCallback(() => {
    setOpen(prev => !prev);
    if (open) setSearch('');
  }, [open]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length === 1) {
        handleSelect(filtered[0].value);
      }
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setSearch('');
    }
  }, [filtered, handleSelect]);

  return (
    <div className="searchable-select" ref={containerRef}>
      <div
        className={`searchable-select-trigger ${open ? 'open' : ''} ${value ? 'has-value' : ''}`}
        onClick={handleTriggerClick}
      >
        {open ? (
          <input
            ref={inputRef}
            type="text"
            className="searchable-select-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedLabel || placeholder}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`searchable-select-value ${!value ? 'placeholder' : ''}`}>
            {selectedLabel || placeholder}
          </span>
        )}
        {value && !open ? (
          <button type="button" className="searchable-select-clear" onClick={handleClear}>
            &times;
          </button>
        ) : (
          <span className="searchable-select-arrow">{open ? '\u25B2' : '\u25BC'}</span>
        )}
      </div>

      {open && (
        <div className="searchable-select-dropdown" onMouseDown={(e) => e.preventDefault()}>
          <div
            className="searchable-select-option default-option"
            onClick={() => handleSelect('')}
          >
            {placeholder}
          </div>
          {visibleOptions.length > 0 ? (
            <>
              {visibleOptions.map(o => (
                <div
                  key={o.value}
                  className={`searchable-select-option ${o.value === value ? 'selected' : ''}`}
                  onClick={() => handleSelect(o.value)}
                >
                  {o.label || o.value}
                  {o.count != null && (
                    <span className="searchable-select-count">
                      {o.count.toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
              {needsSearch && (
                <div className="searchable-select-hint">
                  {t('select.typeToSeeMore', { count: filtered.length - MAX_VISIBLE })}
                </div>
              )}
            </>
          ) : (
            <div className="searchable-select-empty">{t('select.noResults')}</div>
          )}
        </div>
      )}
    </div>
  );
}
