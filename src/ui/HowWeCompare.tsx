import { useState } from 'react';
import { useT } from '../i18n';
import { CompareIcon } from './icons';

const KEY = 'howWeCompareClosed';

function storedClosed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * The rules the whole comparison rests on, before any result. Open on a first visit; once someone
 * closes it, it stays closed on later visits, since returning users already know them.
 */
export function HowWeCompare() {
  const t = useT();
  const [open, setOpen] = useState(() => !storedClosed());
  return (
    <details
      className="more how-we-compare"
      open={open}
      onToggle={(e) => {
        const next = e.currentTarget.open;
        setOpen(next);
        try {
          localStorage.setItem(KEY, next ? '0' : '1');
        } catch {
          // Private modes can refuse storage; the box still opens and closes for this visit.
        }
      }}
    >
      <summary>
        <span className="summary-label"><CompareIcon size="1.1em" aria-hidden />{t.howWeCompare.title}</span>
        <span className="chevron" aria-hidden="true" />
      </summary>
      {t.howWeCompare.paragraphs.map((p) => <p key={p}>{p}</p>)}
    </details>
  );
}
