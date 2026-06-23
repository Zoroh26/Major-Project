import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import SecurityDashboard from "./pages/SecurityDashboard";
import ZoneMapper from "./pages/ZoneMapper";
import PersonnelManager from "./pages/PersonnelManager";
import SecurityRegistration from "./pages/SecurityRegistration";
import MobileGuardView from "./pages/MobileGuardView";
import CameraStats from "./pages/CameraStats";
import EscalationsPage from "./pages/Escalations";
import ZoneCameraMonitor from "./pages/ZoneCameraMonitor";
import AppLayout from "./components/AppLayout";
import { useAuthStore } from "./store/auth";

const App = () => {
  useEffect(() => {
    void useAuthStore.getState().checkSession();
  }, []);

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const loading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-primary text-3xl mb-2">⏳</div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const defaultRedirect = user?.role === "security" ? "/guard-view" : "/dashboard";

  // Role-based protection wrappers
  const AdminProtectedRoute = () => {
    if (!isLoggedIn) return <Navigate to="/login" replace />;
    if (user?.role === "security") return <Navigate to="/guard-view" replace />;
    return <AppLayout />;
  };

  const SecurityProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isLoggedIn) return <Navigate to="/login" replace />;
    if (user?.role !== "security") return <Navigate to="/dashboard" replace />;
    return <>{children}</>;
  };

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={isLoggedIn ? <Navigate to={defaultRedirect} replace /> : <Login />} />
        <Route path="/signup" element={isLoggedIn ? <Navigate to={defaultRedirect} replace /> : <Signup />} />

        {/* Protected routes — wrapped in AppLayout (sidebar + topbar) (Admins only) */}
        <Route element={<AdminProtectedRoute />}>
          <Route path="/security" element={<SecurityDashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/escalations" element={<EscalationsPage />} />
          <Route path="/zones" element={<ZoneMapper />} />
          <Route path="/zones/camera/:cameraId" element={<ZoneCameraMonitor />} />
          <Route path="/personnel" element={<PersonnelManager />} />
          <Route path="/personnel/new" element={<SecurityRegistration />} />
        </Route>

        {/* Dedicated Mobile Guard View (No sidebar) (Security only) */}
        <Route path="/guard-view" element={<SecurityProtectedRoute><MobileGuardView /></SecurityProtectedRoute>} />
        <Route path="/guard-view/camera/:cameraId" element={<SecurityProtectedRoute><CameraStats /></SecurityProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={isLoggedIn ? defaultRedirect : "/login"} replace />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </Router>
  );
};

export default App;
