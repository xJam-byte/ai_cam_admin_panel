// src/App.tsx
import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Outlet,
  useNavigate,
  useParams,
} from "react-router-dom";
import { Home, AlertTriangle, Camera, Menu, LogOut } from "lucide-react";
import * as api from "./lib/api";
import { Button } from "./components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./components/ui/sheet";

import Dashboard from "./components/pages/Dashboard";
import IncidentsPage from "./components/pages/IncidentsPage";
import IncidentDetails from "./components/pages/IncidentDetails";
// страница логина (из предыдущего ответа)
import ProtectedRoute from "./components/ProtectedRoute"; // защищает приватные роуты
import { AuthProvider, useAuth } from "./providers/AuthProvider"; // провайдер авторизации
import LoginPage from "./components/pages/Login";
function NavigationMenu({ onNavigate }: { onNavigate?: () => void }) {
  const linkBase =
    "justify-start w-full text-left [&.active]:bg-slate-900 [&.active]:text-white";
  return (
    <nav className="flex flex-col gap-2">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `btn ${linkBase} ${isActive ? "active" : ""}`
        }
        onClick={onNavigate}
      >
        <Button variant="ghost" className="justify-start w-full">
          <Home className="mr-2 h-4 w-4" />
          Главная панель
        </Button>
      </NavLink>

      <NavLink
        to="/incidents"
        className={({ isActive }) =>
          `btn ${linkBase} ${isActive ? "active" : ""}`
        }
        onClick={onNavigate}
      >
        <Button variant="ghost" className="justify-start w-full">
          <AlertTriangle className="mr-2 h-4 w-4" />
          Инциденты
        </Button>
      </NavLink>

    </nav>
  );
}

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const [schoolName, setSchoolName] = useState<string>("");
  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!user?.schoolId) {
        setSchoolName("");
        return;
      }
      try {
        const b = await api.getSchoolById(user.schoolId);
        if (!ignore) setSchoolName(b.name);
      } catch {
        if (!ignore) setSchoolName("—");
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [user?.schoolId]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="mt-8">
                  <NavigationMenu onNavigate={() => setSidebarOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-slate-900">Школа: {schoolName}</h1>
            <span className="hidden sm:inline text-slate-500">•</span>
            <span className="hidden sm:inline text-slate-600">
              Директор: {user?.username || "—"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-700">Система активна</span>
            </div>
            <Button variant="ghost" onClick={logout} title="Выйти">
              <LogOut className="h-4 w-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-73px)] p-4">
          <NavigationMenu />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Роут-обёртки, чтобы пробросить коллбеки как в старом коде */
function DashboardRoute() {
  const navigate = useNavigate();
  return <Dashboard onNavigateToIncidents={() => navigate("/incidents")} />;
}

function IncidentsRoute() {
  const navigate = useNavigate();
  return <IncidentsPage onViewDetails={(id) => navigate(`/incidents/${id}`)} />;
}

function IncidentDetailsRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  if (!id) return null;
  return (
    <IncidentDetails incidentId={id} onBack={() => navigate("/incidents")} />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Публично: логин */}
          <Route path="/login" element={<LoginPage />} />

          {/* Приватно: всё остальное */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardRoute />} />
              <Route path="/incidents" element={<IncidentsRoute />} />
              <Route path="/incidents/:id" element={<IncidentDetailsRoute />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
