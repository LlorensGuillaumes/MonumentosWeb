import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getMisPropuestas } from '../services/api';
import './MyProposals.css';

const STATUS_CLASSES = {
  pendiente: 'status-pending',
  aprobada: 'status-approved',
  rechazada: 'status-rejected',
};

export default function MyProposals() {
  const { t } = useTranslation();
  const [propuestas, setPropuestas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const data = await getMisPropuestas({ page: p, limit: 20 });
      setPropuestas(data.items);
      setTotalPages(data.pages);
      setPage(data.page);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const statusLabel = (estado) => {
    const map = {
      pendiente: t('proposal.pending'),
      aprobada: t('proposal.approved'),
      rechazada: t('proposal.rejected'),
    };
    return map[estado] || estado;
  };

  return (
    <div className="my-proposals-page">
      <div className="my-proposals-header">
        <h1>{t('proposal.myProposals')}</h1>
        <Link to="/proponer" className="my-proposals-new-btn">+ {t('nav.propose')}</Link>
      </div>

      {loading ? (
        <div className="my-proposals-loading">{t('search.searching')}</div>
      ) : propuestas.length === 0 ? (
        <div className="my-proposals-empty">
          <p>{t('proposal.noProposals')}</p>
          <Link to="/proponer" className="my-proposals-cta">{t('nav.propose')}</Link>
        </div>
      ) : (
        <>
          <div className="my-proposals-list">
            {propuestas.map(p => (
              <div key={p.id} className="my-proposal-card">
                <div className="my-proposal-top">
                  <h3>{p.denominacion}</h3>
                  <span className={`my-proposal-status ${STATUS_CLASSES[p.estado]}`}>
                    {statusLabel(p.estado)}
                  </span>
                </div>
                <div className="my-proposal-meta">
                  <span>{p.pais}</span>
                  {p.municipio && <span>{p.municipio}</span>}
                  {p.comunidad_autonoma && <span>{p.comunidad_autonoma}</span>}
                  <span className="my-proposal-date">{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
                {p.estado === 'rechazada' && p.notas_admin && (
                  <div className="my-proposal-notes">
                    <strong>{t('proposal.adminNotes')}:</strong> {p.notas_admin}
                  </div>
                )}
                {p.estado === 'aprobada' && p.bien_id && (
                  <Link to={`/monumento/${p.bien_id}`} className="my-proposal-link">
                    {t('proposal.viewMonument')}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="my-proposals-pagination">
              <button disabled={page <= 1} onClick={() => fetchData(page - 1)}>{t('search.previous')}</button>
              <span>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => fetchData(page + 1)}>{t('search.next')}</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
