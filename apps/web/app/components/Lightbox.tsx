import { useCallback, useEffect, useRef } from 'react';
import type { Image } from '@hausanna/shared';
import { ChevronLeft, ChevronRight, CloseIcon } from './Icons';

/** Vollbild-Ansicht für Galerien: ←/→ blättern, Esc schließt, Fokus bleibt im Dialog. */
export function Lightbox({
  images,
  index,
  onChange,
  onClose,
}: {
  images: Image[];
  index: number;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const prev = useCallback(
    () => onChange((index - 1 + images.length) % images.length),
    [index, images.length, onChange],
  );
  const next = useCallback(
    () => onChange((index + 1) % images.length),
    [index, images.length, onChange],
  );

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Tab' && dialogRef.current) {
        const f = dialogRef.current.querySelectorAll<HTMLElement>('button');
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [onClose, prev, next]);

  const img = images[index];
  if (!img) return null;
  return (
    <div
      ref={dialogRef}
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Bild ${index + 1} von ${images.length}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <button
        ref={closeRef}
        type="button"
        className="lightbox__close"
        onClick={onClose}
        aria-label="Schließen"
      >
        <CloseIcon size={32} />
      </button>
      {images.length > 1 && (
        <button
          type="button"
          className="lightbox__nav lightbox__nav--prev"
          onClick={prev}
          aria-label="Vorheriges Bild"
        >
          <ChevronLeft size={44} />
        </button>
      )}
      <figure className="lightbox__figure">
        <img src={img.url} alt={img.alt} />
        <figcaption className="lightbox__counter">
          {index + 1} von {images.length}
        </figcaption>
      </figure>
      {images.length > 1 && (
        <button
          type="button"
          className="lightbox__nav lightbox__nav--next"
          onClick={next}
          aria-label="Nächstes Bild"
        >
          <ChevronRight size={44} />
        </button>
      )}
    </div>
  );
}
