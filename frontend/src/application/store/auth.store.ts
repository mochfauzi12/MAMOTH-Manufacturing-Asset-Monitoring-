import { create } from 'zustand';

export type UserRole = 'OPERATOR' | 'SUPERVISOR' | 'TECHNICIAN' | 'ADMIN';

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  employeeCode: string;
  department?: string;
  area?: string;
}

interface AuthState {
  user: UserSession | null;
  isAuthenticated: boolean;
  login: (email: string, role: UserRole) => void;
  loginWithPin: (pin: string, name: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (email, role) => {
    const mockUser: UserSession = {
      id: 'usr-' + Math.random().toString(36).substr(2, 9),
      email: email,
      fullName: role === 'SUPERVISOR' ? 'Rina Susanti' : 'Agus Kurniawan',
      role: role,
      employeeCode: role === 'SUPERVISOR' ? 'EMP-SV-001' : 'EMP-TK-002',
      area: role === 'SUPERVISOR' ? 'Zona Perakitan A' : undefined,
    };
    set({ user: mockUser, isAuthenticated: true });
  },
  loginWithPin: (pin, name) => {
    const mockUser: UserSession = {
      id: 'usr-op-' + Math.random().toString(36).substr(2, 9),
      email: name.toLowerCase().replace(/ /g, '') + '@pabrik.com',
      fullName: name,
      role: 'OPERATOR',
      employeeCode: 'EMP-OP-' + pin,
      department: 'Produksi / Extruder A',
    };
    set({ user: mockUser, isAuthenticated: true });
  },
  logout: () => set({ user: null, isAuthenticated: false }),
}));