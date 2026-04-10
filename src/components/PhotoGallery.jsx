import { useState } from 'react';
import './PhotoGallery.css';

export default function PhotoGallery({ photos = [], altBase = '' }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (photos.length === 0) return null;

  const current = photos[selectedIndex];

  const prev = () => setSelectedIndex(i => (i - 1 + photos.length) % photos.length);
  const next = () => setSelectedIndex(i => (i + 1) % photos.length);

  return (
    <div className="photo-gallery">
      <div className="photo-gallery-main">
        <img
          src={current.url}
          alt={current.titulo || `${altBase} - ${selectedIndex + 1}`}
          onClick={() => window.open(current.url, '_blank')}
          onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }}
        />
        {photos.length > 1 && (
          <>
            <button className="photo-gallery-prev" onClick={prev} aria-label="Anterior">&#8249;</button>
            <button className="photo-gallery-next" onClick={next} aria-label="Siguiente">&#8250;</button>
          </>
        )}
        <span className="photo-gallery-counter">{selectedIndex + 1} / {photos.length}</span>
      </div>
      {photos.length > 1 && (
        <div className="photo-gallery-thumbs">
          {photos.map((photo, i) => (
            <img
              key={photo.id || i}
              src={photo.url}
              alt={photo.titulo || `${altBase} ${i + 1}`}
              loading="lazy"
              className={i === selectedIndex ? 'active' : ''}
              onClick={() => setSelectedIndex(i)}
              onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }}
            />
          ))}
        </div>
      )}
      {current.autor && (
        <p className="photo-gallery-credit">
          {current.autor}{current.fuente && ` \u2014 ${current.fuente}`}
        </p>
      )}
    </div>
  );
}
