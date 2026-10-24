import { useEffect, useRef } from 'react';

/** Einfacher Texteditor (fett, kursiv, Link, Liste, Zwischenüberschrift) ohne schwere Bibliothek. */
export function RichText({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (html: string) => void;
  hint?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastValue = useRef(value);

  useEffect(() => {
    // Nur von außen kommende Änderungen übernehmen (Cursor bleibt beim Tippen erhalten)
    if (ref.current && value !== lastValue.current) {
      ref.current.innerHTML = value;
      lastValue.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => {
    const html = ref.current?.innerHTML ?? '';
    lastValue.current = html;
    onChange(html);
  };

  const cmd = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const link = () => {
    const url = window.prompt('Link-Adresse (z. B. https://… oder /kontakt/):');
    if (url) cmd('createLink', url);
  };

  return (
    <div className="field">
      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{label}</span>
      <div className="rte">
        <div className="rte-toolbar" role="toolbar" aria-label={`${label} formatieren`}>
          <button
            type="button"
            title="Fett"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => cmd('bold')}
          >
            <b>F</b>
          </button>
          <button
            type="button"
            title="Kursiv"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => cmd('italic')}
          >
            <i>K</i>
          </button>
          <button
            type="button"
            title="Zwischenüberschrift"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => cmd('formatBlock', 'h3')}
          >
            H3
          </button>
          <button
            type="button"
            title="Absatz"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => cmd('formatBlock', 'p')}
          >
            ¶
          </button>
          <button
            type="button"
            title="Aufzählung"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => cmd('insertUnorderedList')}
          >
            • Liste
          </button>
          <button
            type="button"
            title="Link einfügen"
            onMouseDown={(e) => e.preventDefault()}
            onClick={link}
          >
            Link
          </button>
          <button
            type="button"
            title="Formatierung entfernen"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => cmd('removeFormat')}
          >
            ⌫ Format
          </button>
        </div>
        <div
          ref={ref}
          className="rte-area"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          onInput={emit}
          onBlur={emit}
        />
      </div>
      {hint ? <p className="field-msg">{hint}</p> : null}
    </div>
  );
}
