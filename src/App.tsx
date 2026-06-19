import React, { useState, useEffect } from 'react';
import ClientPortal from './components/ClientPortal';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import { Scissors, Lock, Calendar, ClipboardList, Instagram } from 'lucide-react';

export default function App() {
  const [isAdminView, setIsAdminView] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  
  // Checking local token and URL routing on mount
  useEffect(() => {
    // Basic route management based on path (detects /admin or ?token in URL)
    const isUrlAdmin = window.location.pathname.startsWith('/admin') || window.location.search.includes('token');
    if (isUrlAdmin) {
      setIsAdminView(true);
    }

    const savedToken = localStorage.getItem('rojas_admin_token') || localStorage.getItem('infinity_admin_token');
    if (savedToken) {
      // Fast check if valid visually, actual API calls will verify dynamically
      setAdminToken(savedToken);
      if (!localStorage.getItem('rojas_admin_token')) {
        localStorage.setItem('rojas_admin_token', savedToken);
      }
    }
  }, []);

  const handleAdminLogin = (token: string) => {
    localStorage.setItem('rojas_admin_token', token);
    localStorage.setItem('infinity_admin_token', token);
    setAdminToken(token);
    setIsAdminView(true);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('rojas_admin_token');
    localStorage.removeItem('infinity_admin_token');
    setAdminToken(null);
    setIsAdminView(false);
    // Redirect cleanly to home view
    window.history.pushState({}, '', '/');
  };

  const navigateToClient = () => {
    setIsAdminView(false);
    window.history.pushState({}, '', '/');
  };

  const navigateToAdmin = () => {
    setIsAdminView(true);
    window.history.pushState({}, '', '/admin');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col font-sans relative overflow-x-hidden" id="infinity-app-root">
      
      {/* Immersive background glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* GLOBAL NAVBAR HEADER */}
      <nav className="glass sticky top-0 z-50 shadow-2xl" id="global-nav">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center h-16">
            
            {/* Branding Logo */}
            <div 
              onClick={navigateToClient}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition group select-none"
              id="brand-logo-btn"
            >
              <div className="w-9 h-9 bg-white text-black rounded-lg flex items-center justify-center border border-white/20 group-hover:rotate-12 transition duration-200 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                <Scissors className="w-5 h-5 stroke-[2.5px]" />
              </div>
              <div className="leading-tight">
                <span className="font-extrabold tracking-tight text-base font-display italic hover:text-amber-400 block">
                  Rojas Barber
                </span>
                <span className="text-[9px] uppercase font-bold tracking-widest text-white/40 font-mono block">
                  BY EMMANUEL ROJAS
                </span>
              </div>
            </div>

            {/* Navigation Tabs (Seamless testing inline) */}
            <div className="flex items-center gap-2 md:gap-4 text-xs font-semibold" id="global-nav-tabs">
              <button
                onClick={navigateToClient}
                className={`px-3 py-2 rounded-lg transition duration-150 flex items-center gap-1 cursor-pointer ${
                  !isAdminView 
                    ? 'bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                id="portal-view-toggle"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reservar</span> Cita
              </button>

              <button
                onClick={navigateToAdmin}
                className={`px-3 py-2 rounded-lg transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                  isAdminView 
                    ? 'bg-white text-black font-bold shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                id="admin-view-toggle"
              >
                {adminToken ? <ClipboardList className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{adminToken ? 'Panel' : 'Acceso'}</span> Admin
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* REASSURING CHILE LOCAL CLINIC STATUS NOTICE (Minimal Margin Anti-AI-slop rule respected) */}
      
      {/* MAIN VIEW CONTROLLER */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 md:px-6 py-10 relative z-10" id="main-viewport">
        {isAdminView ? (
          adminToken ? (
            <AdminDashboard token={adminToken} onLogout={handleAdminLogout} />
          ) : (
            <AdminLogin onLoginSuccess={handleAdminLogin} />
          )
        ) : (
          <ClientPortal />
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-black/65 text-white/40 border-t border-t-white/5 py-8 text-center text-xs mt-12 relative z-10" id="global-footer">
        <div className="max-w-6xl mx-auto px-4 space-y-3">
          <p className="font-semibold text-white/80 font-display italic tracking-tight text-sm">
            © {new Date().getFullYear()} Rojas Barber — Rancagua, Chile
          </p>
          <div className="text-[10px] text-white/40 font-sans space-x-1.5">
            <span>Emmanuel Rojas Barbería</span>
            <span>•</span>
            <span>Soporte Express 24/7</span>
            <span>•</span>
            <span>Citas Agendadas Vía WhatsApp</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-[10px] text-amber-400 font-mono pt-1">
            <a 
              href="https://www.instagram.com/rojas_barber123?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-amber-300 flex items-center gap-1 transition animate-pulse-slow"
              id="studio-instagram-link"
            >
              <Instagram className="w-3.5 h-3.5 text-amber-400" /> Instagram de Rojas Barber
            </a>
            <span className="hidden sm:inline text-white/20">•</span>
            <a 
              href="https://www.instagram.com/rojas_barber123?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-amber-300 flex items-center gap-1 transition"
              id="barber-instagram-link"
            >
              <Instagram className="w-3.5 h-3.5 text-amber-400" /> Instagram de Emmanuel
            </a>
          </div>
          <p className="text-[9px] text-white/30 font-mono pt-1">
            Ubicación: José Domingo Mujica 385 • Diagonal Open Plaza, Rancagua • Tlf: +56 9 4634 6791
          </p>
        </div>
      </footer>

    </div>
  );
}
