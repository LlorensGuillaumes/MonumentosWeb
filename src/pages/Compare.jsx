import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';
import './Compare.css';

const FIELDS = [
  { key: 'categoria', label: 'detail.dating' },
  { key: 'tipo', label: 'filters.type' },
  { key: 'estilo', label: 'filters.style' },
  { key: 'municipio', label: 'detail.municipalityLabel' },
  { key: 'provincia', label: 'detail.provinceLabel' },
  { key: 'comunidad_autonoma', label: 'detail.regionLabel' },
  { key: 'pais', label: 'detail.countryLabel' },
  { key: 'datacion', label: 'detail.date' },
  { key: 'siglo', label: 'detail.century' },
  { key: 'arquitecto', label: 'detail.architect' },
  { key: 'material', label: 'detail.material' },
  { key: 'periodo_historico', label: 'detail.period' },
];

export default function Compare() {
  const { t } = useTranslation();
  const { compareList, removeFromCompare, clearCompare } = useApp();

  if (compareList.length === 0) {
    return (
      <div className="compare-page">
        <Helmet><title>{t('compare.title')} - Patrimonio Europeo</title></Helmet>
        <h1>{t('compare.title')}</h1>
        <div className="compare-empty">
          <p>{t('compare.empty')}</p>
          <Link to="/buscar" className="btn btn-primary">{t('compare.goSearch')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="compare-page">
      <Helmet><title>{t('compare.title')} - Patrimonio Europeo</title></Helmet>
      <div className="compare-header">
        <h1>{t('compare.title')}</h1>
        <button className="btn btn-outline btn-sm" onClick={clearCompare}>
          {t('compare.clearAll')}
        </button>
      </div>

      <div className="compare-table-wrapper">
        <table className="compare-table">
          <thead>
            <tr>
              <th className="compare-label-col"></th>
              {compareList.map(m => (
                <th key={m.id} className="compare-monument-col">
                  <div className="compare-monument-header">
                    <img
                      src={m.imagen_url || '/no-image.svg'}
                      alt=""
                      loading="lazy"
                      onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }}
                    />
                    <Link to={`/monumento/${m.id}`} className="compare-monument-name">
                      {m.denominacion}
                    </Link>
                    <button
                      className="compare-remove"
                      onClick={() => removeFromCompare(m.id)}
                      title={t('compare.remove')}
                    >
                      &times;
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FIELDS.map(f => {
              const hasAny = compareList.some(m => m[f.key]);
              if (!hasAny) return null;
              return (
                <tr key={f.key}>
                  <td className="compare-label">{t(f.label)}</td>
                  {compareList.map(m => (
                    <td key={m.id} className="compare-value">
                      {m[f.key] || '—'}
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr>
              <td className="compare-label">{t('detail.description')}</td>
              {compareList.map(m => (
                <td key={m.id} className="compare-value compare-desc">
                  {(m.descripcion_completa || m.wiki_descripcion || m.descripcion || '').slice(0, 200)}
                  {(m.descripcion_completa || m.wiki_descripcion || m.descripcion || '').length > 200 ? '...' : ''}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
