import { useState } from 'react';
import { Home, AlertTriangle, Camera, Menu } from 'lucide-react';
import { Button } from './components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from './components/ui/sheet';
import Dashboard from './components/Dashboard';
import IncidentsPage from './components/IncidentsPage';
import IncidentDetails from './components/IncidentDetails';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'incidents' | 'incident-details'>('dashboard');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleViewIncidentDetails = (id: string) => {
    setSelectedIncidentId(id);
    setCurrentPage('incident-details');
  };

  const handleBackToIncidents = () => {
    setCurrentPage('incidents');
    setSelectedIncidentId(null);
  };

  const NavigationMenu = () => (
    <nav className="flex flex-col gap-2">
      <Button
        variant={currentPage === 'dashboard' ? 'default' : 'ghost'}
        className="justify-start"
        onClick={() => {
          setCurrentPage('dashboard');
          setSidebarOpen(false);
        }}
      >
        <Home className="mr-2 h-4 w-4" />
        Главная панель
      </Button>
      <Button
        variant={currentPage === 'incidents' || currentPage === 'incident-details' ? 'default' : 'ghost'}
        className="justify-start"
        onClick={() => {
          setCurrentPage('incidents');
          setSidebarOpen(false);
        }}
      >
        <AlertTriangle className="mr-2 h-4 w-4" />
        Инциденты
      </Button>
      <Button variant="ghost" className="justify-start">
        <Camera className="mr-2 h-4 w-4" />
        ИИ-камеры
      </Button>
    </nav>
  );

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
                  <NavigationMenu />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-slate-900">Школа №42</h1>
            <span className="hidden sm:inline text-slate-500">•</span>
            <span className="hidden sm:inline text-slate-600">Директор: Иванова А.С.</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-700">Система активна</span>
            </div>
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
          {currentPage === 'dashboard' && (
            <Dashboard onNavigateToIncidents={() => setCurrentPage('incidents')} />
          )}
          {currentPage === 'incidents' && (
            <IncidentsPage onViewDetails={handleViewIncidentDetails} />
          )}
          {currentPage === 'incident-details' && selectedIncidentId && (
            <IncidentDetails 
              incidentId={selectedIncidentId}
              onBack={handleBackToIncidents}
            />
          )}
        </main>
      </div>
    </div>
  );
}
