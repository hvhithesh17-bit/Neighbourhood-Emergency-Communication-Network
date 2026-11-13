
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        Checking your account...
      </div>
    );
  }

  if (!user || !user.emailVerified) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
