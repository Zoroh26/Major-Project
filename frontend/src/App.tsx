import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import SecurityDashboard from "./pages/SecurityDashboard";
import Cameras from "./pages/Cameras";
import ZoneMapper from "./pages/ZoneMapper";
import PersonnelManager from "./pages/PersonnelManager";
import SecurityRegistration from "./pages/SecurityRegistration";
import MobileGuardView from "./pages/MobileGuardView";
import CameraStats from "./pages/CameraStats";
import AppLayout from "./components/AppLayout";
import { useAuthStore } from "./store/auth";

const App = () => {
  useEffect(() => {
    useAuthStore.getState().checkSession();
  }, []);

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const loading = useAuthStore((s) => s.loading);

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

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/signup" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Signup />} />

        {/* Protected routes — wrapped in AppLayout (sidebar + topbar) */}
        <Route element={isLoggedIn ? <AppLayout /> : <Navigate to="/login" replace />}>
          <Route path="/security" element={<SecurityDashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cameras" element={<Cameras />} />
          <Route path="/zones" element={<ZoneMapper />} />
          <Route path="/personnel" element={<PersonnelManager />} />
          <Route path="/personnel/new" element={<SecurityRegistration />} />
        </Route>

        {/* Dedicated Mobile Guard View (No sidebar) */}
        <Route path="/guard-view" element={isLoggedIn ? <MobileGuardView /> : <Navigate to="/login" replace />} />
        <Route path="/guard-view/camera/:cameraId" element={isLoggedIn ? <CameraStats /> : <Navigate to="/login" replace />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </Router>
  );
};

export default App;
