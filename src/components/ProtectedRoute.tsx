import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

export default function ProtectedRoute() {
  const { isAuthed, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="p-6">Загрузка…</div>;
  if (!isAuthed) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname+loc.search)}`} replace />;
  return <Outlet />;
}
