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
    return <div className="analytics-loading">Cargando estadísticas de tráfico…</div>;
  }

  if (error) {
    return (
      <div className="analytics-chart-card">
        <div className="chart-empty">Error: {error}</div>
        <button className="analytics-refresh" onClick={fetchAll}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="traffic-dashboard">
      <div className="analytics-header traffic-section-header">
        <h2>Tráfico de la web</h2>
        <div className="traffic-controls">
          <select value={dias} onChange={e => setDias(Number(e.target.value))}>
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={90}>90 días</option>
          </select>
          <button className="analytics-refresh" onClick={fetchAll} disabled={loading}>
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* KPIs reuses kpi-card styling */}
      <div className="analytics-kpis traffic-kpis-row">
        <div className="kpi-card kpi-today">
          <span className="kpi-value">{(summary?.total_pageviews ?? 0).toLocaleString('es-ES')}</span>
          <span className="kpi-label">Páginas vistas</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{(summary?.unique_visitors ?? 0).toLocaleString('es-ES')}</span>
          <span className="kpi-label">Visitantes únicos</span>
        </div>
        <div className="kpi-card kpi-new">
          <span className="kpi-value">{(summary?.unique_users_logged ?? 0).toLocaleString('es-ES')}</span>
          <span className="kpi-label">Usuarios logueados</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{(summary?.total_events ?? 0).toLocaleString('es-ES')}</span>
          <span className="kpi-label">Eventos totales</span>
        </div>
      </div>

      {/* Charts grid reuses analytics-charts-grid */}
      <div className="analytics-charts-grid">
        {/* Line chart wide */}
        <div className="analytics-chart-card chart-wide">
          <h3>Evolución diaria</h3>
          {byDay.length === 0 ? (
            <div className="chart-empty">Aún no hay datos en este rango.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={byDay} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                <XAxis dataKey="label" fontSize={12} tick={{ fill: '#718096' }} />
                <YAxis fontSize={12} tick={{ fill: '#718096' }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="pageviews" stroke="#2b6cb0" name="Pageviews" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="uniques" stroke="#ed8936" name="Únicos" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="users_logged" stroke="#48bb78" name="Logueados" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top URLs */}
        <div className="analytics-chart-card">
          <h3>Top páginas</h3>
          {topUrls.length === 0 ? (
            <div className="chart-empty">Sin datos.</div>
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
        </div>

        {/* Referrers */}
        <div className="analytics-chart-card">
          <h3>Referrers externos</h3>
          {topReferrers.length === 0 ? (
            <div className="chart-empty">Sin referrers externos.</div>
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
        </div>

        {/* Top monumentos */}
        <div className="analytics-chart-card">
          <h3>Top monumentos vistos</h3>
          {topMonumentos.length === 0 ? (
            <div className="chart-empty">Sin datos (event_type = monument_view).</div>
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
        </div>

        {/* Acciones */}
        <div className="analytics-chart-card">
          <h3>Acciones (no pageviews)</h3>
          {topAcciones.length === 0 ? (
            <div className="chart-empty">Sin acciones registradas todavía.</div>
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
        </div>

        {/* Country breakdown */}
        <div className="analytics-chart-card chart-small">
          <h3>Por país</h3>
          {(!summary?.by_country || summary.by_country.length === 0) ? (
            <div className="chart-empty">Sin datos (requiere proxy con CF-IPCountry).</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summary.by_country} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                <XAxis dataKey="country" fontSize={12} tick={{ fill: '#718096' }} />
                <YAxis fontSize={12} tick={{ fill: '#718096' }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="n" fill="#2b6cb0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Device breakdown */}
        <div className="analytics-chart-card chart-small">
          <h3>Por dispositivo</h3>
          {(!summary?.by_device || summary.by_device.length === 0) ? (
            <div className="chart-empty">Sin datos.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summary.by_device} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                <XAxis dataKey="device" fontSize={12} tick={{ fill: '#718096' }} />
                <YAxis fontSize={12} tick={{ fill: '#718096' }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="n" fill="#ed8936" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
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
