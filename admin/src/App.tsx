import { CircularProgress, CssBaseline, Stack, ThemeProvider } from '@mui/material';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { lazy } from 'react';
import type { ReactNode } from 'react';
import { ToastProvider } from './components/ui';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth, useCan } from './lib/auth';
import { theme } from './theme';
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const MembersPage = lazy(() => import('./pages/MembersPage').then((m) => ({ default: m.MembersPage })));
const MemberDetailPage = lazy(() => import('./pages/MemberDetailPage').then((m) => ({ default: m.MemberDetailPage })));
const DonorsPage = lazy(() => import('./pages/DonorsPage').then((m) => ({ default: m.DonorsPage })));
const CommitteePage = lazy(() => import('./pages/CommitteePage').then((m) => ({ default: m.CommitteePage })));
const PatientsPage = lazy(() => import('./pages/PatientsPage').then((m) => ({ default: m.PatientsPage })));
const PatientDetailPage = lazy(() => import('./pages/PatientDetailPage').then((m) => ({ default: m.PatientDetailPage })));
const DonationsPage = lazy(() => import('./pages/DonationsPage').then((m) => ({ default: m.DonationsPage })));
const EquipmentPage = lazy(() => import('./pages/EquipmentPage').then((m) => ({ default: m.EquipmentPage })));
const NewsPage = lazy(() => import('./pages/NewsPage').then((m) => ({ default: m.NewsPage })));
const RequestsPage = lazy(() => import('./pages/RequestsPage').then((m) => ({ default: m.RequestsPage })));
const AuditPage = lazy(() => import('./pages/AuditPage').then((m) => ({ default: m.AuditPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
import { LoginPage } from './pages/LoginPage';

function Protected({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { loading, user } = useAuth();
  const { isAdmin } = useCan();
  if (loading) {
    return (
      <Stack sx={{ height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (admin && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={
                  <Protected>
                    <Layout />
                  </Protected>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="members" element={<MembersPage />} />
                <Route path="members/:id" element={<MemberDetailPage />} />
                <Route path="donors" element={<DonorsPage />} />
                <Route path="committee" element={<CommitteePage />} />
                <Route path="patients" element={<PatientsPage />} />
                <Route path="patients/:id" element={<PatientDetailPage />} />
                <Route path="donations" element={<DonationsPage />} />
                <Route path="equipment" element={<EquipmentPage />} />
                <Route path="requests" element={<RequestsPage />} />
                <Route path="news" element={<Protected admin><NewsPage /></Protected>} />
                <Route path="audit" element={<Protected admin><AuditPage /></Protected>} />
                <Route path="settings" element={<Protected admin><SettingsPage /></Protected>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
