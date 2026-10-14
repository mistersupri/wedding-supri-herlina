import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Heart,
  Calendar,
  Sparkles,
  Images,
  Camera,
  MessageSquareHeart,
  QrCode,
  Gift,
  Palette,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

export const CMSLayout: React.FC = () => {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3500);
  };

  // Protect route
  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center text-stone-200">
        <div className="w-10 h-10 rounded-full border-3 border-[#5A5A40]/40 border-t-[#5A5A40] animate-spin mb-3" />
        <p className="text-xs text-stone-400">Memeriksa otentikasi admin...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page
    return <Navigate to="/cms/login" replace state={{ from: location }} />;
  }

  const navItems = [
    { to: '/cms/overview', label: 'Ringkasan & Statistik', icon: LayoutDashboard },
    { to: '/cms/mempelai', label: 'Data Mempelai', icon: Heart },
    { to: '/cms/acara', label: 'Jadwal Acara', icon: Calendar },
    { to: '/cms/cerita', label: 'Kisah Cinta', icon: Sparkles },
    { to: '/cms/galeri', label: 'Galeri Foto', icon: Images },
    { to: '/cms/photo-moments', label: 'Photo Moments Tamu', icon: Camera },
    { to: '/cms/tamu', label: 'Buku Tamu & RSVP', icon: MessageSquareHeart },
    { to: '/cms/penerimaan-tamu', label: 'Desk Receptionist & QR', icon: QrCode },
    { to: '/cms/kado', label: 'Rekening & Hadiah', icon: Gift },
    { to: '/cms/tema', label: 'Tema & Tampilan', icon: Palette },
    { to: '/cms/pengaturan', label: 'Pengaturan Akun', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/cms/login');
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 flex flex-col md:flex-row font-['Plus_Jakarta_Sans'] antialiased">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-100 max-w-md animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : 'bg-rose-900 text-rose-100 border-rose-700'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-stone-900 text-stone-200 shrink-0 border-r border-stone-800">
        {/* Brand Header */}
        <div className="p-6 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5A5A40] flex items-center justify-center text-stone-100 font-bold shadow-md">
              <Heart className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-stone-100 tracking-tight">
                Wedding CMS
              </h2>
              <p className="text-[11px] text-stone-400">Panel Manajemen</p>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#5A5A40] text-white shadow-md shadow-[#5A5A40]/30'
                      : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/70'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Admin info & Logout */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/40">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-stone-200 truncate">
                {user?.name || user?.username || 'Admin'}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-stone-400">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>{user?.role || 'SUPERADMIN'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Pratinjau</span>
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl bg-stone-800 hover:bg-rose-900/60 text-stone-400 hover:text-rose-200 transition-colors cursor-pointer"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Navigation */}
      <header className="md:hidden bg-stone-900 text-stone-200 p-4 border-b border-stone-800 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#5A5A40] flex items-center justify-center text-amber-200">
            <Heart className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-xs text-stone-100">Wedding CMS</h2>
            <p className="text-[10px] text-stone-400">{user?.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-stone-800 text-stone-300 text-xs"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="p-2 rounded-xl bg-stone-800 text-stone-200"
          >
            {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      {isMobileNavOpen && (
        <div className="md:hidden fixed inset-0 top-[65px] bg-stone-900/95 backdrop-blur-md z-30 p-4 flex flex-col justify-between">
          <nav className="space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileNavOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#5A5A40] text-white'
                        : 'text-stone-300 hover:bg-stone-800'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
          <div className="pt-4 border-t border-stone-800">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-950/80 text-rose-200 font-semibold text-xs"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar dari Admin</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto max-h-screen">
        <div className="max-w-6xl mx-auto">
          <Outlet context={{ showToast }} />
        </div>
      </main>
    </div>
  );
};
