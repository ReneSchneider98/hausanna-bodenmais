import { useState } from 'react';
import type { Image } from '@hausanna/shared';
import { Lightbox } from './Lightbox';

/** Lupe für das Hover-Overlay */
function Zoom() {
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5M11 8v6M8 11h6" />
    </svg>
  );
}

/** Bildergalerie mit Lightbox. variant "portrait" (Unterkunft, 3:4) oder "landscape" (4 Spalten, 400:284). */
export function Gallery({
  images,
  variant = 'portrait',
}: {
  images: Image[];
  variant?: 'portrait' | 'landscape';
}) {
  const [open, setOpen] = useState<number | null>(null);
  if (!images.length) return null;
  return (
    <>
      <ul className={`gallery gallery--${variant}`}>
        {images.map((img, i) => (
          <li key={`${img.url}-${i}`} className="gallery__item">
            <button
              type="button"
              className="gallery__button"
              onClick={() => setOpen(i)}
              aria-label={`Bild vergrößern: ${img.alt || `Bild ${i + 1}`}`}
            >
              <img
                src={img.url}
                alt={img.alt}
                loading="lazy"
                decoding="async"
                width={400}
                height={variant === 'portrait' ? 533 : 284}
              />
              <span className="gallery__overlay" aria-hidden="true">
                <Zoom />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open !== null && (
        <Lightbox images={images} index={open} onChange={setOpen} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
