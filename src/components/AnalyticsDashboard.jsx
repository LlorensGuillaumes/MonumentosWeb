import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { getAnalyticsSummary, getAnalyticsRegistrations, getAnalyticsLoginsPerDay, getAnalyticsTopUsers } from '../services/api';
import './AnalyticsDashboard.css';

const COLORS = ['#2b6cb0', '#ed8936', '#48bb78', '#e53e3e', '#9f7aea', '#38b2ac', '#d69e2e', '#667eea'];

export default function AnalyticsDashboard() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loginsPerDay, setLoginsPerDay] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regPeriodo, setRegPeriodo] = useState('month');
  const [loginsDias, setLoginsDias] = useState(30);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r, l, u] = await Promise.all([
        getAnalyticsSummary(),
        getAnalyticsRegistrations(regPeriodo),
        getAnalyticsLoginsPerDay(loginsDias),
        getAnalyticsTopUsers(10),
      ]);
      setSummary(s);
      setRegistrations(r.map(d => ({
        ...d,
        label: formatPeriod(d.periodo, regPeriodo),
      })));
      setLoginsPerDay(l.map(d => ({
        ...d,
        label: new Date(d.dia).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      })));
      setTopUsers(u);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [regPeriodo, loginsDias]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function formatPeriod(dateStr, periodo) {
    const d = new Date(dateStr);
    if (periodo === 'week') {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  }

  if (loading && !summary) {
    return <div className="analytics-loading">{t('home.loading', 'Cargando...')}</div>;
  }

  if (!summary) return null;

  const rolData = summary.por_rol.map(r => ({ name: r.rol, value: r.n }));
  const methodData = summary.por_metodo.map(m => ({ name: m.method === 'email' ? 'Email' : 'Google', value: m.n }));

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h1>{t('analytics.title', 'Analytics')}</h1>
        <button className="analytics-refresh" onClick={fetchAll} disabled={loading}>
          {loading ? t('home.loading', 'Cargando...') : t('analytics.refresh', 'Actualizar')}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="analytics-kpis">
        <div className="kpi-card">
          <span className="kpi-value">{summary.total_usuarios}</span>
          <span className="kpi-label">{t('analytics.totalUsers', 'Total usuarios')}</span>
        </div>
        <div className="kpi-card kpi-today">
          <span className="kpi-value">{summary.activos_hoy}</span>
          <span className="kpi-label">{t('analytics.activeToday', 'Activos hoy')}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{summary.activos_semana}</span>
          <span className="kpi-label">{t('analytics.activeWeek', 'Activos semana')}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{summary.activos_mes}</span>
          <span className="kpi-label">{t('analytics.activeMonth', 'Activos mes')}</span>
        </div>
        <div className="kpi-card kpi-new">
          <span className="kpi-value">{summary.nuevos_semana}</span>
          <span className="kpi-label">{t('analytics.newWeek', 'Nuevos semana')}</span>
        </div>
        <div className="kpi-card kpi-new">
          <span className="kpi-value">{summary.nuevos_mes}</span>
          <span className="kpi-label">{t('analytics.newMonth', 'Nuevos mes')}</span>
        </div>
        {summary.premium_activos !== undefined && (
          <>
            <div className="kpi-card kpi-premium">
              <span className="kpi-value">{summary.premium_activos}</span>
              <span className="kpi-label">{t('analytics.premiumActive', 'Premium activos')}</span>
            </div>
            <div className="kpi-card kpi-expired">
              <span className="kpi-value">{summary.premium_expirados}</span>
              <span className="kpi-label">{t('analytics.premiumExpired', 'Premium expirados')}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">{summary.premium_free}</span>
              <span className="kpi-label">{t('analytics.premiumFree', 'Usuarios Free')}</span>
            </div>
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className="analytics-charts-grid">
        {/* Registrations over time */}
        <div className="analytics-chart-card">
          <div className="chart-header">
            <h3>{t('analytics.registrations', 'Registros')}</h3>
            <select value={regPeriodo} onChange={e => setRegPeriodo(e.target.value)}>
              <option value="month">{t('analytics.monthly', 'Mensual')}</option>
              <option value="week">{t('analytics.weekly', 'Semanal')}</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={registrations}>
              <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
              <XAxis dataKey="label" fontSize={12} tick={{ fill: '#718096' }} />
              <YAxis fontSize={12} tick={{ fill: '#718096' }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#2b6cb0" strokeWidth={2} dot={{ r: 4 }} name={t('analytics.registrations', 'Registros')} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Logins per day */}
        <div className="analytics-chart-card">
          <div className="chart-header">
            <h3>{t('analytics.loginsPerDay', 'Logins por dia')}</h3>
            <select value={loginsDias} onChange={e => setLoginsDias(Number(e.target.value))}>
              <option value={7}>7 {t('analytics.days', 'dias')}</option>
              <option value={30}>30 {t('analytics.days', 'dias')}</option>
              <option value={90}>90 {t('analytics.days', 'dias')}</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={loginsPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
              <XAxis dataKey="label" fontSize={11} tick={{ fill: '#718096' }} />
              <YAxis fontSize={12} tick={{ fill: '#718096' }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#4299e1" radius={[4, 4, 0, 0]} name={t('analytics.logins', 'Logins')} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Login method pie */}
        <div className="analytics-chart-card chart-small">
          <h3>{t('analytics.loginMethod', 'Metodo de login')}</h3>
          {methodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={methodData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {methodData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">{t('analytics.noData', 'Sin datos')}</div>
          )}
        </div>

        {/* Roles pie */}
        <div className="analytics-chart-card chart-small">
          <h3>{t('analytics.roleDistribution', 'Distribucion por rol')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={rolData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {rolData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Premium distribution pie */}
        {summary.premium_activos !== undefined && (
          <div className="analytics-chart-card chart-small">
            <h3>{t('analytics.premiumDistribution', 'Distribucion Premium')}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={[
                    { name: t('analytics.premiumActive', 'Activos'), value: Number(summary.premium_activos) },
                    { name: t('analytics.premiumExpired', 'Expirados'), value: Number(summary.premium_expirados) },
                    { name: t('analytics.premiumFree', 'Free'), value: Number(summary.premium_free) },
                  ].filter(d => d.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill="#48bb78" />
                  <Cell fill="#e53e3e" />
                  <Cell fill="#a0aec0" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top users */}
        <div className="analytics-chart-card chart-wide">
          <h3>{t('analytics.topUsers', 'Usuarios mas activos')}</h3>
          {topUsers.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topUsers} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#edf2f7" />
                <XAxis type="number" fontSize={12} tick={{ fill: '#718096' }} allowDecimals={false} />
                <YAxis type="category" dataKey="email" fontSize={11} tick={{ fill: '#718096' }} width={180} />
                <Tooltip />
                <Bar dataKey="total_logins" fill="#48bb78" radius={[0, 4, 4, 0]} name={t('analytics.totalLogins', 'Total logins')} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">{t('analytics.noData', 'Sin datos')}</div>
          )}
        </div>
      </div>
    </div>
  );
}
