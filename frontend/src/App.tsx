import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import LiveViewPage from "./pages/LiveViewPage";
import SearchPage from "./pages/SearchPage";
import AlertsPage from "./pages/AlertsPage";
import EventDetailPage from "./pages/EventDetailPage";
import VehicleLogPage from "./pages/VehicleLogPage";
import ZonesCamerasPage from "./pages/ZonesCamerasPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import ANPRTestBench from "./pages/ANPRTestBench";
import { AuthProvider, useAuth } from "./context/AuthContext";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Login — standalone layout, no sidebar */}
        <Route path="/login" element={<LoginPage />} />

        {/* All app pages wrapped in AppShell */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/live" element={<LiveViewPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/vehicles" element={<VehicleLogPage />} />
          <Route path="/zones" element={<ZonesCamerasPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/modules/anpr" element={<ANPRTestBench />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
