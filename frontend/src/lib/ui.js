// src/lib/ui.js
// Pub-sub singleton para toasts e confirm dialogs.
// Permite chamar toast()/confirmDialog() de qualquer lugar sem precisar de context.

const listeners = new Set();
let state = { toasts: [], confirm: null };

const emit = () => { for (const fn of listeners) fn(state); };

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getState() { return state; }

let nextId = 1;

export function toast(message, opts = {}) {
  const id = nextId++;
  const t = {
    id,
    message,
    type: opts.type || 'info',     // 'success' | 'error' | 'info' | 'warning'
    title: opts.title || null,
    duration: opts.duration ?? 3500
  };
  state = { ...state, toasts: [...state.toasts, t] };
  emit();
  if (t.duration > 0) setTimeout(() => dismissToast(id), t.duration);
  return id;
}

export function dismissToast(id) {
  state = { ...state, toasts: state.toasts.filter(t => t.id !== id) };
  emit();
}

export function confirmDialog({
  title = 'Confirmar ação',
  message = 'Tem certeza?',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  icon = null
} = {}) {
  return new Promise(resolve => {
    state = {
      ...state,
      confirm: { title, message, confirmLabel, cancelLabel, danger, icon, resolve }
    };
    emit();
  });
}

export function _resolveConfirm(value) {
  if (!state.confirm) return;
  const { resolve } = state.confirm;
  state = { ...state, confirm: null };
  emit();
  resolve(value);
}

// Atalhos
export const toastSuccess = (m, opts) => toast(m, { ...opts, type: 'success' });
export const toastError   = (m, opts) => toast(m, { ...opts, type: 'error' });
export const toastInfo    = (m, opts) => toast(m, { ...opts, type: 'info' });
export const toastWarn    = (m, opts) => toast(m, { ...opts, type: 'warning' });