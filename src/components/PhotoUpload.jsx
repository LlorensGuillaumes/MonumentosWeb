import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { uploadMonumentoPhoto, getMonumentoPhotos, deleteMonumentoPhoto } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './PhotoUpload.css';

export default function PhotoUpload({ bienId, onPhotoAdded }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const loadPhotos = async () => {
    if (loaded) return;
    try {
      const data = await getMonumentoPhotos(bienId);
      setPhotos(data || []);
    } catch { /* ignore */ }
    setLoaded(true);
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      setError(t('photos.invalidType'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t('photos.tooLarge'));
      return;
    }

    setUploading(true);
    setError('');
    try {
      const photo = await uploadMonumentoPhoto(bienId, file, caption);
      setPhotos(prev => [photo, ...prev]);
      setCaption('');
      fileRef.current.value = '';
      setShowForm(false);
      if (onPhotoAdded) onPhotoAdded(photo);
    } catch (err) {
      setError(err.response?.data?.error || t('photos.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId) => {
    try {
      await deleteMonumentoPhoto(bienId, photoId);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch { /* ignore */ }
  };

  return (
    <div className="photo-upload" onMouseEnter={loadPhotos}>
      <div className="photo-upload-header">
        <h3>{t('photos.title')}</h3>
        {user && (
          <button className="btn btn-outline btn-sm" onClick={() => { setShowForm(!showForm); loadPhotos(); }}>
            {showForm ? t('photos.cancel') : t('photos.addPhoto')}
          </button>
        )}
      </div>

      {showForm && user && (
        <div className="photo-upload-form">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="photo-file-input"
          />
          <input
            type="text"
            placeholder={t('photos.captionPlaceholder')}
            value={caption}
            onChange={e => setCaption(e.target.value)}
            className="photo-caption-input"
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? t('photos.uploading') : t('photos.upload')}
          </button>
          {error && <p className="photo-error">{error}</p>}
        </div>
      )}

      {loaded && photos.length > 0 && (
        <div className="photo-gallery">
          {photos.map(p => (
            <div key={p.id} className="photo-item">
              <img src={p.url} alt={p.descripcion || ''} loading="lazy" />
              {p.descripcion && <span className="photo-caption">{p.descripcion}</span>}
              <span className="photo-author">{p.usuario_nombre || t('photos.anonymous')}</span>
              {user && (user.id === p.usuario_id || user.rol === 'admin') && (
                <button className="photo-delete" onClick={() => handleDelete(p.id)}>&times;</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
