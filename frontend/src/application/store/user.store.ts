import { create } from 'zustand';

export interface Employee {
  id: string;
  fullName: string;
  email: string;
  role: 'OPERATOR' | 'SUPERVISOR' | 'TECHNICIAN';
  employeeCode: string;
  department?: string; // for operators
  shift?: string;       // for operators
  specialization?: string[]; // for technicians
  area?: string;        // for supervisors
  pin?: string;         // for operators (PIN code)
}

interface UserStoreState {
  employees: Employee[];
  addEmployee: (employee: Omit<Employee, 'id'>) => void;
  removeEmployee: (id: string) => void;
}

export const useUserStore = create<UserStoreState>((set) => ({
  employees: [
    {
      id: 'emp-1',
      fullName: 'Rina Susanti',
      email: 'rina@contohpabrik.com',
      role: 'SUPERVISOR',
      employeeCode: 'EMP-SUP-001',
      area: 'Zona Perakitan A'
    },
    {
      id: 'emp-2',
      fullName: 'Doni Hermawan',
      email: 'doni@contohpabrik.com',
      role: 'TECHNICIAN',
      employeeCode: 'EMP-TEC-001',
      specialization: ['Mechanical', 'Hydraulic']
    },
    {
      id: 'emp-3',
      fullName: 'Budi Setiawan',
      email: 'budi@contohpabrik.com',
      role: 'OPERATOR',
      employeeCode: 'EMP-OPR-001',
      department: 'Molding & Pressing',
      shift: 'Pagi (Shift A)',
      pin: '123456'
    },
    {
      id: 'emp-4',
      fullName: 'Doni Hartono',
      email: 'doni.h@contohpabrik.com',
      role: 'OPERATOR',
      employeeCode: 'EMP-OPR-002',
      department: 'Molding & Pressing',
      shift: 'Siang (Shift B)',
      pin: '111111'
    },
    {
      id: 'emp-5',
      fullName: 'Joko Susilo',
      email: 'joko@contohpabrik.com',
      role: 'OPERATOR',
      employeeCode: 'EMP-OPR-003',
      department: 'CNC Milling',
      shift: 'Malam (Shift C)',
      pin: '222222'
    }
  ],
  addEmployee: (empData) => set((state) => ({
    employees: [
      ...state.employees,
      {
        ...empData,
        id: 'emp-' + Math.random().toString(36).substring(2, 9)
      }
    ]
  })),
  removeEmployee: (id) => set((state) => ({
    employees: state.employees.filter(e => e.id !== id)
  }))
}));
