import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getContactos, getContactosStats, updateContacto, getNotasContacto, createNotaContacto, updateNotaContacto, deleteNotaContacto, getTareas, getMonumentos, sendEmails, getEmailStatus, cancelEmail, getUsuarios, updateUsuarioRol } from '../services/api';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import './Admin.css';

const ITEMS_PER_PAGE = 50;

export default function Admin() {
  const [activeSection, setActiveSection] = useState('ayuntamientos');
  const [contactos, setContactos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    municipio: '',
    region: '',
    filtro_email: '',
    filtro_telefono: '',
  });
  const [search, setSearch] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailContact, setDetailContact] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [notas, setNotas] = useState([]);
  const [newNota, setNewNota] = useState('');
  const [newNotaEsTarea, setNewNotaEsTarea] = useState(false);
  const [tareas, setTareas] = useState([]);
  const [tareasLoading, setTareasLoading] = useState(false);
  const [tareasFilter, setTareasFilter] = useState('');
  const [monumentos, setMonumentos] = useState(null);
  const [monumentosLoading, setMonumentosLoading] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ asunto: '', cuerpo: '', gmail_user: 'webdepatrimonio@gmail.com', gmail_pass: 'fisio1109' });
  const [emailFiles, setEmailFiles] = useState([]);
  const [emailIncludePDF, setEmailIncludePDF] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const [emailSending, setEmailSending] = useState(false);
  const emailPollRef = useRef(null);
  const panelRef = useRef(null);

  // --- Usuarios state ---
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [usuariosPage, setUsuariosPage] = useState(1);
  const [usuariosTotalPages, setUsuariosTotalPages] = useState(1);
  const [usuariosTotal, setUsuariosTotal] = useState(0);
  const [usuariosSearch, setUsuariosSearch] = useState('');
  const [usuariosSearchTimeout, setUsuariosSearchTimeout] = useState(null);
  const [usuariosRolFilter, setUsuariosRolFilter] = useState('');
  const [usuariosSearchApplied, setUsuariosSearchApplied] = useState('');

  const fetchContactos = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = {
        page: 1,
        limit: 99999,
        sort: 'ccaa_asc',
      };
      if (filters.municipio) params.municipio = filters.municipio;
      if (filters.region) params.region = filters.region;
      if (filters.filtro_email === 'con') params.solo_con_email = 'true';
      if (filters.filtro_email === 'sin') params.solo_sin_email = 'true';
      if (filters.filtro_telefono === 'con') params.solo_con_telefono = 'true';
      if (filters.filtro_telefono === 'sin') params.solo_sin_telefono = 'true';

      const data = await getContactos(params);
      setContactos(data.items);
      setTotalPages(data.total_pages);
      setTotal(data.total);
      setPage(data.page);
    } catch (err) {
      console.error('Error cargando contactos:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getContactosStats();
      setStats(data);
    } catch (err) {
      console.error('Error cargando stats:', err);
    }
  }, []);

  const fetchTareas = useCallback(async () => {
    setTareasLoading(true);
    try {
      const params = {};
      if (tareasFilter === 'pendientes') params.completada = 'false';
      if (tareasFilter === 'completadas') params.completada = 'true';
      const data = await getTareas(params);
      setTareas(data);
    } catch (err) {
      console.error('Error cargando tareas:', err);
    } finally {
      setTareasLoading(false);
    }
  }, [tareasFilter]);

  useEffect(() => {
    fetchContactos(1);
    fetchStats();
  }, [fetchContactos, fetchStats]);

  useEffect(() => {
    if (activeSection === 'tareas') fetchTareas();
  }, [activeSection, fetchTareas]);

  const handleSearch = (value) => {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(setTimeout(() => {
      setFilters(f => ({ ...f, municipio: value }));
    }, 400));
  };

  const handleRegionFilter = (value) => {
    setFilters(f => ({ ...f, region: value }));
  };

  const handleEmailFilter = (value) => {
    setFilters(f => ({ ...f, filtro_email: value }));
  };

  const handleTelefonoFilter = (value) => {
    setFilters(f => ({ ...f, filtro_telefono: value }));
  };

  const ccaaOptions = stats?.por_ccaa?.map(c => c.comunidad_autonoma).filter(Boolean).sort() || [];

  const pageIds = contactos.map(c => c.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
  const somePageSelected = pageIds.some(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedWithEmail = contactos.filter(
    c => selectedIds.has(c.id) && (c.email_general || c.email_patrimonio)
  );

  const handleSendEmail = () => {
    const emails = selectedWithEmail.map(c => c.email_patrimonio || c.email_general);
    const unique = [...new Set(emails)];
    window.location.href = `mailto:?bcc=${unique.join(',')}`;
  };

  const clearSelection = () => setSelectedIds(new Set());

  const openDetail = async (contact) => {
    setDetailContact(contact);
    setEditData({
      email_general: contact.email_general || '',
      email_patrimonio: contact.email_patrimonio || '',
      persona_contacto: contact.persona_contacto || '',
      telefono: contact.telefono || '',
    });
    setNewNota('');
    setMonumentos(null);
    try {
      const data = await getNotasContacto(contact.id);
      setNotas(data);
    } catch { setNotas([]); }
  };

  const closeDetail = () => setDetailContact(null);

  const handleSaveEdit = async () => {
    if (!detailContact) return;
    setSaving(true);
    try {
      await updateContacto(detailContact.id, editData);
      setContactos(prev => prev.map(c =>
        c.id === detailContact.id ? { ...c, ...editData } : c
      ));
      setDetailContact(prev => ({ ...prev, ...editData }));
    } catch (err) {
      console.error('Error guardando:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddNota = async () => {
    if (!newNota.trim() || !detailContact) return;
    try {
      const nota = await createNotaContacto(detailContact.id, newNota, newNotaEsTarea);
      setNotas(prev => [nota, ...prev]);
      setNewNota('');
      setNewNotaEsTarea(false);
    } catch (err) {
      console.error('Error creando nota:', err);
    }
  };

  const handleToggleTarea = async (nota) => {
    try {
      const updated = await updateNotaContacto(nota.contacto_id, nota.id, { es_tarea: !nota.es_tarea });
      setNotas(prev => prev.map(n => n.id === nota.id ? updated : n));
    } catch (err) {
      console.error('Error actualizando nota:', err);
    }
  };

  const handleToggleCompletada = async (tarea) => {
    try {
      const updated = await updateNotaContacto(tarea.contacto_id, tarea.id, { completada: !tarea.completada });
      setTareas(prev => prev.map(t => t.id === tarea.id ? updated : t));
    } catch (err) {
      console.error('Error actualizando tarea:', err);
    }
  };

  const handleDeleteNota = async (notaId) => {
    if (!detailContact) return;
    try {
      await deleteNotaContacto(detailContact.id, notaId);
      setNotas(prev => prev.filter(n => n.id !== notaId));
    } catch (err) {
      console.error('Error eliminando nota:', err);
    }
  };

  const fetchMonumentos = async (municipio) => {
    setMonumentosLoading(true);
    try {
      const data = await getMonumentos({ municipio, limit: 200 });
      setMonumentos(data.items);
    } catch { setMonumentos([]); }
    finally { setMonumentosLoading(false); }
  };

  const openEmailModal = () => {
    setEmailModal(true);
    setEmailStatus(null);
    setEmailSending(false);
    setEmailFiles([]);
    setEmailIncludePDF(false);
  };

  const closeEmailModal = () => {
    if (emailPollRef.current) clearInterval(emailPollRef.current);
    setEmailModal(false);
  };

  const handleStartEmail = async () => {
    const ids = [...selectedIds];
    if (!ids.length || !emailForm.asunto || !emailForm.cuerpo || !emailForm.gmail_user || !emailForm.gmail_pass) return;
    setEmailSending(true);
    setEmailStatus(null);
    try {
      const res = await sendEmails({
        contacto_ids: ids,
        asunto: emailForm.asunto,
        cuerpo: emailForm.cuerpo,
        gmail_user: emailForm.gmail_user,
        gmail_pass: emailForm.gmail_pass,
        archivos: emailFiles,
        incluir_pdf_monumentos: emailIncludePDF,
      });
      setEmailStatus({ running: true, total: res.total, sent: 0, failed: 0 });
      // Poll status
      emailPollRef.current = setInterval(async () => {
        try {
          const st = await getEmailStatus();
          setEmailStatus(st);
          if (!st.running) {
            clearInterval(emailPollRef.current);
            setEmailSending(false);
          }
        } catch {}
      }, 3000);
    } catch (err) {
      setEmailStatus({ error: err.response?.data?.error || err.message });
      setEmailSending(false);
    }
  };

  const handleCancelEmail = async () => {
    try {
      await cancelEmail();
      if (emailPollRef.current) clearInterval(emailPollRef.current);
      setEmailSending(false);
      const st = await getEmailStatus();
      setEmailStatus(st);
    } catch {}
  };

  // --- Usuarios handlers ---
  const fetchUsuarios = useCallback(async (p = 1) => {
    setUsuariosLoading(true);
    try {
      const params = { page: p, limit: 50 };
      if (usuariosSearchApplied) params.search = usuariosSearchApplied;
      if (usuariosRolFilter) params.rol = usuariosRolFilter;
      const data = await getUsuarios(params);
      setUsuarios(data.items);
      setUsuariosTotalPages(data.pages);
      setUsuariosTotal(data.total);
      setUsuariosPage(data.page);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setUsuariosLoading(false);
    }
  }, [usuariosSearchApplied, usuariosRolFilter]);

  useEffect(() => {
    if (activeSection === 'usuarios') fetchUsuarios(1);
  }, [activeSection, fetchUsuarios]);

  const handleUsuariosSearch = (value) => {
    setUsuariosSearch(value);
    if (usuariosSearchTimeout) clearTimeout(usuariosSearchTimeout);
    setUsuariosSearchTimeout(setTimeout(() => {
      setUsuariosSearchApplied(value);
    }, 400));
  };

  const handleChangeRol = async (userId, newRol) => {
    if (!window.confirm(`¿Cambiar rol de este usuario a "${newRol}"?`)) return;
    try {
      const updated = await updateUsuarioRol(userId, newRol);
      setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, rol: updated.rol } : u));
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cambiar rol');
    }
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2 className="admin-sidebar-title">Admin</h2>
        <nav className="admin-nav">
          <button
            className={`admin-nav-item ${activeSection === 'ayuntamientos' ? 'active' : ''}`}
            onClick={() => setActiveSection('ayuntamientos')}
          >
            <span className="admin-nav-icon">🏛️</span>
            Ayuntamientos
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'usuarios' ? 'active' : ''}`}
            onClick={() => setActiveSection('usuarios')}
          >
            <span className="admin-nav-icon">👥</span>
            Usuarios
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveSection('analytics')}
          >
            <span className="admin-nav-icon">📊</span>
            Analytics
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'tareas' ? 'active' : ''}`}
            onClick={() => setActiveSection('tareas')}
          >
            <span className="admin-nav-icon">📋</span>
            Tareas
          </button>
        </nav>
      </aside>

      <div className="admin-main">
        {activeSection === 'ayuntamientos' && (
          <>
            <div className="admin-header">
              <h1>Contactos Ayuntamientos</h1>
              {stats && (
                <div className="admin-stats-row">
                  <div className="admin-stat">
                    <span className="admin-stat-num">{stats.total.toLocaleString()}</span>
                    <span className="admin-stat-label">Total</span>
                  </div>
                  <div className="admin-stat">
                    <span className="admin-stat-num">{stats.con_email_general.toLocaleString()}</span>
                    <span className="admin-stat-label">Con email</span>
                  </div>
                  <div className="admin-stat">
                    <span className="admin-stat-num">{stats.con_contacto.toLocaleString()}</span>
                    <span className="admin-stat-label">Con contacto</span>
                  </div>
                  <div className="admin-stat">
                    <span className="admin-stat-num">
                      {stats.total > 0 ? Math.round(stats.con_email_general / stats.total * 100) : 0}%
                    </span>
                    <span className="admin-stat-label">Cobertura</span>
                  </div>
                </div>
              )}
            </div>

            <div className="admin-filters">
              <input
                type="text"
                className="admin-search"
                placeholder="Buscar municipio..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
              <select
                className="admin-select"
                value={filters.region}
                onChange={(e) => handleRegionFilter(e.target.value)}
              >
                <option value="">Todas las CCAA</option>
                {ccaaOptions.map(ccaa => (
                  <option key={ccaa} value={ccaa}>{ccaa}</option>
                ))}
              </select>
              <select
                className="admin-select"
                value={filters.filtro_email}
                onChange={(e) => handleEmailFilter(e.target.value)}
              >
                <option value="">Email: todos</option>
                <option value="con">Con email</option>
                <option value="sin">Sin email</option>
              </select>
              <select
                className="admin-select"
                value={filters.filtro_telefono}
                onChange={(e) => handleTelefonoFilter(e.target.value)}
              >
                <option value="">Tel: todos</option>
                <option value="con">Con tel.</option>
                <option value="sin">Sin tel.</option>
              </select>
              <span className="admin-result-count">{total.toLocaleString()} resultados</span>
              <button
                className="admin-send-email-btn"
                onClick={openEmailModal}
                disabled={selectedWithEmail.length === 0}
                title={selectedWithEmail.length === 0 ? 'Selecciona contactos con email primero' : ''}
              >
                Enviar email {selectedWithEmail.length > 0 && `(${selectedWithEmail.length})`}
              </button>
            </div>

            <div className="admin-table-wrap">
              {loading ? (
                <div className="admin-loading">Cargando...</div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="th-check">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th>Municipio</th>
                      <th>CCAA</th>
                      <th>Email</th>
                      <th>Persona de contacto</th>
                      <th>Tel.</th>
                      <th>Fuente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contactos.map((c) => (
                      <React.Fragment key={c.id}>
                        <tr
                          className={`${c.email_general || c.email_patrimonio ? '' : 'row-no-email'} ${selectedIds.has(c.id) ? 'row-selected' : ''} ${detailContact?.id === c.id ? 'row-active' : ''} row-clickable`}
                          onClick={(e) => { if (e.target.type !== 'checkbox') openDetail(c); }}
                        >
                          <td className="td-check">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(c.id)}
                              onChange={() => toggleSelect(c.id)}
                            />
                          </td>
                          <td className="td-municipio">{c.municipio}</td>
                          <td>{c.comunidad_autonoma}</td>
                          <td className="td-email">
                            {c.email_patrimonio && (
                              <a href={`mailto:${c.email_patrimonio}`} title="Patrimonio">
                                {c.email_patrimonio}
                              </a>
                            )}
                            {c.email_general && (
                              <a href={`mailto:${c.email_general}`}>
                                {c.email_general}
                              </a>
                            )}
                            {!c.email_patrimonio && !c.email_general && (
                              <span className="no-data">--</span>
                            )}
                          </td>
                          <td>
                            {c.persona_contacto ? (
                              <span>
                                {c.persona_contacto}
                                {c.cargo && <small className="cargo-tag"> ({c.cargo})</small>}
                              </span>
                            ) : (
                              <span className="no-data">--</span>
                            )}
                          </td>
                          <td>{c.telefono || <span className="no-data">--</span>}</td>
                          <td><span className="fuente-tag">{c.fuente || '--'}</span></td>
                        </tr>
                        {detailContact?.id === c.id && (
                          <tr className="row-detail-expanded">
                            <td colSpan="7">
                              <div className="admin-detail-panel" ref={panelRef}>
                                <div className="detail-header">
                                  <div>
                                    <h3>{detailContact.municipio}</h3>
                                    <span className="detail-sub">{detailContact.comunidad_autonoma}</span>
                                  </div>
                                  <button className="detail-close" onClick={(e) => { e.stopPropagation(); closeDetail(); }}>&times;</button>
                                </div>
                                <div className="detail-body">
                                  <div className="detail-edit-section">
                                    <h4>Datos de contacto</h4>
                                    <label className="detail-field">
                                      <span>Email general</span>
                                      <input type="email" value={editData.email_general} onClick={e => e.stopPropagation()} onChange={e => setEditData(d => ({ ...d, email_general: e.target.value }))} />
                                    </label>
                                    <label className="detail-field">
                                      <span>Email patrimonio</span>
                                      <input type="email" value={editData.email_patrimonio} onClick={e => e.stopPropagation()} onChange={e => setEditData(d => ({ ...d, email_patrimonio: e.target.value }))} />
                                    </label>
                                    <label className="detail-field">
                                      <span>Persona de contacto</span>
                                      <input type="text" value={editData.persona_contacto} onClick={e => e.stopPropagation()} onChange={e => setEditData(d => ({ ...d, persona_contacto: e.target.value }))} />
                                    </label>
                                    <label className="detail-field">
                                      <span>Telefono</span>
                                      <input type="text" value={editData.telefono} onClick={e => e.stopPropagation()} onChange={e => setEditData(d => ({ ...d, telefono: e.target.value }))} />
                                    </label>
                                    <button className="detail-save-btn" onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }} disabled={saving}>
                                      {saving ? 'Guardando...' : 'Guardar cambios'}
                                    </button>
                                    <h4 style={{ marginTop: '1rem' }}>Monumentos en {detailContact.municipio}</h4>
                                    {monumentos === null ? (
                                      <button className="detail-monumentos-btn" onClick={(e) => { e.stopPropagation(); fetchMonumentos(detailContact.municipio); }}>
                                        Cargar monumentos
                                      </button>
                                    ) : monumentosLoading ? (
                                      <p className="no-data">Cargando...</p>
                                    ) : monumentos.length === 0 ? (
                                      <p className="no-data">No hay monumentos registrados</p>
                                    ) : (
                                      <div className="detail-monumentos-list">
                                        <span className="detail-monumentos-count">{monumentos.length} monumento{monumentos.length !== 1 ? 's' : ''}</span>
                                        {monumentos.map(m => (
                                          <div key={m.id} className="detail-monumento-item">
                                            <span className="monumento-nombre">{m.denominacion}</span>
                                            {m.categoria && <span className="monumento-cat">{m.categoria}</span>}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="detail-notas-section">
                                    <h4>Notas ({notas.length})</h4>
                                    <div className="detail-nota-input">
                                      <textarea
                                        placeholder="Escribir nota..."
                                        value={newNota}
                                        onClick={e => e.stopPropagation()}
                                        onChange={e => setNewNota(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNota(); } }}
                                      />
                                      <div className="detail-nota-actions">
                                        <label className="nota-tarea-check" onClick={e => e.stopPropagation()}>
                                          <input type="checkbox" checked={newNotaEsTarea} onChange={e => setNewNotaEsTarea(e.target.checked)} />
                                          Tarea
                                        </label>
                                        <button onClick={(e) => { e.stopPropagation(); handleAddNota(); }} disabled={!newNota.trim()}>Añadir</button>
                                      </div>
                                    </div>
                                    <div className="detail-notas-list">
                                      {notas.map(n => (
                                        <div key={n.id} className={`detail-nota ${n.es_tarea ? 'nota-es-tarea' : ''} ${n.completada ? 'nota-completada' : ''}`}>
                                          <p>{n.texto}</p>
                                          <div className="detail-nota-meta">
                                            <small>{new Date(n.created_at).toLocaleString()}</small>
                                            <div className="detail-nota-meta-right">
                                              <label className="nota-tarea-toggle" onClick={e => e.stopPropagation()}>
                                                <input type="checkbox" checked={!!n.es_tarea} onChange={() => handleToggleTarea(n)} />
                                                <span className="nota-tarea-tag">{n.es_tarea ? 'Tarea' : 'Nota'}</span>
                                              </label>
                                              <button onClick={(e) => { e.stopPropagation(); handleDeleteNota(n.id); }}>&times;</button>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                      {notas.length === 0 && <p className="no-data">Sin notas</p>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                    {contactos.length === 0 && (
                      <tr>
                        <td colSpan="7" className="admin-empty">No se encontraron resultados</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {selectedIds.size > 0 && (
              <div className="admin-selection-bar">
                <span>{selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}</span>
                <button
                  className="admin-selection-email-btn"
                  onClick={openEmailModal}
                  disabled={selectedWithEmail.length === 0}
                >
                  Enviar email a {selectedWithEmail.length} contacto{selectedWithEmail.length !== 1 ? 's' : ''}
                </button>
                <button className="admin-selection-clear-btn" onClick={clearSelection}>
                  Deseleccionar
                </button>
              </div>
            )}

          </>
        )}

        {activeSection === 'usuarios' && (
          <>
            <div className="admin-header">
              <h1>Usuarios</h1>
              <div className="admin-stats-row">
                <div className="admin-stat">
                  <span className="admin-stat-num">{usuariosTotal}</span>
                  <span className="admin-stat-label">Total</span>
                </div>
              </div>
            </div>

            <div className="admin-filters">
              <input
                type="text"
                className="admin-search"
                placeholder="Buscar por email o nombre..."
                value={usuariosSearch}
                onChange={(e) => handleUsuariosSearch(e.target.value)}
              />
              <select
                className="admin-select"
                value={usuariosRolFilter}
                onChange={(e) => setUsuariosRolFilter(e.target.value)}
              >
                <option value="">Todos los roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="colaborador">Colaborador</option>
              </select>
              <span className="admin-result-count">{usuariosTotal} usuario{usuariosTotal !== 1 ? 's' : ''}</span>
            </div>

            <div className="admin-table-wrap">
              {usuariosLoading ? (
                <div className="admin-loading">Cargando...</div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Nombre</th>
                      <th>Rol</th>
                      <th>Auth</th>
                      <th>Registro</th>
                      <th>Ultimo login</th>
                      <th>Logins</th>
                      <th>Hoy</th>
                      <th>Semana</th>
                      <th>Mes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => (
                      <tr key={u.id}>
                        <td className="td-email">{u.email}</td>
                        <td>{u.nombre || <span className="no-data">--</span>}</td>
                        <td>
                          <select
                            className={`rol-select rol-${u.rol}`}
                            value={u.rol}
                            onChange={(e) => handleChangeRol(u.id, e.target.value)}
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                            <option value="colaborador">colaborador</option>
                          </select>
                        </td>
                        <td>
                          {u.google_id ? (
                            <span className="auth-badge auth-google">Google</span>
                          ) : (
                            <span className="auth-badge auth-email">Email</span>
                          )}
                        </td>
                        <td className="td-fecha">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '--'}</td>
                        <td className="td-fecha">{u.last_login ? new Date(u.last_login).toLocaleDateString() : '--'}</td>
                        <td className="td-login-count">{u.total_logins || 0}</td>
                        <td className="td-login-count">{u.logins_today || 0}</td>
                        <td className="td-login-count">{u.logins_week || 0}</td>
                        <td className="td-login-count">{u.logins_month || 0}</td>
                      </tr>
                    ))}
                    {usuarios.length === 0 && (
                      <tr>
                        <td colSpan="10" className="admin-empty">No se encontraron usuarios</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {usuariosTotalPages > 1 && (
              <div className="admin-pagination">
                <button disabled={usuariosPage <= 1} onClick={() => fetchUsuarios(usuariosPage - 1)}>Anterior</button>
                <span>Pagina {usuariosPage} de {usuariosTotalPages}</span>
                <button disabled={usuariosPage >= usuariosTotalPages} onClick={() => fetchUsuarios(usuariosPage + 1)}>Siguiente</button>
              </div>
            )}
          </>
        )}

        {activeSection === 'analytics' && (
          <AnalyticsDashboard />
        )}

        {activeSection === 'tareas' && (
          <>
            <div className="admin-header">
              <h1>Tareas</h1>
            </div>
            <div className="admin-filters">
              <select
                className="admin-select"
                value={tareasFilter}
                onChange={e => setTareasFilter(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="pendientes">Pendientes</option>
                <option value="completadas">Completadas</option>
              </select>
              <span className="admin-result-count">{tareas.length} tarea{tareas.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="admin-table-wrap">
              {tareasLoading ? (
                <div className="admin-loading">Cargando...</div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}></th>
                      <th>Tarea</th>
                      <th>Municipio</th>
                      <th>CCAA</th>
                      <th>Email</th>
                      <th>Fecha</th>
                      <th style={{ width: 36 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tareas.map(t => (
                      <tr key={t.id} className={t.completada ? 'row-tarea-done' : ''}>
                        <td className="td-check">
                          <input
                            type="checkbox"
                            checked={!!t.completada}
                            onChange={() => handleToggleCompletada(t)}
                          />
                        </td>
                        <td className="td-tarea-texto">{t.texto}</td>
                        <td className="td-municipio">{t.municipio}</td>
                        <td>{t.comunidad_autonoma}</td>
                        <td className="td-email">
                          {(t.email_patrimonio || t.email_general) ? (
                            <a href={`mailto:${t.email_patrimonio || t.email_general}`}>
                              {t.email_patrimonio || t.email_general}
                            </a>
                          ) : (
                            <span className="no-data">--</span>
                          )}
                        </td>
                        <td className="td-fecha">{new Date(t.created_at).toLocaleDateString()}</td>
                        <td>
                          <button className="tarea-delete-btn" onClick={() => {
                            deleteNotaContacto(t.contacto_id, t.id).then(() =>
                              setTareas(prev => prev.filter(x => x.id !== t.id))
                            );
                          }}>&times;</button>
                        </td>
                      </tr>
                    ))}
                    {tareas.length === 0 && (
                      <tr>
                        <td colSpan="7" className="admin-empty">No hay tareas</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {emailModal && (
        <div className="modal-overlay" onClick={closeEmailModal}>
          <div className="modal-content email-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Enviar emails</h2>
              <button className="detail-close" onClick={closeEmailModal}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="email-modal-info">
                Se enviara a <strong>{selectedWithEmail.length}</strong> contactos con email.
                Usa <code>{'{municipio}'}</code> en asunto o cuerpo para insertar el nombre del municipio.
              </p>
              <label className="detail-field">
                <span>Gmail</span>
                <input type="email" placeholder="tucuenta@gmail.com" value={emailForm.gmail_user} onChange={e => setEmailForm(f => ({ ...f, gmail_user: e.target.value }))} />
              </label>
              <label className="detail-field">
                <span>App Password</span>
                <input type="password" placeholder="Contraseña de aplicacion" value={emailForm.gmail_pass} onChange={e => setEmailForm(f => ({ ...f, gmail_pass: e.target.value }))} />
              </label>
              <label className="detail-field">
                <span>Asunto</span>
                <input type="text" placeholder="Monumentos de {municipio}" value={emailForm.asunto} onChange={e => setEmailForm(f => ({ ...f, asunto: e.target.value }))} />
              </label>
              <label className="email-body-field">
                <span>Cuerpo</span>
                <textarea
                  rows={8}
                  placeholder={'Estimado Ayuntamiento de {municipio},\n\nNos dirigimos a ustedes...'}
                  value={emailForm.cuerpo}
                  onChange={e => setEmailForm(f => ({ ...f, cuerpo: e.target.value }))}
                />
              </label>

              <div className="email-attachments-section">
                <h4>Adjuntos</h4>
                <label className="email-pdf-checkbox" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={emailIncludePDF}
                    onChange={e => setEmailIncludePDF(e.target.checked)}
                  />
                  Adjuntar PDF de monumentos de cada municipio
                  <span className="email-pdf-hint">(un PDF diferente por destinatario)</span>
                </label>
                <div className="email-files-input">
                  <label className="email-files-btn">
                    Adjuntar archivos
                    <input
                      type="file"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => {
                        const newFiles = Array.from(e.target.files);
                        setEmailFiles(prev => [...prev, ...newFiles]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <span className="email-files-hint">Archivos iguales para todos los destinatarios (max 10 MB c/u)</span>
                </div>
                {emailFiles.length > 0 && (
                  <ul className="email-files-list">
                    {emailFiles.map((f, i) => (
                      <li key={i} className="email-file-item">
                        <span className="email-file-name">{f.name}</span>
                        <span className="email-file-size">{(f.size / 1024).toFixed(0)} KB</span>
                        <button
                          className="email-file-remove"
                          onClick={() => setEmailFiles(prev => prev.filter((_, j) => j !== i))}
                          title="Eliminar"
                        >&times;</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {emailStatus && !emailStatus.error && (
                <div className="email-progress">
                  <div className="email-progress-bar">
                    <div
                      className="email-progress-fill"
                      style={{ width: `${emailStatus.total ? Math.round((emailStatus.sent + emailStatus.failed) / emailStatus.total * 100) : 0}%` }}
                    />
                  </div>
                  <span className="email-progress-text">
                    {emailStatus.sent} enviados, {emailStatus.failed} fallidos de {emailStatus.total}
                    {emailStatus.running && ' - Enviando...'}
                    {!emailStatus.running && emailStatus.finished_at && ' - Completado'}
                  </span>
                  {emailStatus.errors?.length > 0 && (
                    <details className="email-errors">
                      <summary>{emailStatus.errors.length} error{emailStatus.errors.length !== 1 ? 'es' : ''}</summary>
                      <ul>
                        {emailStatus.errors.map((e, i) => (
                          <li key={i}>{e.municipio} ({e.email}): {e.error}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
              {emailStatus?.error && (
                <div className="email-error-msg">{emailStatus.error}</div>
              )}
            </div>
            <div className="modal-footer">
              {emailSending ? (
                <button className="btn-cancel-email" onClick={handleCancelEmail}>Cancelar envio</button>
              ) : (
                <button
                  className="detail-save-btn"
                  onClick={handleStartEmail}
                  disabled={!emailForm.asunto || !emailForm.cuerpo || !emailForm.gmail_user || !emailForm.gmail_pass}
                >
                  Iniciar envio
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
