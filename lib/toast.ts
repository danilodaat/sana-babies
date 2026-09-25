/** Avisos cortos globales (zona nueva, compra, zona cerrada...). Los muestra <Toaster />. */

export interface Toast {
  id: number;
  icon: string;
  text: string;
  big?: boolean;
}

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();
let nextId = 1;
const lastByText = new Map<string, number>();

export function toast(text: string, icon = '💬', opts: { big?: boolean; ms?: number } = {}) {
  // Evita repetir el mismo aviso en ráfaga (p. ej. chocar contra una zona cerrada)
  const now = Date.now();
  if (now - (lastByText.get(text) ?? 0) < 2500) return;
  lastByText.set(text, now);
  const t: Toast = { id: nextId++, icon, text, big: opts.big };
  toasts = [...toasts, t].slice(-3);
  listeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    listeners.forEach((l) => l(toasts));
  }, opts.ms ?? 2600);
}

export function subscribeToasts(l: Listener) {
  listeners.add(l);
  l(toasts);
  return () => {
    listeners.delete(l);
  };
}
