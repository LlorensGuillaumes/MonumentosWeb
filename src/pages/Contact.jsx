import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { sendContact } from '../services/api';
import './Contact.css';

export default function Contact() {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({ email: '', asunto: '', mensaje: '' });
  const [archivos, setArchivos] = useState([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleFiles = (e) => {
    const newFiles = Array.from(e.target.files);
    setArchivos(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setArchivos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    setSending(true);
    try {
      await sendContact({ ...form, archivos });
      setResult({ type: 'success', text: t('contact.success') });
      setForm({ email: '', asunto: '', mensaje: '' });
      setArchivos([]);
    } catch (err) {
      setResult({ type: 'error', text: err.response?.data?.error || t('contact.error') });
    } finally {
      setSending(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="contact-page">
      <h1>{t('contact.title')}</h1>
      <p className="contact-subtitle">{t('contact.subtitle')}</p>

      <form className="contact-form" onSubmit={handleSubmit}>
        <label className="contact-field">
          <span>{t('contact.email')}</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder={t('contact.emailPlaceholder')}
            required
          />
        </label>

        <label className="contact-field">
          <span>{t('contact.subject')}</span>
          <input
            type="text"
            name="asunto"
            value={form.asunto}
            onChange={handleChange}
            placeholder={t('contact.subjectPlaceholder')}
            required
          />
        </label>

        <label className="contact-field">
          <span>{t('contact.message')}</span>
          <textarea
            name="mensaje"
            value={form.mensaje}
            onChange={handleChange}
            placeholder={t('contact.messagePlaceholder')}
            rows={6}
            required
          />
        </label>

        <div className="contact-files-section">
          <span className="contact-files-label">{t('contact.attachments')}</span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFiles}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="contact-add-file"
            onClick={() => fileInputRef.current?.click()}
          >
            + {t('contact.addFile')}
          </button>

          {archivos.length > 0 && (
            <ul className="contact-file-list">
              {archivos.map((f, i) => (
                <li key={i}>
                  <span className="contact-file-name">{f.name}</span>
                  <span className="contact-file-size">{formatSize(f.size)}</span>
                  <button type="button" className="contact-file-remove" onClick={() => removeFile(i)}>
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {result && (
          <div className={`contact-result ${result.type}`}>
            {result.text}
          </div>
        )}

        <button type="submit" className="contact-submit" disabled={sending}>
          {sending ? t('contact.sending') : t('contact.send')}
        </button>
      </form>
    </div>
  );
}
