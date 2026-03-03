import { Routes, Route, Navigate } from 'react-router-dom';
import { OpsAuthProvider, useOpsAuth } from './contexts/OpsAuthContext';
import { OpsLanguageProvider } from './contexts/OpsLanguageContext';
import { OpsOfflineProvider } from './contexts/OpsOfflineContext';
import OpsLogin from './components/OpsLogin';
import OpsLayout from './components/OpsLayout';
import OpsHome from './pages/OpsHome';
import TasksPage from './pages/TasksPage';
import OpsPlaceholder from './pages/OpsPlaceholder';
import InventoryPage from './pages/InventoryPage';
import PurchasePage from './pages/PurchasePage';
import GuestLogPage from './pages/GuestLogPage';
import GuestSelfCheckIn from './pages/GuestSelfCheckIn';
import ShiftPunchPage from './pages/ShiftPunchPage';

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
            <Route path="guest-form" element={<GuestSelfCheckIn />} />
            <Route element={<OpsLayout />}>
              <Route path="home" element={<OpsHome />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="purchase" element={<PurchasePage />} />
              <Route path="guest-log" element={<GuestLogPage />} />
              <Route path="shift-punch" element={<ShiftPunchPage />} />
              <Route path="daily-report" element={<OpsPlaceholder titleKey="nav.dailyReport" />} />
              <Route path="admin" element={<OpsPlaceholder titleKey="nav.adminConsole" />} />
            </Route>
          </Routes>
        </OpsOfflineProvider>
      </OpsLanguageProvider>
    </OpsAuthProvider>
  );
}
