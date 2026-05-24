import React from 'react';
import { useAuthStore } from '../../application/store/auth.store';
import { LoginPage } from '../pages/auth/LoginPage';
import { ReportIncidentPage } from '../pages/operator/ReportIncidentPage';
import { HistoryPage } from '../pages/operator/HistoryPage';
import { DashboardPage } from '../pages/supervisor/DashboardPage';
import { TechnicianPage } from '../pages/technician/TechnicianPage';

export function AppRouter() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Simple role-based routing based on stored user role
  switch (user?.role) {
    case 'OPERATOR':
      // Operators default to report incident page, we handle navigation via state in the page itself
      return <ReportIncidentPage />;
    case 'SUPERVISOR':
    case 'ADMIN':
      return <DashboardPage />;
    case 'TECHNICIAN':
      return <TechnicianPage />;
    default:
      return <LoginPage />;
  }
}