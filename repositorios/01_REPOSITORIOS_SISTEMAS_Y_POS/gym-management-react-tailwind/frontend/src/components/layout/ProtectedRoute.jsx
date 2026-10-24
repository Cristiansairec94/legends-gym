import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
