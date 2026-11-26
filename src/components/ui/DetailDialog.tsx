'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Eyebrow } from './Eyebrow';
import styles from './DetailDialog.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  /** Short lead line under the title. */
  summary?: string;
  /** Decorative image shown beside the content (stacked on top on small screens). */
  media?: { src: string; width: number; height: number };
  /** Primary/secondary actions, rendered as a button row. */
  actions?: ReactNode;
  footnote?: ReactNode;
  children?: ReactNode;
}

/**
 * Modal detail panel used instead of in-place expansion, so card grids keep a fixed layout.
 * Native <dialog>: focus is contained while open, Esc and backdrop clicks close it, and focus
 * returns to the element that opened it.
 */
export function DetailDialog({ open, onClose, eyebrow, title, summary, media, actions, footnote, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  const requestClose = () => {
    const dialog = dialogRef.current;
    if (dialog && typeof dialog.close === 'function') dialog.close(); // fires onClose below
    else handleClosed();
  };

  const handleClosed = () => {
    dialogRef.current?.removeAttribute('open');
    onClose();
    const target = returnFocusRef.current;
    // Do not pull focus back if the visitor navigated somewhere else from inside the dialog.
    if (target && target !== document.body && target.isConnected) target.focus();
  };

  return (
    <dialog
      ref={dialogRef}
      className={[styles.dialog, media ? styles.withMedia : ''].join(' ')}
      aria-labelledby={titleId}
      onClose={handleClosed}
      onClick={(event) => {
        if (event.target === dialogRef.current) requestClose();
      }}
    >
      {open && (
        <div className={styles.layout}>
          {media && (
            <div className={styles.media}>
              <img src={media.src} alt="" width={media.width} height={media.height} />
            </div>
          )}
          <div className={styles.body}>
            <button type="button" className={styles.close} onClick={requestClose} aria-label="Close">
              <X size={22} aria-hidden="true" />
            </button>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {summary && <p className={styles.summary}>{summary}</p>}
            {children && <div className={styles.content}>{children}</div>}
            {actions && <div className={styles.actions}>{actions}</div>}
            {footnote && <p className={styles.footnote}>{footnote}</p>}
          </div>
        </div>
      )}
    </dialog>
  );
}
