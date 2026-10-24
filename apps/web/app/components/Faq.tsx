import { useId, useState } from 'react';
import { CircleMinus, CirclePlus } from './Icons';

interface FaqItem {
  question: string;
  html: string;
  open: boolean;
}

/** Akkordeon: immer nur ein Eintrag offen (wie bisher). */
export function Faq({ items }: { items: FaqItem[] }) {
  const initial = items.findIndex((i) => i.open);
  const [openIndex, setOpenIndex] = useState<number>(initial);
  const baseId = useId();
  return (
    <div className="faq">
      {items.map((item, i) => {
        const open = i === openIndex;
        const panelId = `${baseId}-panel-${i}`;
        const btnId = `${baseId}-btn-${i}`;
        return (
          <div key={i} className={`faq__item${open ? ' is-open' : ''}`}>
            <h4 className="faq__heading">
              <button
                id={btnId}
                type="button"
                className="faq__title"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? -1 : i)}
              >
                {item.question}
                <span className="faq__icon">{open ? <CircleMinus /> : <CirclePlus />}</span>
              </button>
            </h4>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              className="faq__content content"
              hidden={!open}
              dangerouslySetInnerHTML={{ __html: item.html }}
            />
          </div>
        );
      })}
    </div>
  );
}
