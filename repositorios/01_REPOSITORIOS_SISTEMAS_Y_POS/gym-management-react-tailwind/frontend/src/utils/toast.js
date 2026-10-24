// Tiny pub/sub toast — no extra provider nesting needed.
const listeners = new Set();
let id = 0;

export const toast = {
  show: (message, type = 'success') => {
    const item = { id: ++id, message, type };
    listeners.forEach((l) => l(item));
  },
  success: (m) => toast.show(m, 'success'),
  error: (m) => toast.show(m, 'error'),
  info: (m) => toast.show(m, 'info'),
  subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
};
