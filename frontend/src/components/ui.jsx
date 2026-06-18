import { useEffect, useState } from 'react';
import { subscribe, getState, dismissToast, _resolveConfirm } from '../lib/ui.js';

export default function UiHost() {
  const [s, setS] = useState(getState());
  useEffect(() => subscribe(setS), []);

  return (
    <>
      <div className="wc-toast-stack" aria-live="polite">
        {s.toasts.map(t => <Toast key={t.id} t={t} />)}
      </div>
      {s.confirm && <ConfirmDialog c={s.confirm} />}
    </>
  );
}

const ICONS = {
  success: 'fa-circle-check',
  error: 'fa-circle-xmark',
  warning: 'fa-triangle-exclamation',
  info: 'fa-circle-info'
};

function Toast({ t }) {
  return (
    <div className={`wc-toast wc-toast-${t.type}`} role="status">
      <i className={`fas ${ICONS[t.type] || ICONS.info} wc-toast-icon`}></i>
      <div className="wc-toast-body">
        {t.title && <strong>{t.title}</strong>}
        <span>{t.message}</span>
      </div>
      <button className="wc-toast-close" onClick={() => dismissToast(t.id)} aria-label="Fechar">
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
}

function ConfirmDialog({ c }) {
  const onCancel = () => _resolveConfirm(false);
  const onOk = () => _resolveConfirm(true);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onOk();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="wc-confirm-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="wc-confirm-card" role="dialog" aria-modal="true">
        <div className={`wc-confirm-icon ${c.danger ? 'danger' : ''}`}>
          <i className={`fas ${c.icon || (c.danger ? 'fa-triangle-exclamation' : 'fa-circle-question')}`}></i>
        </div>
        <h3 className="wc-confirm-title">{c.title}</h3>
        <p className="wc-confirm-message">{c.message}</p>
        <div className="wc-confirm-actions">
          <button className="wc-btn wc-btn-ghost" onClick={onCancel}>{c.cancelLabel}</button>
          <button
            className={`wc-btn ${c.danger ? 'wc-btn-danger' : 'wc-btn-primary'}`}
            onClick={onOk}
            autoFocus
          >
            {c.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}