import { Routes, Route, Navigate } from 'react-router-dom';
import { OpsAuthProvider, useOpsAuth } from './contexts/OpsAuthContext';
import { OpsLanguageProvider } from './contexts/OpsLanguageContext';
import { OpsOfflineProvider } from './contexts/OpsOfflineContext';
import OpsLogin from './components/OpsLogin';
import OpsLayout from './components/OpsLayout';
import OpsHome from './pages/OpsHome';
import OpsPlaceholder from './pages/OpsPlaceholder';

function OpsLoginGuard() {
  const { session, profile, loading } = useOpsAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (session && profile) {
    return <Navigate to="/ops/home" replace />;
  }
  return <OpsLogin />;
}

export default function OpsApp() {
  return (
    <OpsAuthProvider>
      <OpsLanguageProvider>
        <OpsOfflineProvider>
          <Routes>
            <Route index element={<OpsLoginGuard />} />
            <Route element={<OpsLayout />}>
              <Route path="home" element={<OpsHome />} />
              <Route path="tasks" element={<OpsPlaceholder titleKey="nav.tasks" />} />
              <Route path="inventory" element={<OpsPlaceholder titleKey="nav.inventory" />} />
              <Route path="purchase" element={<OpsPlaceholder titleKey="nav.purchase" />} />
              <Route path="guest-log" element={<OpsPlaceholder titleKey="nav.guestLog" />} />
              <Route path="shift-punch" element={<OpsPlaceholder titleKey="nav.shiftPunch" />} />
              <Route path="daily-report" element={<OpsPlaceholder titleKey="nav.dailyReport" />} />
              <Route path="admin" element={<OpsPlaceholder titleKey="nav.adminConsole" />} />
            </Route>
          </Routes>
        </OpsOfflineProvider>
      </OpsLanguageProvider>
    </OpsAuthProvider>
  );
}
