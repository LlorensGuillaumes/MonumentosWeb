import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { submitPropuesta, getFiltros } from '../services/api';
import MapPicker from '../components/MapPicker';
import './ProposalForm.css';

const PAISES = ['España', 'Francia', 'Portugal', 'Italia'];

export default function ProposalForm() {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    denominacion: '',
    pais: '',
    comunidad_autonoma: '',
    provincia: '',
    municipio: '',
    localidad: '',
    categoria: '',
    tipo: '',
    descripcion: '',
    estilo: '',
    material: '',
    inception: '',
    arquitecto: '',
    wikipedia_url: '',
  });
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [files, setFiles] = useState([]);
  const [imageUrls, setImageUrls] = useState(['']);
  const [filtros, setFiltros] = useState(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  // Load filter options when country/region changes
  useEffect(() => {
    if (!form.pais) return;
    const params = { pais: form.pais };
    if (form.comunidad_autonoma) params.region = form.comunidad_autonoma;
    getFiltros(params).then(setFiltros).catch(() => {});
  }, [form.pais, form.comunidad_autonoma]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => {
      const next = { ...f, [name]: value };
      // Reset cascading fields
      if (name === 'pais') {
        next.comunidad_autonoma = '';
        next.provincia = '';
      }
      if (name === 'comunidad_autonoma') {
        next.provincia = '';
      }
      return next;
    });
  };

  const handleFiles = (e) => {
    const newFiles = Array.from(e.target.files);
    const total = files.length + newFiles.length;
    if (total > 5) {
      alert(t('proposal.uploadHint'));
      return;
    }
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);

    if (!form.denominacion.trim() || !form.pais) return;

    setSending(true);
    try {
      const formData = new FormData();
      // Append text fields
      Object.entries(form).forEach(([key, val]) => {
        if (val) formData.append(key, val);
      });
      if (coords.lat != null) formData.append('latitud', coords.lat);
      if (coords.lng != null) formData.append('longitud', coords.lng);

      // Append files
      files.forEach(f => formData.append('imagenes', f));

      // Append image URLs
      const urls = imageUrls.filter(u => u.trim());
      if (urls.length > 0) formData.append('image_urls', JSON.stringify(urls));

      await submitPropuesta(formData);
      setResult({ type: 'success', text: t('proposal.success') });
      // Reset form
      setForm({
        denominacion: '', pais: '', comunidad_autonoma: '', provincia: '',
        municipio: '', localidad: '', categoria: '', tipo: '',
        descripcion: '', estilo: '', material: '', inception: '',
        arquitecto: '', wikipedia_url: '',
      });
      setCoords({ lat: null, lng: null });
      setFiles([]);
      setImageUrls(['']);
    } catch (err) {
      setResult({ type: 'error', text: err.response?.data?.error || t('proposal.error') });
    } finally {
      setSending(false);
    }
  };

  const regiones = filtros?.regiones || [];
  const provincias = filtros?.provincias || [];
  const categorias = filtros?.categorias || [];

  return (
    <div className="proposal-page">
      <h1>{t('proposal.title')}</h1>
      <p className="proposal-subtitle">{t('proposal.subtitle')}</p>

      <form className="proposal-form" onSubmit={handleSubmit}>
        {/* A. Basic info */}
        <section className="proposal-section">
          <h2>{t('proposal.name')}</h2>
          <label className="proposal-field">
            <span>{t('proposal.name')} *</span>
            <input
              type="text"
              name="denominacion"
              value={form.denominacion}
              onChange={handleChange}
              placeholder={t('proposal.namePlaceholder')}
              required
            />
          </label>

          <div className="proposal-row">
            <label className="proposal-field">
              <span>{t('filters.country')} *</span>
              <select name="pais" value={form.pais} onChange={handleChange} required>
                <option value="">{t('filters.allCountries')}</option>
                {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="proposal-field">
              <span>{t('filters.category')}</span>
              <select name="categoria" value={form.categoria} onChange={handleChange}>
                <option value="">{t('filters.allCategories')}</option>
                {categorias.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
              </select>
            </label>
          </div>

          <div className="proposal-row">
            <label className="proposal-field">
              <span>{t('filters.region')}</span>
              <select name="comunidad_autonoma" value={form.comunidad_autonoma} onChange={handleChange}>
                <option value="">{t('filters.allRegions')}</option>
                {regiones.map(r => <option key={r.value} value={r.value}>{r.value}</option>)}
              </select>
            </label>
            <label className="proposal-field">
              <span>{t('filters.province')}</span>
              <select name="provincia" value={form.provincia} onChange={handleChange}>
                <option value="">{t('filters.allProvinces')}</option>
                {provincias.map(p => <option key={p.value} value={p.value}>{p.value}</option>)}
              </select>
            </label>
          </div>

          <div className="proposal-row">
            <label className="proposal-field">
              <span>{t('filters.municipality')}</span>
              <input type="text" name="municipio" value={form.municipio} onChange={handleChange} />
            </label>
            <label className="proposal-field">
              <span>{t('detail.locality')}</span>
              <input type="text" name="localidad" value={form.localidad} onChange={handleChange} />
            </label>
          </div>

          <label className="proposal-field">
            <span>{t('filters.type')}</span>
            <input type="text" name="tipo" value={form.tipo} onChange={handleChange} />
          </label>
        </section>

        {/* B. Description and data */}
        <section className="proposal-section">
          <h2>{t('proposal.description')}</h2>
          <label className="proposal-field">
            <span>{t('proposal.description')}</span>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              placeholder={t('proposal.descriptionPlaceholder')}
              rows={4}
            />
          </label>

          <div className="proposal-row">
            <label className="proposal-field">
              <span>{t('proposal.style')}</span>
              <input type="text" name="estilo" value={form.estilo} onChange={handleChange} />
            </label>
            <label className="proposal-field">
              <span>{t('proposal.material')}</span>
              <input type="text" name="material" value={form.material} onChange={handleChange} />
            </label>
          </div>

          <div className="proposal-row">
            <label className="proposal-field">
              <span>{t('proposal.epoch')}</span>
              <input type="text" name="inception" value={form.inception} onChange={handleChange} />
            </label>
            <label className="proposal-field">
              <span>{t('proposal.architect')}</span>
              <input type="text" name="arquitecto" value={form.arquitecto} onChange={handleChange} />
            </label>
          </div>

          <label className="proposal-field">
            <span>{t('proposal.wikiUrl')}</span>
            <input type="url" name="wikipedia_url" value={form.wikipedia_url} onChange={handleChange} placeholder="https://es.wikipedia.org/wiki/..." />
          </label>
        </section>

        {/* C. Location */}
        <section className="proposal-section">
          <h2>{t('proposal.locationSection')}</h2>
          <MapPicker
            value={coords}
            onChange={setCoords}
            pais={form.pais}
          />
        </section>

        {/* D. Images */}
        <section className="proposal-section">
          <h2>{t('proposal.images')}</h2>

          <div className="proposal-images-upload">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="proposal-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={files.length >= 5}
            >
              + {t('proposal.uploadImages')}
            </button>
            <span className="proposal-upload-hint">{t('proposal.uploadHint')}</span>
          </div>

          {files.length > 0 && (
            <div className="proposal-file-list">
              {files.map((f, i) => (
                <div key={i} className="proposal-file-item">
                  <img src={URL.createObjectURL(f)} alt="" className="proposal-file-preview" />
                  <span className="proposal-file-name">{f.name}</span>
                  <span className="proposal-file-size">{(f.size / 1024).toFixed(0)} KB</span>
                  <button type="button" className="proposal-file-remove" onClick={() => removeFile(i)}>&times;</button>
                </div>
              ))}
            </div>
          )}

          <div className="proposal-image-urls">
            <span className="proposal-field-label">{t('proposal.or')} {t('proposal.imageUrl')}</span>
            {imageUrls.map((url, i) => (
              <div key={i} className="proposal-url-row">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    const next = [...imageUrls];
                    next[i] = e.target.value;
                    setImageUrls(next);
                  }}
                  placeholder="https://..."
                />
                {imageUrls.length > 1 && (
                  <button type="button" className="proposal-file-remove" onClick={() => setImageUrls(prev => prev.filter((_, j) => j !== i))}>&times;</button>
                )}
              </div>
            ))}
            {imageUrls.length < 5 && (
              <button type="button" className="proposal-add-url" onClick={() => setImageUrls(prev => [...prev, ''])}>
                + {t('proposal.addImageUrl')}
              </button>
            )}
          </div>
        </section>

        {/* E. Submit */}
        {result && (
          <div className={`proposal-result ${result.type}`}>
            {result.text}
            {result.type === 'success' && (
              <Link to="/mis-propuestas" className="proposal-result-link">{t('proposal.myProposals')}</Link>
            )}
          </div>
        )}

        <button type="submit" className="proposal-submit" disabled={sending || !form.denominacion || !form.pais}>
          {sending ? t('proposal.submitting') : t('proposal.submit')}
        </button>
      </form>
    </div>
  );
}
