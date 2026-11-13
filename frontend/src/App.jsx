import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import EmergencyMap from "./pages/EmergencyMap";
import EmergencyHistory from "./pages/EmergencyHistory";
import Profile from "./pages/Profile";
import ReportEmergency from "./pages/ReportEmergency";

import "./App.css";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner"></div>
        <p>Connecting to NECN Emergency Network...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/* Root redirection */}
      <Route
        path="/"
        element={
          <Navigate
            to={user?.emailVerified ? "/dashboard" : "/login"}
            replace
          />
        }
      />

      {/* Auth Public Routes */}
      <Route
        path="/login"
        element={
          user?.emailVerified ? <Navigate to="/dashboard" replace /> : <Login />
        }
      />

      <Route
        path="/register"
        element={
          user?.emailVerified ? <Navigate to="/dashboard" replace /> : <Register />
        }
      />

      {/* Protected Authenticated Routes with Unified Layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/emergency-map" element={<EmergencyMap />} />
        <Route path="/report-emergency" element={<ReportEmergency />} />
        <Route path="/emergency-history" element={<EmergencyHistory />} />
        <Route path="/profile" element={<Profile />} />

        {/* Shorthand aliases */}
        <Route path="/map" element={<Navigate to="/emergency-map" replace />} />
        <Route path="/history" element={<Navigate to="/emergency-history" replace />} />
      </Route>

      {/* Fallback unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
