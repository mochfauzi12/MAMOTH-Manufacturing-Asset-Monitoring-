import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  toggleSidebar: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  toast: null,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  showToast: (message, type) => {
    set({ toast: { message, type } });
  },
  clearToast: () => set({ toast: null }),
}));