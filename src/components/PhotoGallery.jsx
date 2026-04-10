import { useState, useEffect, useCallback } from 'react';
import './PhotoGallery.css';

export default function PhotoGallery({ photos = [], altBase = '' }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const isOpen = lightboxIndex !== null;

  const close = useCallback(() => setLightboxIndex(null), []);
  const prev = useCallback(
    (e) => {
      if (e) e.stopPropagation();
      setLightboxIndex(i => (i - 1 + photos.length) % photos.length);
    },
    [photos.length]
  );
  const next = useCallback(
    (e) => {
      if (e) e.stopPropagation();
      setLightboxIndex(i => (i + 1) % photos.length);
    },
    [photos.length]
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, close, prev, next]);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="photo-gallery-thumbs-only">
        {photos.map((photo, i) => (
          <button
            key={photo.id || i}
            type="button"
            className="photo-gallery-thumb"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
            aria-label={`Ver foto ${i + 1} de ${photos.length}`}
          >
            <img
              src={photo.url}
              alt={photo.titulo || `${altBase} ${i + 1}`}
              loading="lazy"
              onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }}
            />
          </button>
        ))}
      </div>

      {isOpen && (
        <div className="photo-lightbox" onClick={close} role="dialog" aria-modal="true">
          <button
            className="photo-lightbox-close"
            onClick={(e) => { e.stopPropagation(); close(); }}
            aria-label="Cerrar"
          >
            &times;
          </button>

          {photos.length > 1 && (
            <button
              className="photo-lightbox-prev"
              onClick={prev}
              aria-label="Anterior"
            >
              &#8249;
            </button>
          )}

          <figure className="photo-lightbox-figure" onClick={(e) => e.stopPropagation()}>
            <img
              src={photos[lightboxIndex].url}
              alt={photos[lightboxIndex].titulo || `${altBase} - ${lightboxIndex + 1}`}
              onError={e => { e.target.onerror = null; e.target.src = '/no-image.svg'; }}
            />
            {(photos[lightboxIndex].titulo || photos[lightboxIndex].autor) && (
              <figcaption className="photo-lightbox-caption">
                {photos[lightboxIndex].titulo}
                {photos[lightboxIndex].autor && (
                  <span className="photo-lightbox-author">
                    {' \u2014 '}{photos[lightboxIndex].autor}
                  </span>
                )}
              </figcaption>
            )}
          </figure>

          {photos.length > 1 && (
            <button
              className="photo-lightbox-next"
              onClick={next}
              aria-label="Siguiente"
            >
              &#8250;
            </button>
          )}

          {photos.length > 1 && (
            <span className="photo-lightbox-counter">
              {lightboxIndex + 1} / {photos.length}
            </span>
          )}
        </div>
      )}
    </>
  );
}
