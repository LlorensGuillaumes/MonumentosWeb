import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  getTrafficSummary, getTrafficByDay, getTrafficTopUrls,
  getTrafficTopReferrers, getTrafficTopMonumentos, getTrafficTopAcciones,
} from '../services/api';
import './TrafficAnalyticsCard.css';

const DIAS_OPTIONS = [7, 30, 90];

export default function TrafficAnalyticsCard() {
  const [dias, setDias] = useState(30);
  const [summary, setSummary] = useState(null);
  const [byDay, setByDay] = useState([]);
  const [topUrls, setTopUrls] = useState([]);
  const [topReferrers, setTopReferrers] = useState([]);
  const [topMonumentos, setTopMonumentos] = useState([]);
  const [topAcciones, setTopAcciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, d, u, r, m, a] = await Promise.all([
        getTrafficSummary(dias),
        getTrafficByDay(dias),
        getTrafficTopUrls(dias, 15),
        getTrafficTopReferrers(dias, 15),
        getTrafficTopMonumentos(dias, 15),
        getTrafficTopAcciones(dias),
      ]);
      setSummary(s);
      setByDay(d.map(row => ({
        ...row,
        label: new Date(row.dia).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      })));
      setTopUrls(u);
      setTopReferrers(r);
      setTopMonumentos(m);
      setTopAcciones(a);
    } catch (err) {
      console.error('Error loading traffic analytics:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [dias]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading && !summary) {
    return (
      <div className="traffic-card">
        <div className="traffic-loading">Cargando estadísticas de tráfico…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="traffic-card">
        <div className="traffic-error">Error: {error}</div>
        <button className="traffic-btn" onClick={fetchAll}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="traffic-card">
      <div className="traffic-header">
        <h2>Tráfico de la web</h2>
        <div className="traffic-controls">
          <div className="traffic-dias-toggle">
            {DIAS_OPTIONS.map(d => (
              <button
                key={d}
                className={`traffic-dias-btn ${dias === d ? 'active' : ''}`}
                onClick={() => setDias(d)}
              >
                {d}d
              </button>
            ))}
          </div>
          <button className="traffic-refresh" onClick={fetchAll} disabled={loading}>
            {loading ? '…' : '↻ Actualizar'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="traffic-kpis">
        <KpiBox label="Páginas vistas" value={summary?.total_pageviews} sub={`${summary?.pageviews_hoy ?? 0} hoy`} />
        <KpiBox label="Visitantes únicos" value={summary?.unique_visitors} sub={`incl. anónimos`} />
        <KpiBox label="Usuarios logueados" value={summary?.unique_users_logged} sub={`distintos`} />
        <KpiBox label="Eventos totales" value={summary?.total_events} sub={`${summary?.events_hoy ?? 0} hoy`} />
      </div>

      {/* Line chart by day */}
      <div className="traffic-section">
        <h3>Evolución diaria</h3>
        {byDay.length === 0 ? (
          <p className="traffic-empty">Aún no hay datos en este rango.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={byDay} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="pageviews" stroke="#2c5282" name="Pageviews" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="uniques" stroke="#D6BC7A" name="Únicos" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="users_logged" stroke="#48bb78" name="Logueados" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Two-column tables */}
      <div className="traffic-grid">
        <Section title="Top páginas">
          {topUrls.length === 0 ? (
            <p className="traffic-empty">Sin datos.</p>
          ) : (
            <table className="traffic-table">
              <thead><tr><th>URL</th><th>Vistas</th><th>Únicos</th></tr></thead>
              <tbody>
                {topUrls.map((r, i) => (
                  <tr key={i}>
                    <td className="traffic-url">{r.url}</td>
                    <td className="traffic-num">{r.views}</td>
                    <td className="traffic-num">{r.uniques}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Referrers externos">
          {topReferrers.length === 0 ? (
            <p className="traffic-empty">Sin referrers externos.</p>
          ) : (
            <table className="traffic-table">
              <thead><tr><th>Origen</th><th>Visitas</th></tr></thead>
              <tbody>
                {topReferrers.map((r, i) => (
                  <tr key={i}>
                    <td className="traffic-url">{simplifyReferrer(r.referrer)}</td>
                    <td className="traffic-num">{r.visits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Top monumentos vistos">
          {topMonumentos.length === 0 ? (
            <p className="traffic-empty">Sin datos (event_type = monument_view).</p>
          ) : (
            <table className="traffic-table">
              <thead><tr><th>Monumento</th><th>Vistas</th></tr></thead>
              <tbody>
                {topMonumentos.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <div className="traffic-monument-name">{r.denominacion || `#${r.bien_id}`}</div>
                      <div className="traffic-monument-meta">
                        {[r.municipio, r.pais].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td className="traffic-num">{r.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Acciones (no pageviews)">
          {topAcciones.length === 0 ? (
            <p className="traffic-empty">Sin acciones registradas todavía.</p>
          ) : (
            <table className="traffic-table">
              <thead><tr><th>Acción</th><th>Total</th><th>Usuarios</th></tr></thead>
              <tbody>
                {topAcciones.map((r, i) => (
                  <tr key={i}>
                    <td className="traffic-action">{r.event_type}</td>
                    <td className="traffic-num">{r.total}</td>
                    <td className="traffic-num">{r.usuarios_distintos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>

      {/* Country + device breakdown */}
      <div className="traffic-grid">
        <Section title="Por país">
          {(!summary?.by_country || summary.by_country.length === 0) ? (
            <p className="traffic-empty">Sin datos (requiere proxy con CF-IPCountry).</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summary.by_country} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="country" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="n" fill="#2c5282" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="Por dispositivo">
          {(!summary?.by_device || summary.by_device.length === 0) ? (
            <p className="traffic-empty">Sin datos.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summary.by_device} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="device" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="n" fill="#D6BC7A" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>
    </div>
  );
}

function KpiBox({ label, value, sub }) {
  return (
    <div className="traffic-kpi">
      <div className="traffic-kpi-value">{(value ?? 0).toLocaleString('es-ES')}</div>
      <div className="traffic-kpi-label">{label}</div>
      {sub && <div className="traffic-kpi-sub">{sub}</div>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="traffic-section">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function simplifyReferrer(url) {
  if (!url) return '(directo)';
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url.slice(0, 60);
  }
}
