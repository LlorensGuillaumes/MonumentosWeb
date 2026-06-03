import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createContacto, getContactos, getContactosStats, updateContacto, getNotasContacto, createNotaContacto, updateNotaContacto, deleteNotaContacto, getTareas, getMonumentos, getMonumento, sendEmails, getEmailStatus, cancelEmail, getUsuarios, updateUsuarioRol, updateUsuarioPremium, getMensajes, getMensajesCount, getMensaje, updateMensaje, deleteMensaje, getMensajeArchivoUrl, getAdminPropuestas, getAdminPropuestasCount, getAdminPropuesta, updateAdminPropuesta, aprobarPropuesta, rechazarPropuesta, searchWikidata, getPropuestaImagenUrl, getSocialHistory, addSocialHistory, getSocialAccountsSuggest, markSocialAccountsUsed, getRutasCulturales, getRutaCultural } from '../services/api';
import { CURATED_ROUTES } from '../data/curatedRoutes';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import TrafficAnalyticsCard from '../components/TrafficAnalyticsCard';
import AdminSettings from '../components/AdminSettings';
import WebPresentationModal from '../components/WebPresentationModal';
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
    filtro_tipo: '',
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
  const [emailForm, setEmailForm] = useState({ asunto: '', cuerpo: '', gmail_user: import.meta.env.VITE_GMAIL_USER || '', gmail_pass: import.meta.env.VITE_GMAIL_PASS || '' });
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
  const [usuariosPremiumFilter, setUsuariosPremiumFilter] = useState('');
  const [usuariosSearchApplied, setUsuariosSearchApplied] = useState('');

  // --- Mensajes state ---
  const [mensajes, setMensajes] = useState([]);
  const [mensajesLoading, setMensajesLoading] = useState(false);
  const [mensajesTotal, setMensajesTotal] = useState(0);
  const [mensajesPage, setMensajesPage] = useState(1);
  const [mensajesTotalPages, setMensajesTotalPages] = useState(1);
  const [mensajesFilter, setMensajesFilter] = useState('');
  const [mensajesUnread, setMensajesUnread] = useState(0);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [selectedMsgLoading, setSelectedMsgLoading] = useState(false);

  // --- Propuestas state ---
  const [propuestas, setPropuestas] = useState([]);
  const [propuestasLoading, setPropuestasLoading] = useState(false);
  const [propuestasTotal, setPropuestasTotal] = useState(0);
  const [propuestasPage, setPropuestasPage] = useState(1);
  const [propuestasTotalPages, setPropuestasTotalPages] = useState(1);
  const [propuestasFilter, setPropuestasFilter] = useState('pendiente');
  const [propuestasPendientes, setPropuestasPendientes] = useState(0);
  const [selectedProp, setSelectedProp] = useState(null);
  const [selectedPropLoading, setSelectedPropLoading] = useState(false);
  const [propEditData, setPropEditData] = useState({});
  const [propSaving, setPropSaving] = useState(false);
  const [propResult, setPropResult] = useState(null);
  const [wdResults, setWdResults] = useState(null);
  const [wdSearching, setWdSearching] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  // --- Social / Publicaciones state ---
  const [socialMonumentos, setSocialMonumentos] = useState([]);
  const [socialSearch, setSocialSearch] = useState('');
  const [socialSearchPais, setSocialSearchPais] = useState('');
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialSelected, setSocialSelected] = useState(null);
  const [socialPlatform, setSocialPlatform] = useState('instagram');
  const [socialText, setSocialText] = useState('');
  const [socialCopied, setSocialCopied] = useState('');
  const [socialMentions, setSocialMentions] = useState([]);
  const [socialMode, setSocialMode] = useState('monumento'); // 'monumento' | 'ruta' | 'diario'
  const [diarioDays, setDiarioDays] = useState([]); // [{ dateStr, dateObj, monument, loading }]
  const [diarioDaysCount] = useState(14); // preview next 14 days
  const [diarioSelectedDate, setDiarioSelectedDate] = useState(null);
  const [rutasCulturales, setRutasCulturales] = useState([]);
  const [rutasCulturalesLoaded, setRutasCulturalesLoaded] = useState(false);
  const [selectedRuta, setSelectedRuta] = useState(null);
  const [rutaPhotos, setRutaPhotos] = useState([]); // 6 random photos for the route post
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContactData, setNewContactData] = useState({ municipio: '', provincia: '', comunidad_autonoma: '', email_general: '', email_patrimonio: '', persona_contacto: '', cargo: '', telefono: '', web: '', fuente: '', tipo: 'turismo', pais: 'España' });
  const [newContactSaving, setNewContactSaving] = useState(false);
  const [showWebPresentation, setShowWebPresentation] = useState(false);

  // Column resize handler for admin tables
  const handleColumnResize = useCallback((e) => {
    const th = e.target.parentElement;
    const startX = e.clientX;
    const startWidth = th.offsetWidth;
    const table = th.closest('table');
    table.style.userSelect = 'none';
    e.target.classList.add('resizing');

    const onMouseMove = (ev) => {
      const newWidth = Math.max(50, startWidth + ev.clientX - startX);
      th.style.width = newWidth + 'px';
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      table.style.userSelect = '';
      e.target.classList.remove('resizing');
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

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
      if (filters.filtro_tipo) params.tipo = filters.filtro_tipo;

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

  const handleCreateContact = async () => {
    if (!newContactData.municipio.trim()) return;
    setNewContactSaving(true);
    try {
      const created = await createContacto(newContactData);
      setContactos(prev => [created, ...prev]);
      setTotal(prev => prev + 1);
      setShowNewContact(false);
      setNewContactData({ municipio: '', provincia: '', comunidad_autonoma: '', email_general: '', email_patrimonio: '', persona_contacto: '', cargo: '', telefono: '', web: '', fuente: '', tipo: 'turismo', pais: 'España' });
    } catch (err) {
      console.error('Error creando contacto:', err);
      alert('Error al crear contacto: ' + (err.response?.data?.error || err.message));
    } finally {
      setNewContactSaving(false);
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
      if (usuariosPremiumFilter) params.premium = usuariosPremiumFilter;
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
  }, [usuariosSearchApplied, usuariosRolFilter, usuariosPremiumFilter]);

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

  // --- Mensajes handlers ---
  const fetchMensajes = useCallback(async (p = 1) => {
    setMensajesLoading(true);
    try {
      const params = { page: p, limit: 50 };
      if (mensajesFilter === 'no_leido') params.leido = 'false';
      if (mensajesFilter === 'leido') params.leido = 'true';
      const data = await getMensajes(params);
      setMensajes(data.items);
      setMensajesTotal(data.total);
      setMensajesTotalPages(data.total_pages);
      setMensajesPage(data.page);
    } catch (err) {
      console.error('Error cargando mensajes:', err);
    } finally {
      setMensajesLoading(false);
    }
  }, [mensajesFilter]);

  const fetchMensajesUnread = useCallback(async () => {
    try {
      const data = await getMensajesCount();
      setMensajesUnread(data.unread);
    } catch {}
  }, []);

  useEffect(() => {
    fetchMensajesUnread();
  }, [fetchMensajesUnread]);

  useEffect(() => {
    if (activeSection === 'mensajes') {
      fetchMensajes(1);
    }
  }, [activeSection, fetchMensajes]);

  const openMsg = async (msg) => {
    setSelectedMsgLoading(true);
    try {
      const detail = await getMensaje(msg.id);
      setSelectedMsg(detail);
      if (!msg.leido) {
        setMensajes(prev => prev.map(m => m.id === msg.id ? { ...m, leido: true } : m));
        setMensajesUnread(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error cargando mensaje:', err);
    } finally {
      setSelectedMsgLoading(false);
    }
  };

  const closeMsg = () => setSelectedMsg(null);

  const handleDeleteMsg = async (id) => {
    if (!window.confirm('¿Eliminar este mensaje?')) return;
    try {
      await deleteMensaje(id);
      setMensajes(prev => prev.filter(m => m.id !== id));
      setMensajesTotal(prev => prev - 1);
      if (selectedMsg?.id === id) setSelectedMsg(null);
      fetchMensajesUnread();
    } catch (err) {
      console.error('Error eliminando mensaje:', err);
    }
  };

  const handleToggleRespondido = async (msg) => {
    try {
      await updateMensaje(msg.id, { respondido: !msg.respondido });
      setMensajes(prev => prev.map(m => m.id === msg.id ? { ...m, respondido: !m.respondido } : m));
      if (selectedMsg?.id === msg.id) setSelectedMsg(prev => ({ ...prev, respondido: !prev.respondido }));
    } catch {}
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

  const getPremiumStatus = (u) => {
    if (!u.premium) return 'free';
    if (!u.premium_hasta || new Date(u.premium_hasta) > new Date()) return 'active';
    return 'expired';
  };

  const handleTogglePremium = async (user) => {
    const status = getPremiumStatus(user);
    const newPremium = status !== 'active';
    const label = newPremium ? 'activar Premium' : 'desactivar Premium';
    if (!window.confirm(`¿Seguro que quieres ${label} para ${user.email}?`)) return;
    try {
      const data = { premium: newPremium };
      if (newPremium) {
        const hasta = new Date();
        hasta.setFullYear(hasta.getFullYear() + 1);
        data.premium_hasta = hasta.toISOString();
      } else {
        data.premium_hasta = null;
      }
      await updateUsuarioPremium(user.id, data);
      fetchUsuarios(usuariosPage);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al cambiar premium');
    }
  };

  // --- Propuestas handlers ---
  const fetchPropuestas = useCallback(async (p = 1) => {
    setPropuestasLoading(true);
    try {
      const params = { page: p, limit: 50 };
      if (propuestasFilter) params.estado = propuestasFilter;
      const data = await getAdminPropuestas(params);
      setPropuestas(data.items);
      setPropuestasTotal(data.total);
      setPropuestasTotalPages(data.pages);
      setPropuestasPage(data.page);
    } catch (err) {
      console.error('Error cargando propuestas:', err);
    } finally {
      setPropuestasLoading(false);
    }
  }, [propuestasFilter]);

  const fetchPropuestasCount = useCallback(async () => {
    try {
      const data = await getAdminPropuestasCount();
      setPropuestasPendientes(data.pendientes);
    } catch {}
  }, []);

  useEffect(() => {
    fetchPropuestasCount();
  }, [fetchPropuestasCount]);

  useEffect(() => {
    if (activeSection === 'propuestas') fetchPropuestas(1);
  }, [activeSection, fetchPropuestas]);

  const openPropuesta = async (prop) => {
    setSelectedPropLoading(true);
    setPropResult(null);
    setWdResults(null);
    setRejectNotes('');
    setShowRejectModal(false);
    try {
      const detail = await getAdminPropuesta(prop.id);
      setSelectedProp(detail);
      setPropEditData({
        denominacion: detail.denominacion || '',
        tipo: detail.tipo || '',
        categoria: detail.categoria || '',
        provincia: detail.provincia || '',
        municipio: detail.municipio || '',
        localidad: detail.localidad || '',
        comunidad_autonoma: detail.comunidad_autonoma || '',
        pais: detail.pais || '',
        descripcion: detail.descripcion || '',
        estilo: detail.estilo || '',
        material: detail.material || '',
        inception: detail.inception || '',
        arquitecto: detail.arquitecto || '',
        wikipedia_url: detail.wikipedia_url || '',
        latitud: detail.latitud || '',
        longitud: detail.longitud || '',
      });
    } catch (err) {
      console.error('Error cargando propuesta:', err);
    } finally {
      setSelectedPropLoading(false);
    }
  };

  const closePropuesta = () => {
    setSelectedProp(null);
    setWdResults(null);
  };

  const handlePropSave = async () => {
    if (!selectedProp) return;
    setPropSaving(true);
    try {
      await updateAdminPropuesta(selectedProp.id, propEditData);
      setPropResult({ type: 'success', text: 'Cambios guardados' });
      setSelectedProp(prev => ({ ...prev, ...propEditData }));
    } catch (err) {
      setPropResult({ type: 'error', text: err.response?.data?.error || 'Error' });
    } finally {
      setPropSaving(false);
    }
  };

  const handleAprobar = async () => {
    if (!selectedProp || !window.confirm('¿Aprobar esta propuesta? Se creará el monumento.')) return;
    setPropSaving(true);
    try {
      // Save any pending edits first
      await updateAdminPropuesta(selectedProp.id, propEditData);
      const result = await aprobarPropuesta(selectedProp.id);
      setPropResult({ type: 'success', text: `Propuesta aprobada. Monumento #${result.bien_id} creado.` });
      setSelectedProp(prev => ({ ...prev, estado: 'aprobada', bien_id: result.bien_id }));
      fetchPropuestas(propuestasPage);
      fetchPropuestasCount();
    } catch (err) {
      setPropResult({ type: 'error', text: err.response?.data?.error || 'Error al aprobar' });
    } finally {
      setPropSaving(false);
    }
  };

  const handleRechazar = async () => {
    if (!selectedProp) return;
    setPropSaving(true);
    try {
      await rechazarPropuesta(selectedProp.id, rejectNotes);
      setPropResult({ type: 'success', text: 'Propuesta rechazada.' });
      setSelectedProp(prev => ({ ...prev, estado: 'rechazada', notas_admin: rejectNotes }));
      setShowRejectModal(false);
      fetchPropuestas(propuestasPage);
      fetchPropuestasCount();
    } catch (err) {
      setPropResult({ type: 'error', text: err.response?.data?.error || 'Error al rechazar' });
    } finally {
      setPropSaving(false);
    }
  };

  const handleWikidataSearch = async () => {
    if (!propEditData.denominacion) return;
    setWdSearching(true);
    setWdResults(null);
    try {
      const results = await searchWikidata(propEditData.denominacion, propEditData.pais);
      setWdResults(results);
    } catch (err) {
      console.error('Error buscando Wikidata:', err);
      setWdResults([]);
    } finally {
      setWdSearching(false);
    }
  };

  const applyWdResult = (wd) => {
    setPropEditData(prev => ({
      ...prev,
      descripcion: wd.description || prev.descripcion,
      wikipedia_url: wd.wikipedia_url || prev.wikipedia_url,
    }));
    if (wd.lat && wd.lng) {
      setPropEditData(prev => ({
        ...prev,
        latitud: wd.lat,
        longitud: wd.lng,
      }));
    }
    setWdResults(null);
  };

  // --- Social / Publicaciones handlers ---
  const SOCIAL_HASHTAGS = {
    base: ['#PatrimonioEuropeo', '#heritage', '#culturalheritage', '#monumentos', '#architecture'],
    'España': ['#spain', '#españa', '#visitspain', '#patrimoniohistorico', '#patrimonioespañol'],
    'Francia': ['#france', '#patrimoine', '#patrimoinefrance', '#monumentshistoriques'],
    'Portugal': ['#portugal', '#visitportugal', '#patrimonioportugues'],
    'Italia': ['#italia', '#bellaitalia', '#patrimonioitaliano', '#borghiitaliani'],
  };

  const SOCIAL_HASHTAGS_CAT = {
    castillo: ['#castlesofeurope', '#castle', '#medieval'],
    iglesia: ['#churchesofeurope', '#church', '#romanesque'],
    catedral: ['#cathedral', '#gothic', '#churchesofeurope'],
    palacio: ['#palace', '#baroque', '#royalpalace'],
    monasterio: ['#monastery', '#medieval', '#romanesque'],
    ermita: ['#chapel', '#countryside', '#ruralheritage'],
    torre: ['#tower', '#medieval', '#fortress'],
    puente: ['#bridge', '#engineering', '#historicbridge'],
    muralla: ['#citywall', '#medieval', '#fortress'],
    teatro: ['#theatre', '#performing', '#historictheatre'],
    arqueologia: ['#archaeology', '#ancienthistory', '#ruins'],
  };

  const socialGetHashtags = (monumento) => {
    const tags = [...SOCIAL_HASHTAGS.base];
    if (monumento.pais && SOCIAL_HASHTAGS[monumento.pais]) {
      tags.push(...SOCIAL_HASHTAGS[monumento.pais]);
    }
    const denom = (monumento.denominacion || '').toLowerCase();
    const cat = (monumento.categoria || '').toLowerCase();
    for (const [key, catTags] of Object.entries(SOCIAL_HASHTAGS_CAT)) {
      if (denom.includes(key) || cat.includes(key)) {
        tags.push(...catTags);
        break;
      }
    }
    if (monumento.municipio) tags.push(`#${monumento.municipio.replace(/\s+/g, '')}`);
    return [...new Set(tags)];
  };

  const socialGenerateText = (monumento, platform, mentions = []) => {
    const desc = monumento.wiki_descripcion || monumento.descripcion_completa || monumento.descripcion || '';
    const webUrl = `https://patrimonio-europeo.netlify.app/monumento/${monumento.id}`;
    const mentionStr = mentions.length > 0 ? '\n\n📌 ' + mentions.map(m => '@' + m.username).join(' ') : '';

    if (platform === 'instagram') {
      const shortDesc = desc.length > 200 ? desc.slice(0, 200).replace(/\s+\S*$/, '') + '...' : desc;
      const hashtags = socialGetHashtags(monumento);
      let text = `🏛️ ${monumento.denominacion}\n\n`;
      text += `📍 ${[monumento.municipio, monumento.provincia, monumento.pais].filter(Boolean).join(', ')}\n\n`;
      if (shortDesc) text += `${shortDesc}\n\n`;
      if (monumento.estilo) text += `🎨 Estilo: ${monumento.estilo}\n`;
      if (monumento.inception) text += `📅 ${monumento.inception}\n`;
      if (monumento.estilo || monumento.inception) text += '\n';
      text += `🔗 Mas info: ${webUrl}`;
      text += mentionStr;
      text += '\n\n' + hashtags.join(' ');
      return text;
    } else {
      const longDesc = desc.length > 500 ? desc.slice(0, 500).replace(/\s+\S*$/, '') + '...' : desc;
      let text = `🏛️ ${monumento.denominacion}\n\n`;
      text += `📍 ${[monumento.municipio, monumento.provincia].filter(Boolean).join(', ')} (${monumento.pais || ''})\n\n`;
      if (longDesc) text += `${longDesc}\n\n`;
      if (monumento.estilo) text += `Estilo: ${monumento.estilo}\n`;
      if (monumento.inception) text += `Fecha: ${monumento.inception}\n`;
      if (monumento.arquitecto) text += `Arquitecto: ${monumento.arquitecto}\n`;
      if (monumento.estilo || monumento.inception || monumento.arquitecto) text += '\n';
      text += `🔗 Ficha completa: ${webUrl}`;
      text += mentionStr;
      text += '\n\n#PatrimonioEuropeo #Monumentos';
      return text;
    }
  };

  const handleSocialSearch = async () => {
    if (!socialSearch.trim()) return;
    setSocialLoading(true);
    setSocialSelected(null);
    setSocialText('');
    try {
      const params = { q: socialSearch.trim(), limit: 20 };
      if (socialSearchPais) params.pais = socialSearchPais;
      const data = await getMonumentos(params);
      setSocialMonumentos(data.items || []);
    } catch (err) {
      console.error('Error buscando monumentos:', err);
      setSocialMonumentos([]);
    } finally {
      setSocialLoading(false);
    }
  };

  // ======== DIARIO (monumento del día calendar) ========
  const computeDailyPage = (dateObj) => {
    // Same algorithm as Home's MonumentOfDay.jsx — deterministic by date
    const seed = dateObj.getFullYear() * 10000 + (dateObj.getMonth() + 1) * 100 + dateObj.getDate();
    return (seed % 500) + 1;
  };

  const fetchMonumentForDate = async (dateObj) => {
    const page = computeDailyPage(dateObj);
    const data = await getMonumentos({ solo_wikidata: true, solo_imagen: true, limit: 1, page });
    const mon = data.items?.[0];
    if (!mon) return null;
    // Fetch full detail for description/style/etc. (used by socialGenerateText)
    try {
      return await getMonumento(mon.id);
    } catch {
      return mon;
    }
  };

  const loadDiarioDays = async () => {
    setSocialLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: diarioDaysCount }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { dateStr, dateObj: d, monument: null, loading: true };
    });
    setDiarioDays(days);

    // Fetch each day's monument (sequential to avoid rate limit)
    for (let i = 0; i < days.length; i++) {
      try {
        const mon = await fetchMonumentForDate(days[i].dateObj);
        setDiarioDays(prev => {
          const next = [...prev];
          next[i] = { ...next[i], monument: mon, loading: false };
          return next;
        });
      } catch {
        setDiarioDays(prev => {
          const next = [...prev];
          next[i] = { ...next[i], loading: false };
          return next;
        });
      }
    }
    setSocialLoading(false);
  };

  const handleDiarioSelectDate = async (day) => {
    if (!day.monument) return;
    setDiarioSelectedDate(day.dateStr);
    setSocialSelected(day.monument);
    // Suggest mentions using the monument's metadata
    let mentions = [];
    try {
      const params = { limit: 5 };
      if (day.monument.pais) params.pais = day.monument.pais;
      if (day.monument.comunidad_autonoma) params.region = day.monument.comunidad_autonoma;
      mentions = await getSocialAccountsSuggest(params);
    } catch { /* silent */ }
    setSocialMentions(mentions);
    setSocialText(socialGenerateText(day.monument, socialPlatform, mentions));
  };

  const handleSocialRandom = async () => {
    setSocialLoading(true);
    setSocialSelected(null);
    setSocialText('');
    try {
      // Fetch used IDs from DB (last 90 days)
      let usedIds = new Set();
      try {
        const hist = await getSocialHistory();
        usedIds = new Set(hist.ids || []);
      } catch { /* ignore if fails */ }

      const countParams = { limit: 1 };
      if (socialSearchPais) countParams.pais = socialSearchPais;
      const countData = await getMonumentos(countParams);
      const total = countData.total || 0;
      if (!total) { setSocialLoading(false); return; }

      const topHalf = Math.max(Math.ceil(total / 2), 50);
      const maxPage = Math.ceil(Math.min(topHalf, total) / 50);

      for (let attempt = 0; attempt < 5; attempt++) {
        const randomPage = Math.floor(Math.random() * maxPage) + 1;
        const fetchParams = { limit: 50, page: randomPage };
        if (socialSearchPais) fetchParams.pais = socialSearchPais;
        const data = await getMonumentos(fetchParams);
        const items = data.items || [];
        const candidates = items.filter(m => m.imagen_url && !usedIds.has(m.id));
        if (candidates.length > 0) {
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          const detail = await getMonumento(pick.id);
          setSocialSelected(detail);
          // Fetch mention suggestions
          let mentions = [];
          try {
            const params = { limit: 5 };
            if (detail.pais) params.pais = detail.pais;
            if (detail.comunidad_autonoma) params.region = detail.comunidad_autonoma;
            mentions = await getSocialAccountsSuggest(params);
          } catch { /* silent */ }
          setSocialMentions(mentions);
          setSocialText(socialGenerateText(detail, socialPlatform, mentions));
          setSocialMonumentos([pick]);
          return;
        }
      }
      setSocialMonumentos([]);
    } catch (err) {
      console.error('Error buscando monumento aleatorio:', err);
    } finally {
      setSocialLoading(false);
    }
  };

  const handleSocialSelect = async (mon) => {
    setSocialLoading(true);
    try {
      const detail = await getMonumento(mon.id);
      setSocialSelected(detail);

      // Fetch suggested mentions based on monument's country, region and theme
      let mentions = [];
      try {
        const params = { limit: 5 };
        if (detail.pais) params.pais = detail.pais;
        if (detail.comunidad_autonoma) params.region = detail.comunidad_autonoma;
        if (detail.estilo) {
          // Map estilo to theme keywords
          const estiloLower = (detail.estilo || '').toLowerCase();
          if (estiloLower.includes('roman') || estiloLower.includes('románi')) params.theme = 'romanico';
          else if (estiloLower.includes('góti') || estiloLower.includes('goti')) params.theme = 'gotico';
          else if (estiloLower.includes('barro')) params.theme = 'religioso';
          else if (estiloLower.includes('castill') || estiloLower.includes('fortale')) params.theme = 'castillos';
        }
        if (detail.tipo_monumento) {
          const tipoLower = (detail.tipo_monumento || '').toLowerCase();
          if (tipoLower.includes('castill') || tipoLower.includes('torre') || tipoLower.includes('murall')) params.theme = 'castillos';
          else if (tipoLower.includes('iglesi') || tipoLower.includes('catedr') || tipoLower.includes('monaster')) params.theme = 'religioso';
        }
        mentions = await getSocialAccountsSuggest(params);
      } catch {
        // silently fail if social accounts table doesn't exist yet
      }
      setSocialMentions(mentions);
      setSocialText(socialGenerateText(detail, socialPlatform, mentions));
    } catch (err) {
      console.error('Error cargando monumento:', err);
    } finally {
      setSocialLoading(false);
    }
  };

  const handleSocialPlatformChange = (platform) => {
    setSocialPlatform(platform);
    if (socialMode === 'ruta' && selectedRuta) {
      setSocialText(rutaGenerateText(selectedRuta, platform, socialMentions));
    } else if (socialSelected) {
      setSocialText(socialGenerateText(socialSelected, platform, socialMentions));
    }
  };

  // --- Rutas culturales para publicaciones ---
  const loadRutasCulturales = async () => {
    if (rutasCulturalesLoaded) return;
    try {
      const rutas = await getRutasCulturales();
      setRutasCulturales(rutas);
      setRutasCulturalesLoaded(true);
    } catch (err) {
      console.error('Error cargando rutas culturales:', err);
    }
  };

  // Pick N random items from array (Fisher-Yates shuffle + slice)
  const pickRandom = (arr, n) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  };

  const handleSelectRuta = async (value) => {
    if (!value) { setSelectedRuta(null); setSocialText(''); setRutaPhotos([]); return; }
    setSocialLoading(true);
    setRutaPhotos([]);
    try {
      let ruta;
      let photos = [];

      if (value.startsWith('curated:')) {
        // Curated route from curatedRoutes.js
        const curatedId = value.replace('curated:', '');
        const curated = CURATED_ROUTES.find(r => r.id === curatedId);
        if (!curated) return;
        ruta = {
          _type: 'curated',
          slug: curated.id,
          nombre: curated.name,
          pais: curated.countries?.[0] || null,
          region: null,
          descripcion: curated.period ? `${curated.period}. ` : '',
          paradas: (curated.highlights || []).map(h => ({ nombre: h })),
          stopsEstimate: curated.stopsEstimate,
          searchParams: curated.searchParams,
        };

        // Fetch monument images for the curated route using searchParams
        try {
          const searchData = await getMonumentos({ ...curated.searchParams, solo_wikidata: true, solo_imagen: true, limit: 30 });
          const withImage = (searchData.items || []).filter(m => m.imagen_url);
          photos = pickRandom(withImage, 6).map(m => ({
            url: m.imagen_url,
            alt: m.denominacion,
            municipio: m.municipio,
          }));
        } catch { /* silent */ }
      } else {
        // Cultural route from DB
        ruta = await getRutaCultural(value);

        // Collect all photos from paradas (supabase photos + bien images)
        const allPhotos = [];
        for (const p of (ruta.paradas || [])) {
          if (p.fotos?.length > 0) {
            p.fotos.forEach(f => allPhotos.push({ url: f.url, alt: p.nombre || f.titulo }));
          } else if (p.bien_imagen_url) {
            allPhotos.push({ url: p.bien_imagen_url, alt: p.nombre || p.bien_denominacion });
          }
        }
        photos = pickRandom(allPhotos, 6);
      }

      setSelectedRuta(ruta);
      setRutaPhotos(photos);

      // Fetch mentions
      let mentions = [];
      try {
        const params = { limit: 5 };
        if (ruta.pais) params.pais = ruta.pais;
        if (ruta.region) params.region = ruta.region;
        mentions = await getSocialAccountsSuggest(params);
      } catch { /* silent */ }
      setSocialMentions(mentions);
      setSocialText(rutaGenerateText(ruta, socialPlatform, mentions));
    } catch (err) {
      console.error('Error cargando ruta:', err);
    } finally {
      setSocialLoading(false);
    }
  };

  const rutaGenerateText = (ruta, platform, mentions = []) => {
    const isCurated = ruta._type === 'curated';
    const webUrl = isCurated
      ? `https://patrimonio-europeo.netlify.app/rutas-curadas/${ruta.slug}`
      : `https://patrimonio-europeo.netlify.app/rutas-culturales/${ruta.slug}`;
    const paradas = ruta.paradas || [];
    const numParadas = ruta.stopsEstimate || paradas.length;
    const mentionStr = mentions.length > 0 ? '\n\n📌 ' + mentions.map(m => '@' + m.username).join(' ') : '';

    if (platform === 'instagram') {
      let text = `🗺️ ${ruta.nombre}\n\n`;
      text += `📍 ${ruta.region || ruta.pais || ''}\n`;
      if (ruta.descripcion) text += `📅 ${ruta.descripcion}\n`;
      text += '\n';
      text += `🏛️ ${numParadas}${isCurated ? '+' : ''} monumentos\n`;
      if (paradas.length > 0) {
        const topParadas = paradas.slice(0, 5);
        topParadas.forEach((p, i) => {
          text += `  ${i + 1}. ${p.nombre || p.bien_denominacion || ''}\n`;
        });
        if (paradas.length > 5) text += `  ... y ${paradas.length - 5} más\n`;
        else if (isCurated && numParadas > paradas.length) text += `  ... y muchos más\n`;
      }
      text += `\n🔗 Descubre la ruta completa: ${webUrl}`;
      text += mentionStr;
      text += '\n\n#PatrimonioEuropeo #RutasCulturales #heritage #culturalheritage #monumentos #turismocultural';
      if (ruta.pais === 'España') text += ' #spain #españa #visitspain #patrimonioespañol';
      if (ruta.pais === 'Francia') text += ' #france #visitfrance #patrimoinefrance';
      if (ruta.pais === 'Italia') text += ' #italy #italia #bellaitalia #patrimonioitaliano';
      if (ruta.pais === 'Portugal') text += ' #portugal #visitportugal #patrimonioPortugues';
      return text;
    } else {
      let text = `🗺️ ${ruta.nombre}\n\n`;
      text += `📍 ${[ruta.region, ruta.pais].filter(Boolean).join(', ')}\n`;
      if (ruta.descripcion) text += `📅 ${ruta.descripcion}\n`;
      text += '\n';
      text += `🏛️ ${numParadas}${isCurated ? '+' : ''} monumentos para descubrir:\n`;
      if (paradas.length > 0) {
        paradas.forEach((p, i) => {
          text += `  ${i + 1}. ${p.nombre || p.bien_denominacion || ''}${p.municipio ? ' (' + p.municipio + ')' : ''}\n`;
        });
        if (isCurated && numParadas > paradas.length) text += `  ... y muchos más en la ruta\n`;
      }
      text += `\n🔗 Ruta completa: ${webUrl}`;
      text += mentionStr;
      text += '\n\n#PatrimonioEuropeo #RutasCulturales';
      return text;
    }
  };

  const handleSocialCopyText = async () => {
    try {
      await navigator.clipboard.writeText(socialText);
      setSocialCopied('text');
      setTimeout(() => setSocialCopied(''), 2000);
    } catch {
      setSocialCopied('error');
      setTimeout(() => setSocialCopied(''), 2000);
    }
  };

  const handleSocialCopyImage = async () => {
    const imgUrl = socialSelected?.imagen_url || socialSelected?.imagenes?.[0]?.url;
    if (!imgUrl) return;
    try {
      const resp = await fetch(imgUrl);
      const blob = await resp.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setSocialCopied('image');
      setTimeout(() => setSocialCopied(''), 2000);
    } catch {
      // Fallback: open image in new tab
      window.open(imgUrl, '_blank');
      setSocialCopied('image-url');
      setTimeout(() => setSocialCopied(''), 2000);
    }
  };

  const handleSocialDownloadImage = async () => {
    const imgUrl = socialSelected?.imagen_url || socialSelected?.imagenes?.[0]?.url;
    if (!imgUrl) return;
    try {
      const resp = await fetch(imgUrl);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      // Build filename from monument name + extension inferred from blob type
      const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg').split(';')[0];
      const safeName = (socialSelected.denominacion || 'monumento').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-').slice(0, 60);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${safeName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Error descargando imagen:', err);
      // Fallback: open in new tab
      window.open(imgUrl, '_blank');
    }
  };

  const handleSocialMarkUsed = async () => {
    if (!socialSelected) return;
    try {
      await addSocialHistory(socialSelected.id, socialPlatform);
      // Mark social accounts as used for rotation algorithm
      if (socialMentions.length > 0) {
        try {
          await markSocialAccountsUsed(socialMentions.map(m => m.id));
        } catch { /* silent */ }
      }
      setSocialCopied('used');
      setTimeout(() => setSocialCopied(''), 2500);
    } catch {
      console.error('Error marcando como usado');
    }
  };

  const socialImageUrl = socialSelected?.imagen_url || socialSelected?.imagenes?.[0]?.url || null;

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
            Contactos
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'usuarios' ? 'active' : ''}`}
            onClick={() => setActiveSection('usuarios')}
          >
            <span className="admin-nav-icon">👥</span>
            Usuarios
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'mensajes' ? 'active' : ''}`}
            onClick={() => setActiveSection('mensajes')}
          >
            <span className="admin-nav-icon">✉️</span>
            Mensajes
            {mensajesUnread > 0 && <span className="admin-nav-badge">{mensajesUnread}</span>}
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'propuestas' ? 'active' : ''}`}
            onClick={() => setActiveSection('propuestas')}
          >
            <span className="admin-nav-icon">📝</span>
            Propuestas
            {propuestasPendientes > 0 && <span className="admin-nav-badge">{propuestasPendientes}</span>}
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
          <button
            className={`admin-nav-item ${activeSection === 'publicaciones' ? 'active' : ''}`}
            onClick={() => setActiveSection('publicaciones')}
          >
            <span className="admin-nav-icon">📱</span>
            Publicaciones
          </button>
          <button
            className={`admin-nav-item ${activeSection === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveSection('settings')}
          >
            <span className="admin-nav-icon">⚙️</span>
            Configuración
          </button>
        </nav>
      </aside>

      <div className="admin-main">
        {activeSection === 'ayuntamientos' && (
          <>
            <div className="admin-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0 }}>Directorio de Contactos</h1>
              <button className="detail-save-btn" style={{ marginTop: 0 }} onClick={() => setShowNewContact(true)}>
                + Nuevo contacto
              </button>
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
                value={filters.filtro_tipo}
                onChange={(e) => { setFilters(f => ({ ...f, filtro_tipo: e.target.value })); }}
              >
                <option value="">Tipo: todos</option>
                <option value="ayuntamiento">Ayuntamientos</option>
                <option value="turismo">Oficinas de turismo</option>
                <option value="museo">Museos</option>
                <option value="patronato">Patronatos</option>
                <option value="asociacion">Asociaciones</option>
                <option value="otro">Otros</option>
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
                      <th className="th-check" style={{ width: 36 }}>
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th style={{ width: 220 }}>Municipio / Nombre<div className="th-resizer" onMouseDown={handleColumnResize} /></th>
                      <th style={{ width: 80 }}>Tipo<div className="th-resizer" onMouseDown={handleColumnResize} /></th>
                      <th style={{ width: 140 }}>CCAA<div className="th-resizer" onMouseDown={handleColumnResize} /></th>
                      <th style={{ width: 220 }}>Email<div className="th-resizer" onMouseDown={handleColumnResize} /></th>
                      <th style={{ width: 160 }}>Persona de contacto<div className="th-resizer" onMouseDown={handleColumnResize} /></th>
                      <th style={{ width: 100 }}>Tel.<div className="th-resizer" onMouseDown={handleColumnResize} /></th>
                      <th style={{ width: 100 }}>Fuente<div className="th-resizer" onMouseDown={handleColumnResize} /></th>
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
                          <td><span className={`tipo-badge tipo-${c.tipo || 'ayuntamiento'}`}>{c.tipo || 'ayuntamiento'}</span></td>
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
              <select
                className="admin-select"
                value={usuariosPremiumFilter}
                onChange={(e) => setUsuariosPremiumFilter(e.target.value)}
              >
                <option value="">Todos (premium)</option>
                <option value="active">Premium activo</option>
                <option value="expired">Premium expirado</option>
                <option value="free">Free</option>
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
                      <th>Premium</th>
                      <th>Hasta</th>
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
                        <td>
                          <span
                            className={`premium-badge ${getPremiumStatus(u)}`}
                            onClick={() => handleTogglePremium(u)}
                            title="Click para cambiar estado premium"
                          >
                            {getPremiumStatus(u) === 'active' ? 'Activo' : getPremiumStatus(u) === 'expired' ? 'Expirado' : 'Free'}
                          </span>
                        </td>
                        <td className="td-fecha">{u.premium_hasta ? new Date(u.premium_hasta).toLocaleDateString() : '--'}</td>
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
                        <td colSpan="12" className="admin-empty">No se encontraron usuarios</td>
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
          <>
            <AnalyticsDashboard />
            <TrafficAnalyticsCard />
          </>
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

        {activeSection === 'mensajes' && (
          <>
            <div className="admin-header">
              <h1>Mensajes de contacto</h1>
              <div className="admin-stats-row">
                <div className="admin-stat">
                  <span className="admin-stat-num">{mensajesTotal}</span>
                  <span className="admin-stat-label">Total</span>
                </div>
                <div className="admin-stat">
                  <span className="admin-stat-num">{mensajesUnread}</span>
                  <span className="admin-stat-label">Sin leer</span>
                </div>
              </div>
            </div>

            <div className="admin-filters">
              <select
                className="admin-select"
                value={mensajesFilter}
                onChange={e => setMensajesFilter(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="no_leido">Sin leer</option>
                <option value="leido">Leidos</option>
              </select>
              <span className="admin-result-count">{mensajesTotal} mensaje{mensajesTotal !== 1 ? 's' : ''}</span>
            </div>

            <div className="admin-table-wrap">
              {mensajesLoading ? (
                <div className="admin-loading">Cargando...</div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}></th>
                      <th>De</th>
                      <th>Asunto</th>
                      <th>Fecha</th>
                      <th style={{ width: 30 }}></th>
                      <th style={{ width: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mensajes.map(m => (
                      <tr
                        key={m.id}
                        className={`row-clickable ${!m.leido ? 'row-msg-unread' : ''} ${m.respondido ? 'row-msg-replied' : ''} ${selectedMsg?.id === m.id ? 'row-active' : ''}`}
                        onClick={() => openMsg(m)}
                      >
                        <td className="td-msg-status">
                          {!m.leido && <span className="msg-dot" title="Sin leer" />}
                          {m.respondido && <span className="msg-replied-icon" title="Respondido">↩</span>}
                        </td>
                        <td className="td-email">{m.email}</td>
                        <td className={!m.leido ? 'td-msg-subject-unread' : ''}>
                          {m.asunto}
                          {m.num_archivos > 0 && <span className="msg-attach-icon" title={`${m.num_archivos} adjunto(s)`}>📎</span>}
                        </td>
                        <td className="td-fecha">{new Date(m.created_at).toLocaleString()}</td>
                        <td>
                          <a
                            href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.asunto)}`}
                            className="msg-reply-btn"
                            title="Responder"
                            onClick={e => e.stopPropagation()}
                          >↩</a>
                        </td>
                        <td>
                          <button
                            className="tarea-delete-btn"
                            title="Eliminar"
                            onClick={e => { e.stopPropagation(); handleDeleteMsg(m.id); }}
                          >&times;</button>
                        </td>
                      </tr>
                    ))}
                    {mensajes.length === 0 && (
                      <tr>
                        <td colSpan="6" className="admin-empty">No hay mensajes</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {mensajesTotalPages > 1 && (
              <div className="admin-pagination">
                <button disabled={mensajesPage <= 1} onClick={() => fetchMensajes(mensajesPage - 1)}>Anterior</button>
                <span>Pagina {mensajesPage} de {mensajesTotalPages}</span>
                <button disabled={mensajesPage >= mensajesTotalPages} onClick={() => fetchMensajes(mensajesPage + 1)}>Siguiente</button>
              </div>
            )}
          </>
        )}
        {activeSection === 'propuestas' && (
          <>
            <div className="admin-header">
              <h1>Propuestas de monumentos</h1>
              <div className="admin-stats-row">
                <div className="admin-stat">
                  <span className="admin-stat-num">{propuestasTotal}</span>
                  <span className="admin-stat-label">Total</span>
                </div>
                <div className="admin-stat">
                  <span className="admin-stat-num">{propuestasPendientes}</span>
                  <span className="admin-stat-label">Pendientes</span>
                </div>
              </div>
            </div>

            <div className="admin-filters">
              <select
                className="admin-select"
                value={propuestasFilter}
                onChange={e => setPropuestasFilter(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="pendiente">Pendientes</option>
                <option value="aprobada">Aprobadas</option>
                <option value="rechazada">Rechazadas</option>
              </select>
              <span className="admin-result-count">{propuestasTotal} propuesta{propuestasTotal !== 1 ? 's' : ''}</span>
            </div>

            <div className="admin-table-wrap">
              {propuestasLoading ? (
                <div className="admin-loading">Cargando...</div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Pais</th>
                      <th>Municipio</th>
                      <th>Propuesto por</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {propuestas.map(p => (
                      <tr
                        key={p.id}
                        className={`row-clickable ${selectedProp?.id === p.id ? 'row-active' : ''}`}
                        onClick={() => openPropuesta(p)}
                      >
                        <td className="td-municipio">{p.denominacion}</td>
                        <td>{p.pais}</td>
                        <td>{p.municipio || '--'}</td>
                        <td className="td-email">{p.usuario_nombre || p.usuario_email}</td>
                        <td className="td-fecha">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td>
                          <span className={`prop-status-badge prop-status-${p.estado}`}>
                            {p.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {propuestas.length === 0 && (
                      <tr>
                        <td colSpan="6" className="admin-empty">No hay propuestas</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {propuestasTotalPages > 1 && (
              <div className="admin-pagination">
                <button disabled={propuestasPage <= 1} onClick={() => fetchPropuestas(propuestasPage - 1)}>Anterior</button>
                <span>Pagina {propuestasPage} de {propuestasTotalPages}</span>
                <button disabled={propuestasPage >= propuestasTotalPages} onClick={() => fetchPropuestas(propuestasPage + 1)}>Siguiente</button>
              </div>
            )}
          </>
        )}

        {activeSection === 'publicaciones' && (
          <>
            <div className="admin-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <h1>Publicaciones para redes sociales</h1>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="detail-save-btn"
                  style={{ marginTop: 0 }}
                  onClick={() => setShowWebPresentation(true)}
                >
                  🎨 Presentación de la web
                </button>
                <button
                  className="social-random-btn"
                  style={{ marginTop: 0 }}
                  onClick={() => window.open('/logo-generator.html', '_blank')}
                >
                  🏛️ Generador de logos
                </button>
              </div>
            </div>

            {/* Mode selector: Monumento vs Ruta */}
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: socialMode === 'monumento' ? 700 : 400 }}>
                <input type="radio" name="socialMode" value="monumento" checked={socialMode === 'monumento'} onChange={() => { setSocialMode('monumento'); setSelectedRuta(null); }} />
                🏛️ Monumento
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: socialMode === 'ruta' ? 700 : 400 }}>
                <input type="radio" name="socialMode" value="ruta" checked={socialMode === 'ruta'} onChange={() => { setSocialMode('ruta'); setSocialSelected(null); setSocialText(''); loadRutasCulturales(); }} />
                🗺️ Ruta cultural
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: socialMode === 'diario' ? 700 : 400 }}>
                <input type="radio" name="socialMode" value="diario" checked={socialMode === 'diario'} onChange={() => { setSocialMode('diario'); setSocialSelected(null); setSocialText(''); setSelectedRuta(null); if (diarioDays.length === 0) loadDiarioDays(); }} />
                📅 Diario
              </label>
            </div>

            {socialMode === 'diario' && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 8, fontSize: '0.88rem', color: '#1e3a8a' }}>
                📅 El monumento de cada día se calcula automáticamente a partir de la fecha (misma regla que el home público). Usa esta vista para preparar publicaciones de los próximos {diarioDaysCount} días.
              </div>
            )}

            {socialMode === 'monumento' ? (
              <div className="social-search-bar">
                <input
                  type="text"
                  className="admin-search"
                  placeholder="Buscar monumento..."
                  value={socialSearch}
                  onChange={e => setSocialSearch(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSocialSearch(); }}
                />
                {/* Country filter chips */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {[{ value: '', label: 'Todos' }, { value: 'España', label: '🇪🇸' }, { value: 'Francia', label: '🇫🇷' }, { value: 'Italia', label: '🇮🇹' }, { value: 'Portugal', label: '🇵🇹' }].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSocialSearchPais(opt.value)}
                      style={{
                        padding: '0.35rem 0.7rem',
                        border: socialSearchPais === opt.value ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                        borderRadius: '20px',
                        background: socialSearchPais === opt.value ? '#3b82f6' : 'white',
                        color: socialSearchPais === opt.value ? 'white' : '#475569',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: socialSearchPais === opt.value ? 600 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button className="detail-save-btn" style={{ marginTop: 0 }} onClick={handleSocialSearch} disabled={socialLoading || !socialSearch.trim()}>
                  {socialLoading ? 'Buscando...' : 'Buscar'}
                </button>
                <button className="social-random-btn" onClick={handleSocialRandom} disabled={socialLoading}>
                  🎲 Aleatorio
                </button>
              </div>
            ) : (
              <div className="social-search-bar">
                <select
                  className="admin-select"
                  style={{ flex: 1, minWidth: '250px' }}
                  value={selectedRuta ? (selectedRuta._type === 'curated' ? 'curated:' + selectedRuta.slug : selectedRuta.slug) : ''}
                  onChange={e => handleSelectRuta(e.target.value)}
                  disabled={socialLoading}
                >
                  <option value="">Selecciona una ruta...</option>
                  {rutasCulturales.length > 0 && (
                    <optgroup label="🗺️ Rutas culturales (con paradas y fotos)">
                      {rutasCulturales.map(r => (
                        <option key={r.slug} value={r.slug}>
                          {r.nombre} ({r.num_paradas || '?'} paradas) — {r.pais || ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="📍 Rutas curadas (temáticas)">
                    {CURATED_ROUTES.map(r => (
                      <option key={r.id} value={'curated:' + r.id}>
                        {r.name} ({r.stopsEstimate}+ monumentos) — {r.countries?.join(', ')}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}

            <div className="social-content">
              {/* Left: results list (only in monumento mode) */}
              {socialMode === 'monumento' && (
              <div className="social-results">
                {socialMonumentos.length === 0 && !socialLoading && (
                  <p className="no-data" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    {socialSearch ? 'Sin resultados' : 'Busca un monumento para generar una publicacion'}
                  </p>
                )}
                {socialLoading && !socialSelected && (
                  <div className="admin-loading">Buscando...</div>
                )}
                {socialMonumentos.map(m => (
                  <div
                    key={m.id}
                    className={`social-result-card ${socialSelected?.id === m.id ? 'active' : ''}`}
                    onClick={() => handleSocialSelect(m)}
                  >
                    <div className="social-result-img">
                      {m.imagen_url ? (
                        <img src={m.imagen_url} alt="" onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }} />
                      ) : (
                        <img src="/no-image.svg" alt="" />
                      )}
                    </div>
                    <div className="social-result-info">
                      <strong>{m.denominacion}</strong>
                      <span>{[m.municipio, m.provincia].filter(Boolean).join(', ')}</span>
                      <span className="social-result-pais">{m.pais}</span>
                    </div>
                  </div>
                ))}
              </div>
              )}

              {/* Left: calendar list (diario mode) */}
              {socialMode === 'diario' && (
                <div className="social-results">
                  {diarioDays.length === 0 && socialLoading && (
                    <div className="admin-loading">Cargando calendario...</div>
                  )}
                  {diarioDays.map((day, idx) => {
                    const d = day.dateObj;
                    const weekdayShort = d.toLocaleDateString('es-ES', { weekday: 'short' });
                    const dayNum = d.getDate();
                    const monthShort = d.toLocaleDateString('es-ES', { month: 'short' });
                    const isToday = idx === 0;
                    const selected = diarioSelectedDate === day.dateStr;
                    return (
                      <div
                        key={day.dateStr}
                        className={`social-result-card ${selected ? 'active' : ''}`}
                        onClick={() => handleDiarioSelectDate(day)}
                        style={isToday ? { borderLeft: '3px solid #3b82f6' } : undefined}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 56, background: isToday ? '#eff6ff' : '#f8fafc', borderRadius: 8, padding: '0.5rem 0.25rem' }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>{weekdayShort}</span>
                          <strong style={{ fontSize: '1.3rem', color: isToday ? '#1e3a8a' : '#1e293b' }}>{dayNum}</strong>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{monthShort}</span>
                        </div>
                        <div className="social-result-img">
                          {day.monument?.imagen_url ? (
                            <img src={day.monument.imagen_url} alt="" onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }} />
                          ) : (
                            <img src="/no-image.svg" alt="" />
                          )}
                        </div>
                        <div className="social-result-info">
                          {day.loading ? (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Cargando...</span>
                          ) : day.monument ? (
                            <>
                              <strong>{day.monument.denominacion}</strong>
                              <span>{[day.monument.municipio, day.monument.provincia].filter(Boolean).join(', ')}</span>
                              <span className="social-result-pais">{day.monument.pais}</span>
                            </>
                          ) : (
                            <span style={{ color: '#ef4444' }}>Sin monumento</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Right: post generator */}
              <div className="social-generator" style={socialMode === 'ruta' ? { gridColumn: '1 / -1' } : undefined}>
                {(socialMode === 'monumento' && !socialSelected) || (socialMode === 'ruta' && !selectedRuta) || (socialMode === 'diario' && !socialSelected) ? (
                  <div className="social-placeholder">
                    <span>
                      {socialMode === 'monumento' && 'Selecciona un monumento de la lista para generar la publicacion'}
                      {socialMode === 'ruta' && 'Selecciona una ruta cultural del desplegable'}
                      {socialMode === 'diario' && 'Selecciona un día del calendario para generar su publicación'}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="social-tabs">
                      <button
                        className={`social-tab ${socialPlatform === 'instagram' ? 'active' : ''}`}
                        onClick={() => handleSocialPlatformChange('instagram')}
                      >
                        Instagram
                      </button>
                      <button
                        className={`social-tab ${socialPlatform === 'facebook' ? 'active' : ''}`}
                        onClick={() => handleSocialPlatformChange('facebook')}
                      >
                        Facebook
                      </button>
                    </div>

                    <div className="social-preview-area">
                      {(socialMode === 'monumento' || socialMode === 'diario') && socialImageUrl && (
                        <div className="social-image-preview">
                          <img src={socialImageUrl} alt={socialSelected.denominacion} onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }} />
                          <div className="social-image-actions">
                            <button className="social-copy-btn" onClick={handleSocialCopyImage} title="Copiar imagen o abrir en nueva pestaña">
                              {socialCopied === 'image' ? '✓ Imagen copiada' : socialCopied === 'image-url' ? '↗ Abierta en pestaña' : 'Copiar imagen'}
                            </button>
                            <button className="social-download-btn" onClick={handleSocialDownloadImage} title="Descargar imagen al disco">
                              Descargar
                            </button>
                          </div>
                        </div>
                      )}
                      {socialMode === 'ruta' && rutaPhotos.length > 0 && (
                        <div className="social-image-preview" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {/* Main photo */}
                          <img src={rutaPhotos[0].url} alt={rutaPhotos[0].alt} style={{ borderRadius: '8px', maxHeight: '280px', objectFit: 'cover' }} onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }} />
                          {/* Thumbnails */}
                          {rutaPhotos.length > 1 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.4rem' }}>
                              {rutaPhotos.slice(1).map((p, i) => (
                                <div key={i} style={{ position: 'relative' }}>
                                  <img
                                    src={p.url}
                                    alt={p.alt}
                                    style={{ width: '100%', height: '70px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer' }}
                                    title={p.alt}
                                    onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="social-image-actions">
                            <button className="social-copy-btn" onClick={() => {
                              // Re-shuffle photos
                              const allPhotosForShuffle = selectedRuta._type === 'curated' ? rutaPhotos : [];
                              if (selectedRuta._type !== 'curated' && selectedRuta.paradas) {
                                for (const p of selectedRuta.paradas) {
                                  if (p.fotos?.length > 0) p.fotos.forEach(f => allPhotosForShuffle.push({ url: f.url, alt: p.nombre || f.titulo }));
                                  else if (p.bien_imagen_url) allPhotosForShuffle.push({ url: p.bien_imagen_url, alt: p.nombre || p.bien_denominacion });
                                }
                              }
                              if (allPhotosForShuffle.length > 6) setRutaPhotos(pickRandom(allPhotosForShuffle, 6));
                            }} title="Mezclar fotos aleatorias">
                              🔀 Mezclar fotos
                            </button>
                            <button className="social-download-btn" onClick={async () => {
                              // Download all photos one by one
                              for (let i = 0; i < rutaPhotos.length; i++) {
                                try {
                                  const resp = await fetch(rutaPhotos[i].url);
                                  const blob = await resp.blob();
                                  const blobUrl = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = blobUrl;
                                  a.download = `ruta-${selectedRuta.slug}-${i + 1}.${blob.type.split('/')[1] || 'jpg'}`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(blobUrl);
                                } catch {
                                  window.open(rutaPhotos[i].url, '_blank');
                                }
                              }
                              setSocialCopied('image');
                              setTimeout(() => setSocialCopied(''), 2000);
                            }}>
                              {socialCopied === 'image' ? `✓ ${rutaPhotos.length} descargadas` : `⬇ Descargar ${rutaPhotos.length} fotos`}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="social-text-area">
                        <textarea
                          value={socialText}
                          onChange={e => setSocialText(e.target.value)}
                          rows={14}
                        />
                        <div className="social-text-meta">
                          <span className={socialText.length > 2200 && socialPlatform === 'instagram' ? 'social-char-over' : ''}>
                            {socialText.length} caracteres
                            {socialPlatform === 'instagram' && ' / 2.200 max'}
                          </span>
                          <div className="social-text-actions">
                            <button
                              className="social-regen-btn"
                              onClick={() => setSocialText(socialMode === 'ruta' && selectedRuta ? rutaGenerateText(selectedRuta, socialPlatform, socialMentions) : socialGenerateText(socialSelected, socialPlatform, socialMentions))}
                              title="Regenerar texto original"
                            >
                              Regenerar
                            </button>
                            <button
                              className={`social-copy-btn ${socialCopied === 'text' ? 'copied' : ''}`}
                              onClick={handleSocialCopyText}
                            >
                              {socialCopied === 'text' ? '✓ Copiado!' : 'Copiar texto'}
                            </button>
                            <button
                              className={`social-used-btn ${socialCopied === 'used' ? 'used' : ''}`}
                              onClick={handleSocialMarkUsed}
                              title="Marcar como publicado para no repetir"
                            >
                              {socialCopied === 'used' ? '✓ Marcado!' : 'Se usa'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal detalle propuesta */}
      {selectedProp && (
        <div className="modal-overlay" onClick={closePropuesta}>
          <div className="modal-content prop-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedProp.denominacion}</h2>
              <button className="detail-close" onClick={closePropuesta}>&times;</button>
            </div>
            <div className="modal-body prop-modal-body">
              {selectedPropLoading ? (
                <div className="admin-loading">Cargando...</div>
              ) : (
                <>
                  <div className="prop-meta-bar">
                    <span className={`prop-status-badge prop-status-${selectedProp.estado}`}>
                      {selectedProp.estado}
                    </span>
                    <span className="prop-meta-user">
                      Propuesto por: {selectedProp.usuario_nombre || selectedProp.usuario_email}
                    </span>
                    <span className="prop-meta-date">
                      {new Date(selectedProp.created_at).toLocaleString()}
                    </span>
                  </div>

                  {/* Editable fields */}
                  <div className="prop-edit-grid">
                    <label className="detail-field prop-field-wide">
                      <span>Nombre</span>
                      <input type="text" value={propEditData.denominacion} onChange={e => setPropEditData(d => ({ ...d, denominacion: e.target.value }))} disabled={selectedProp.estado !== 'pendiente'} />
                    </label>
                    <label className="detail-field">
                      <span>Pais</span>
                      <input type="text" value={propEditData.pais} onChange={e => setPropEditData(d => ({ ...d, pais: e.target.value }))} disabled={selectedProp.estado !== 'pendiente'} />
                    </label>
                    <label className="detail-field">
                      <span>Region</span>
                      <input type="text" value={propEditData.comunidad_autonoma} onChange={e => setPropEditData(d => ({ ...d, comunidad_autonoma: e.target.value }))} disabled={selectedProp.estado !== 'pendiente'} />
                    </label>
                    <label className="detail-field">
                      <span>Provincia</span>
                      <input type="text" value={propEditData.provincia} onChange={e => setPropEditData(d => ({ ...d, provincia: e.target.value }))} disabled={selectedProp.estado !== 'pendiente'} />
                    </label>
                    <label className="detail-field">
                      <span>Municipio</span>
                      <input type="text" value={propEditData.municipio} onChange={e => setPropEditData(d => ({ ...d, municipio: e.target.value }))} disabled={selectedProp.estado !== 'pendiente'} />
                    </label>
                    <label className="detail-field">
                      <span>Localidad</span>
                      <input type="text" value={propEditData.localidad} onChange={e => setPropEditData(d => ({ ...d, localidad: e.target.value }))} disabled={selectedProp.estado !== 'pendiente'} />
                    </label>
                    <label className="detail-field">
                      <span>Categoria</span>
                      <input type="text" value={propEditData.categoria} onChange={e => setPropEditData(d => ({ ...d, categoria: e.target.value }))} disabled={selectedProp.estado !== 'pendiente'} />
                    </label>
                    <label className="detail-field">
                      <span>Tipo</span>
                      <input type="text" value={propEditData.tipo} onChange={e => setPropEditData(d => ({ ...d, tipo: e.target.value }))} disabled={selectedProp.estado !== 'pendiente'} />
                    </label>
                    <label className="detail-field">
                      <span>Estilo</span>
                      <input type="text" value={propEditData.estilo} onChange={e => setPropEditData(d => ({ ...d, estilo: e.target.value }))} disabled={selectedProp.estado !== 'pendiente'} />
                    </label>
                    <label className="detail-field">
                      <span>Material</span>
                      <input type="text" value={propEditData.material} onChange={e => setPropEditData(d => ({ ...d, material: e.target.value }))} disabled={selectedProp.estado !== 'pendiente'} />
                    </label>
                    <label className="detail-field">
                      <span>Epoca</span>
                      <input type="text" value={propEditData.inception} onChange={e => setPropEditData(d => ({ ...d, inception: e.target.value }))} disabled={selectedProp.estado !== 'pendiente'} />
                    </label>
                    <label className="detail-field">
                      <span>Arquitecto</span>
                      <input type="text" value={propEditData.arquitecto} onChange={e => setPropEditData(d => ({ ...d, arquitecto: e.target.value }))} disabled={selectedProp.estado !== 'pendiente'} />
                    </label>
                    <label className="detail-field">
                      <span>Latitud</span>
                      <input type="number" step="any" value={propEditData.latitud} onChange={e => setPropEditData(d => ({ ...d, latitud: e.target.value }))} disabled={selectedProp.estado !== 'pendiente'} />
                    </label>
                    <label className="detail-field">
                      <span>Longitud</span>
                      <input type="number" step="any" value={propEditData.longitud} onChange={e => setPropEditData(d => ({ ...d, longitud: e.target.value }))} disabled={selectedProp.estado !== 'pendiente'} />
                    </label>
                    <label className="detail-field prop-field-wide">
                      <span>Wikipedia URL</span>
                      <input type="url" value={propEditData.wikipedia_url} onChange={e => setPropEditData(d => ({ ...d, wikipedia_url: e.target.value }))} disabled={selectedProp.estado !== 'pendiente'} />
                    </label>
                    <label className="detail-field prop-field-wide">
                      <span>Descripcion</span>
                      <textarea rows={3} value={propEditData.descripcion} onChange={e => setPropEditData(d => ({ ...d, descripcion: e.target.value }))} disabled={selectedProp.estado !== 'pendiente'} />
                    </label>
                  </div>

                  {/* Images gallery */}
                  {selectedProp.imagenes?.length > 0 && (
                    <div className="prop-images-section">
                      <h4>Imagenes ({selectedProp.imagenes.length})</h4>
                      <div className="prop-images-grid">
                        {selectedProp.imagenes.map(img => (
                          <div key={img.id} className="prop-image-item">
                            {img.url ? (
                              <img src={img.url} alt={img.nombre} onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }} />
                            ) : (
                              <img src={getPropuestaImagenUrl(selectedProp.id, img.id)} alt={img.nombre} onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }} />
                            )}
                            <span className="prop-image-name">{img.nombre}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Wikidata search */}
                  {selectedProp.estado === 'pendiente' && (
                    <div className="prop-wikidata-section">
                      <button
                        className="prop-wikidata-btn"
                        onClick={handleWikidataSearch}
                        disabled={wdSearching || !propEditData.denominacion}
                      >
                        {wdSearching ? 'Buscando...' : 'Buscar en Wikidata'}
                      </button>

                      {wdResults && (
                        <div className="prop-wikidata-results">
                          {wdResults.length === 0 ? (
                            <p className="no-data">Sin resultados en Wikidata</p>
                          ) : (
                            wdResults.map(wd => (
                              <div key={wd.qid} className="prop-wd-item" onClick={() => applyWdResult(wd)}>
                                <div className="prop-wd-info">
                                  <strong>{wd.label}</strong>
                                  <span className="prop-wd-qid">{wd.qid}</span>
                                  {wd.description && <p>{wd.description}</p>}
                                  {wd.wikipedia_url && <small>{wd.wikipedia_url}</small>}
                                </div>
                                {wd.image && (
                                  <img src={wd.image} alt="" className="prop-wd-thumb" onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }} />
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {propResult && (
                    <div className={propResult.type === 'success' ? 'profile-success' : 'profile-error'}>
                      {propResult.text}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              {selectedProp.estado === 'pendiente' && (
                <>
                  <button className="detail-save-btn" onClick={handlePropSave} disabled={propSaving}>
                    {propSaving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                  <button className="prop-approve-btn" onClick={handleAprobar} disabled={propSaving}>
                    Aprobar
                  </button>
                  <button className="btn-cancel-email" onClick={() => setShowRejectModal(true)} disabled={propSaving}>
                    Rechazar
                  </button>
                </>
              )}
              {selectedProp.estado === 'aprobada' && selectedProp.bien_id && (
                <a href={`/monumento/${selectedProp.bien_id}`} className="detail-save-btn" target="_blank" rel="noopener noreferrer">
                  Ver monumento #{selectedProp.bien_id}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal rechazar propuesta */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Rechazar propuesta</h2>
              <button className="detail-close" onClick={() => setShowRejectModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <label className="detail-field">
                <span>Motivo del rechazo (visible para el usuario)</span>
                <textarea
                  rows={4}
                  value={rejectNotes}
                  onChange={e => setRejectNotes(e.target.value)}
                  placeholder="Explica por que se rechaza esta propuesta..."
                />
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel-email" onClick={handleRechazar} disabled={propSaving}>
                {propSaving ? 'Procesando...' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle mensaje */}
      {selectedMsg && (
        <div className="modal-overlay" onClick={closeMsg}>
          <div className="modal-content msg-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedMsg.asunto}</h2>
              <button className="detail-close" onClick={closeMsg}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="msg-meta">
                <span className="msg-meta-from">
                  <strong>De:</strong> <a href={`mailto:${selectedMsg.email}`}>{selectedMsg.email}</a>
                </span>
                <span className="msg-meta-date">{new Date(selectedMsg.created_at).toLocaleString()}</span>
              </div>
              <div className="msg-body">{selectedMsg.mensaje}</div>

              {selectedMsg.archivos?.length > 0 && (
                <div className="msg-attachments">
                  <h4>Adjuntos ({selectedMsg.archivos.length})</h4>
                  {selectedMsg.archivos.map(a => (
                    <a
                      key={a.id}
                      href={getMensajeArchivoUrl(selectedMsg.id, a.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="msg-attachment-link"
                    >
                      📎 {a.nombre} <span className="msg-attachment-size">({(a.tamano / 1024).toFixed(0)} KB)</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className={`msg-toggle-replied ${selectedMsg.respondido ? 'active' : ''}`}
                onClick={() => handleToggleRespondido(selectedMsg)}
              >
                {selectedMsg.respondido ? '✓ Respondido' : 'Marcar respondido'}
              </button>
              <a
                href={`mailto:${selectedMsg.email}?subject=Re: ${encodeURIComponent(selectedMsg.asunto)}`}
                className="detail-save-btn msg-reply-main-btn"
              >
                Responder
              </a>
              <button className="btn-cancel-email" onClick={() => handleDeleteMsg(selectedMsg.id)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {emailModal && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) closeEmailModal(); }}>
          <div className="modal-content email-modal">
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
                  </span>
                </div>
              )}
              {emailStatus?.error && (
                <div className="email-error-msg">{emailStatus.error}</div>
              )}

              {/* Results modal when finished */}
              {emailStatus && !emailStatus.running && emailStatus.finished_at && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1.25rem', marginTop: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.75rem', color: '#166534', fontSize: '1.1rem' }}>
                    Envío completado
                  </h3>
                  <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.75rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#16a34a' }}>{emailStatus.sent}</div>
                      <div style={{ fontSize: '0.8rem', color: '#166534' }}>enviados</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: emailStatus.failed > 0 ? '#dc2626' : '#94a3b8' }}>{emailStatus.failed}</div>
                      <div style={{ fontSize: '0.8rem', color: emailStatus.failed > 0 ? '#991b1b' : '#64748b' }}>fallidos</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#475569' }}>{emailStatus.total}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>total</div>
                    </div>
                  </div>

                  {emailStatus.errors?.length > 0 && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <p style={{ margin: '0 0 0.5rem', fontWeight: 600, color: '#991b1b', fontSize: '0.9rem' }}>
                        Emails fallidos ({emailStatus.errors.length}):
                      </p>
                      <div style={{ maxHeight: '150px', overflowY: 'auto', background: '#fff1f2', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                        {emailStatus.errors.map((e, i) => (
                          <div key={i} style={{ padding: '0.25rem 0', borderBottom: i < emailStatus.errors.length - 1 ? '1px solid #fecdd3' : 'none' }}>
                            <strong>{e.municipio}</strong> ({e.email}): <span style={{ color: '#991b1b' }}>{e.error}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        style={{ marginTop: '0.5rem', padding: '0.4rem 0.8rem', border: '1px solid #fca5a5', borderRadius: '6px', background: 'white', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem' }}
                        onClick={() => {
                          const csv = 'Municipio;Email;Error\n' + emailStatus.errors.map(e => `${e.municipio};${e.email};${e.error}`).join('\n');
                          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `emails-fallidos-${new Date().toISOString().slice(0, 10)}.csv`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                      >
                        ⬇ Descargar listado de fallidos (.csv)
                      </button>
                    </div>
                  )}

                  <button
                    className="detail-save-btn"
                    style={{ marginTop: '1rem', width: '100%' }}
                    onClick={() => {
                      setEmailModal(false);
                      setEmailStatus(null);
                      setEmailForm(f => ({ ...f, asunto: '', cuerpo: '' }));
                      setEmailFiles([]);
                      setEmailIncludePDF(false);
                      setSelectedIds(new Set());
                    }}
                  >
                    Cerrar y preparar nuevo envío
                  </button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {emailSending ? (
                <button className="btn-cancel-email" onClick={handleCancelEmail}>Cancelar envio</button>
              ) : !emailStatus?.finished_at ? (
                <button
                  className="detail-save-btn"
                  onClick={handleStartEmail}
                  disabled={!emailForm.asunto || !emailForm.cuerpo || !emailForm.gmail_user || !emailForm.gmail_pass}
                >
                  Iniciar envio
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'settings' && <AdminSettings />}

      {showWebPresentation && (
        <WebPresentationModal onClose={() => setShowWebPresentation(false)} />
      )}

      {showNewContact && (
        <div className="modal-overlay" onClick={() => setShowNewContact(false)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo contacto</h2>
              <button className="detail-close" onClick={() => setShowNewContact(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.5rem' }}>
              <label className="detail-field">
                <span>Nombre / Organismo *</span>
                <input type="text" value={newContactData.municipio} onChange={e => setNewContactData(d => ({ ...d, municipio: e.target.value }))} placeholder="Ej: Oficina de Turismo de Sevilla" />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label className="detail-field">
                  <span>Tipo</span>
                  <select value={newContactData.tipo} onChange={e => setNewContactData(d => ({ ...d, tipo: e.target.value }))}>
                    <option value="ayuntamiento">Ayuntamiento</option>
                    <option value="turismo">Oficina de turismo</option>
                    <option value="museo">Museo</option>
                    <option value="patronato">Patronato</option>
                    <option value="asociacion">Asociación</option>
                    <option value="otro">Otro</option>
                  </select>
                </label>
                <label className="detail-field">
                  <span>País</span>
                  <select value={newContactData.pais} onChange={e => setNewContactData(d => ({ ...d, pais: e.target.value }))}>
                    <option value="España">España</option>
                    <option value="Francia">Francia</option>
                    <option value="Italia">Italia</option>
                    <option value="Portugal">Portugal</option>
                  </select>
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label className="detail-field">
                  <span>Provincia</span>
                  <input type="text" value={newContactData.provincia} onChange={e => setNewContactData(d => ({ ...d, provincia: e.target.value }))} placeholder="Ej: Sevilla" />
                </label>
                <label className="detail-field">
                  <span>CCAA / Región</span>
                  <input type="text" value={newContactData.comunidad_autonoma} onChange={e => setNewContactData(d => ({ ...d, comunidad_autonoma: e.target.value }))} placeholder="Ej: Andalucia" />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label className="detail-field">
                  <span>Email general</span>
                  <input type="email" value={newContactData.email_general} onChange={e => setNewContactData(d => ({ ...d, email_general: e.target.value }))} placeholder="info@..." />
                </label>
                <label className="detail-field">
                  <span>Email patrimonio</span>
                  <input type="email" value={newContactData.email_patrimonio} onChange={e => setNewContactData(d => ({ ...d, email_patrimonio: e.target.value }))} placeholder="patrimonio@..." />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label className="detail-field">
                  <span>Persona de contacto</span>
                  <input type="text" value={newContactData.persona_contacto} onChange={e => setNewContactData(d => ({ ...d, persona_contacto: e.target.value }))} />
                </label>
                <label className="detail-field">
                  <span>Cargo</span>
                  <input type="text" value={newContactData.cargo} onChange={e => setNewContactData(d => ({ ...d, cargo: e.target.value }))} placeholder="Ej: Director/a" />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label className="detail-field">
                  <span>Teléfono</span>
                  <input type="text" value={newContactData.telefono} onChange={e => setNewContactData(d => ({ ...d, telefono: e.target.value }))} />
                </label>
                <label className="detail-field">
                  <span>Web</span>
                  <input type="url" value={newContactData.web} onChange={e => setNewContactData(d => ({ ...d, web: e.target.value }))} placeholder="https://..." />
                </label>
              </div>
              <label className="detail-field">
                <span>Fuente</span>
                <input type="text" value={newContactData.fuente} onChange={e => setNewContactData(d => ({ ...d, fuente: e.target.value }))} placeholder="Ej: web oficial, directorio, etc." />
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button className="btn-secondary" style={{ padding: '0.6rem 1.2rem', border: 'none', borderRadius: '8px', cursor: 'pointer', background: '#e2e8f0', color: '#475569' }} onClick={() => setShowNewContact(false)}>
                  Cancelar
                </button>
                <button className="detail-save-btn" onClick={handleCreateContact} disabled={newContactSaving || !newContactData.municipio.trim()}>
                  {newContactSaving ? 'Guardando...' : 'Crear contacto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
