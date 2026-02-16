import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { getDiaryEntries, addDiaryEntry, deleteDiaryEntry } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Diary.css';

export default function Diary() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ bien_id: '', fecha: new Date().toISOString().split('T')[0], notas: '', puntuacion: 5 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all | month | year
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    getDiaryEntries()
      .then(data => setEntries(Array.isArray(data) ? data : data.items || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.bien_id) { setError(t('diary.errorNoMonument')); return; }
    setSubmitting(true);
    setError('');
    try {
      const entry = await addDiaryEntry(form);
      setEntries(prev => [entry, ...prev]);
      setForm({ bien_id: '', fecha: new Date().toISOString().split('T')[0], notas: '', puntuacion: 5 });
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.error || t('diary.errorSave'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('diary.confirmDelete'))) return;
    try {
      await deleteDiaryEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch { /* ignore */ }
  };

  const filteredEntries = entries.filter(e => {
    if (filter === 'all') return true;
    const d = new Date(e.fecha);
    const now = new Date();
    if (filter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (filter === 'year') return d.getFullYear() === now.getFullYear();
    return true;
  }).sort((a, b) => sortOrder === 'desc'
    ? new Date(b.fecha) - new Date(a.fecha)
    : new Date(a.fecha) - new Date(b.fecha)
  );

  const stats = {
    total: entries.length,
    thisYear: entries.filter(e => new Date(e.fecha).getFullYear() === new Date().getFullYear()).length,
    uniqueRegions: new Set(entries.map(e => e.comunidad_autonoma).filter(Boolean)).size,
  };

  return (
    <div className="diary-page">
      <Helmet>
        <title>{t('diary.title')} - Patrimonio Europeo</title>
      </Helmet>

      <div className="diary-header">
        <h1>{t('diary.title')}</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? t('diary.cancel') : t('diary.addEntry')}
        </button>
      </div>

      {/* Stats */}
      <div className="diary-stats">
        <div className="diary-stat">
          <span className="diary-stat-num">{stats.total}</span>
          <span>{t('diary.totalVisits')}</span>
        </div>
        <div className="diary-stat">
          <span className="diary-stat-num">{stats.thisYear}</span>
          <span>{t('diary.thisYear')}</span>
        </div>
        <div className="diary-stat">
          <span className="diary-stat-num">{stats.uniqueRegions}</span>
          <span>{t('diary.regions')}</span>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form className="diary-form" onSubmit={handleSubmit}>
          <div className="diary-form-grid">
            <label>
              <span>{t('diary.monumentId')}</span>
              <input
                type="text"
                value={form.bien_id}
                onChange={e => setForm(f => ({ ...f, bien_id: e.target.value }))}
                placeholder={t('diary.monumentIdPlaceholder')}
                required
              />
            </label>
            <label>
              <span>{t('diary.visitDate')}</span>
              <input
                type="date"
                value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                required
              />
            </label>
            <label>
              <span>{t('diary.rating')}</span>
              <select value={form.puntuacion} onChange={e => setForm(f => ({ ...f, puntuacion: parseInt(e.target.value) }))}>
                {[5, 4, 3, 2, 1].map(n => (
                  <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            <span>{t('diary.notes')}</span>
            <textarea
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder={t('diary.notesPlaceholder')}
              rows={3}
            />
          </label>
          {error && <p className="diary-error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? t('diary.saving') : t('diary.save')}
          </button>
        </form>
      )}

      {/* Filter bar */}
      <div className="diary-filter-bar">
        <div className="diary-filter-pills">
          {['all', 'month', 'year'].map(f => (
            <button
              key={f}
              className={`diary-pill ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {t(`diary.filter_${f}`)}
            </button>
          ))}
        </div>
        <button className="diary-sort-btn" onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}>
          {sortOrder === 'desc' ? '↓' : '↑'} {t('diary.sortDate')}
        </button>
      </div>

      {/* Entries list */}
      {loading ? (
        <div className="diary-loading">{t('diary.loading')}</div>
      ) : filteredEntries.length === 0 ? (
        <div className="diary-empty">
          <p>{t('diary.empty')}</p>
          <Link to="/buscar" className="btn btn-outline">{t('diary.exploreMonuments')}</Link>
        </div>
      ) : (
        <div className="diary-entries">
          {filteredEntries.map(entry => (
            <div key={entry.id} className="diary-entry">
              <div className="diary-entry-date">
                <span className="diary-entry-day">{new Date(entry.fecha).getDate()}</span>
                <span className="diary-entry-month">{new Date(entry.fecha).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="diary-entry-content">
                <Link to={`/monumento/${entry.bien_id}`} className="diary-entry-name">
                  {entry.denominacion || `#${entry.bien_id}`}
                </Link>
                {entry.municipio && (
                  <span className="diary-entry-location">{[entry.municipio, entry.comunidad_autonoma].filter(Boolean).join(', ')}</span>
                )}
                {entry.notas && <p className="diary-entry-notes">{entry.notas}</p>}
                <div className="diary-entry-rating">
                  {'★'.repeat(entry.puntuacion || 0)}{'☆'.repeat(5 - (entry.puntuacion || 0))}
                </div>
              </div>
              <button className="diary-entry-delete" onClick={() => handleDelete(entry.id)} title={t('diary.delete')}>
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
