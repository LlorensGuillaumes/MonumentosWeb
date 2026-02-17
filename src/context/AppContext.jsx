import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { getStats, getFiltros } from '../services/api';

const AppContext = createContext(null);

const MAX_COMPARE = 3;

const initialState = {
  stats: null,
  filtros: null,
  filters: {
    pais: '',
    region: '',
    provincia: '',
    municipio: '',
    categoria: '',
    tipo: '',
    estilo: '',
    tipo_monumento: '',
    periodo: '',
    clasificacion: '',
    q: '',
    solo_coords: true,
    solo_wikidata: false,
    solo_imagen: false,
  },
  mapBounds: null,
  compareList: [],
  loading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    case 'SET_FILTROS':
      return { ...state, filtros: action.payload };
    case 'SET_FILTER':
      return {
        ...state,
        filters: { ...state.filters, [action.key]: action.value },
      };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'RESET_FILTERS':
      return { ...state, filters: initialState.filters };
    case 'SET_MAP_BOUNDS':
      return { ...state, mapBounds: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'ADD_COMPARE':
      if (state.compareList.find(m => m.id === action.payload.id) || state.compareList.length >= MAX_COMPARE)
        return state;
      return { ...state, compareList: [...state.compareList, action.payload] };
    case 'REMOVE_COMPARE':
      return { ...state, compareList: state.compareList.filter(m => m.id !== action.payload) };
    case 'CLEAR_COMPARE':
      return { ...state, compareList: [] };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    // Cargar datos iniciales
    Promise.all([getStats(), getFiltros()])
      .then(([stats, filtros]) => {
        dispatch({ type: 'SET_STATS', payload: stats });
        dispatch({ type: 'SET_FILTROS', payload: filtros });
      })
      .catch(err => {
        dispatch({ type: 'SET_ERROR', payload: err.message });
      });
  }, []);

  const setFilter = (key, value) => {
    dispatch({ type: 'SET_FILTER', key, value });
  };

  const setFilters = (filters) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  };

  const resetFilters = () => {
    dispatch({ type: 'RESET_FILTERS' });
  };

  const setMapBounds = (bounds) => {
    dispatch({ type: 'SET_MAP_BOUNDS', payload: bounds });
  };

  const addToCompare = (monumento) => dispatch({ type: 'ADD_COMPARE', payload: monumento });
  const removeFromCompare = (id) => dispatch({ type: 'REMOVE_COMPARE', payload: id });
  const clearCompare = () => dispatch({ type: 'CLEAR_COMPARE' });

  // Recargar filtros dinámicos según país/región/provincia
  const reloadFiltros = useCallback(async (pais, region, provincia) => {
    try {
      const params = {};
      if (pais) params.pais = pais;
      if (region) params.region = region;
      if (provincia) params.provincia = provincia;
      const newFiltros = await getFiltros(params);
      dispatch({ type: 'SET_FILTROS', payload: newFiltros });
    } catch (err) {
      console.error('Error reloading filtros:', err);
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        ...state,
        setFilter,
        setFilters,
        resetFilters,
        setMapBounds,
        reloadFiltros,
        addToCompare,
        removeFromCompare,
        clearCompare,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
