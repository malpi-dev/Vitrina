import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

interface ToastState {
  id: number;
  message: string | null;
  tone: ToastTone;
  show: (message: string, tone?: ToastTone) => void;
  hide: () => void;
}

export const TOAST_DURATION_MS = 2500;

let timer: ReturnType<typeof setTimeout> | undefined;

export const useToastStore = create<ToastState>((set) => ({
  id: 0,
  message: null,
  tone: 'info',
  show: (message, tone = 'info') => {
    clearTimeout(timer);
    set((s) => ({ id: s.id + 1, message, tone }));
    timer = setTimeout(() => set({ message: null }), TOAST_DURATION_MS);
  },
  hide: () => {
    clearTimeout(timer);
    set({ message: null });
  },
}));

export const showToast = (message: string, tone: ToastTone = 'info') =>
  useToastStore.getState().show(message, tone);
