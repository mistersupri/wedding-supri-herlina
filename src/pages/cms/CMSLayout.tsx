import React, { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { ToastProvider } from '../../components/cms/Toast.js';
import { KawungMark } from '../../components/ui/Kawung.js';
import { IconButton } from '../../components/ui/Button.js';
import { LoadingState } from '../../components/ui/StateView.js';
import { useDialogBehaviour } from '../../components/ui/Modal.js';

const NAV_GROUPS = [
  { title: '', items: [{ to: '/cms/overview', label: 'Ringkasan' }] },
  {
    title: 'Isi undangan',
    items: [
      { to: '/cms/mempelai', label: 'Mempelai & sampul' },
      { to: '/cms/acara', label: 'Jadwal acara' },
      { to: '/cms/cerita', label: 'Kisah' },
      { to: '/cms/galeri', label: 'Galeri' },
      { to: '/cms/kado', label: 'Rekening & QRIS' },
      { to: '/cms/tema', label: 'Tema, musik & WhatsApp' },
    ],
  },
  {
    title: 'Tamu',
    items: [
      { to: '/cms/tamu', label: 'Daftar tamu & ucapan' },
      { to: '/cms/penerimaan-tamu', label: 'Meja penerima tamu' },
      { to: '/cms/photo-moments', label: 'Photo Moments' },
    ],
  },
  { title: 'Akun', items: [{ to: '/cms/pengaturan', label: 'Pengaturan' }] },
];

const NavList: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => (
  <nav aria-label="Menu CMS" className="space-y-6">
    {NAV_GROUPS.map((group) => (
      <div key={group.title || 'home'}>
        {group.title && <p className="px-3 text-xs font-semibold text-on-deep-soft">{group.title}</p>}
        <ul className="mt-1.5 space-y-0.5">
          {group.items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-2.5 rounded-sm px-3 text-[15px] transition-colors ${
                    isActive ? 'bg-deep-2 font-semibold text-on-deep' : 'text-on-deep-soft hover:bg-deep-2/60 hover:text-on-deep'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <KawungMark className={`h-3 w-3 shrink-0 ${isActive ? 'text-prada-on-deep' : 'text-transparent'}`} />
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </nav>
);

export const CMSLayout: React.FC = () => {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  useDialogBehaviour(drawerOpen, () => setDrawerOpen(false), drawerRef);

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  if (isLoading) return <LoadingState label="Memeriksa sesi admin..." className="min-h-dvh" />;
  if (!isAuthenticated) return <Navigate to="/cms/login" replace state={{ from: location }} />;

  const signOut = async () => {
    await logout();
    navigate('/cms/login');
  };

  const footer = (
    <div className="space-y-2 border-t border-on-deep/15 pt-4">
      <p className="truncate px-3 text-sm">
        {user?.name}
        <span className="block text-xs text-on-deep-soft">{user?.username}</span>
      </p>
      <a
        href="/"
        target="_blank"
        rel="noreferrer"
        className="flex min-h-11 items-center rounded-sm px-3 text-sm text-on-deep-soft hover:bg-deep-2 hover:text-on-deep"
      >
        Lihat undangan (tab baru)
      </a>
      <button
        type="button"
        onClick={signOut}
        className="flex min-h-11 w-full items-center gap-2 rounded-sm px-3 text-sm text-on-deep-soft hover:bg-deep-2 hover:text-on-deep"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Keluar
      </button>
    </div>
  );

  return (
    <ToastProvider>
      <div className="min-h-dvh bg-paper text-ink md:grid md:grid-cols-[16rem_1fr]">
        <aside className="on-deep sticky top-0 hidden h-dvh flex-col justify-between overflow-y-auto p-4 md:flex">
          <div>
            <p className="mb-8 flex items-center gap-2 px-3 font-display text-xl">
              <KawungMark className="h-6 w-6 text-prada-on-deep" />
              Undangan
            </p>
            <NavList />
          </div>
          {footer}
        </aside>

        <header className="on-deep sticky top-0 z-30 flex items-center justify-between px-3 py-2 md:hidden">
          <p className="flex items-center gap-2 px-2 font-display text-lg">
            <KawungMark className="h-5 w-5 text-prada-on-deep" />
            Undangan
          </p>
          <IconButton tone="deep" label="Buka menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>
            <Menu className="h-6 w-6" />
          </IconButton>
        </header>

        {drawerOpen && (
          <div className="fixed inset-0 z-40 bg-ink/50 md:hidden" onMouseDown={(e) => e.target === e.currentTarget && setDrawerOpen(false)}>
            <div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Menu CMS"
              tabIndex={-1}
              className="on-deep flex h-full w-72 max-w-[85vw] flex-col justify-between overflow-y-auto p-4 outline-none"
            >
              <div>
                <div className="mb-6 flex justify-end">
                  <IconButton tone="deep" label="Tutup menu" onClick={() => setDrawerOpen(false)}>
                    <X className="h-6 w-6" />
                  </IconButton>
                </div>
                <NavList onNavigate={() => setDrawerOpen(false)} />
              </div>
              {footer}
            </div>
          </div>
        )}

        <main className="min-w-0 px-4 py-8 sm:px-8 sm:py-10">
          <div className="mx-auto max-w-6xl">
            <Suspense fallback={<LoadingState label="Memuat..." />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </ToastProvider>
  );
};
