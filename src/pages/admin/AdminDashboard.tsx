import React from 'react';
import { NavLink, Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';
import { AdminOverview } from './AdminOverview';
import { AdminPayments } from './AdminPayments';
import { AdminVideos } from './AdminVideos';
import { AdminUsers } from './AdminUsers';
import { AdminSettings } from './AdminSettings';
import {
  LayoutDashboard,
  CreditCard,
  Film,
  Users as UsersIcon,
  Settings as SettingsIcon,
  PlaySquare,
  LogOut,
  ArrowLeft,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const desktopNavItems = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/payments', label: 'Payments', icon: CreditCard },
    { to: '/admin/videos', label: 'Videos', icon: Film },
    { to: '/admin/users', label: 'Users', icon: UsersIcon },
    { to: '/admin/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const mobileTabItems = [
    { to: '/admin/payments', label: 'Payments', icon: CreditCard },
    { to: '/admin/videos', label: 'Videos', icon: Film },
    { to: '/admin/users', label: 'Users', icon: UsersIcon },
    { to: '/admin/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const getMobileTitle = (pathname: string): string => {
    if (pathname.startsWith('/admin/payments')) return 'Payments';
    if (pathname.startsWith('/admin/videos')) return 'Videos';
    if (pathname.startsWith('/admin/users')) return 'Users';
    if (pathname.startsWith('/admin/settings')) return 'Settings';
    return 'Admin Panel';
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col selection:bg-[#111111] selection:text-white overflow-x-clip">
      {/* Desktop Navbar (>= 768px) */}
      <div className="hidden md:block">
        <Navbar />
      </div>

      {/* Mobile Top Bar (< 768px) */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            to="/admin"
            className="text-base font-bold tracking-tight text-[#111111] truncate"
          >
            {getMobileTitle(location.pathname)}
          </Link>
        </div>

        <Link
          to="/"
          className="min-h-[44px] inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold text-[#111111] hover:bg-neutral-100 border border-neutral-200/80 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to site</span>
        </Link>
      </header>

      <div className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-8 pb-28 md:pb-8 flex flex-col md:flex-row gap-6 lg:gap-8">
        {/* Desktop Sidebar (>= 768px) */}
        <aside className="hidden md:block w-52 lg:w-56 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-neutral-200/90 p-3 shadow-soft space-y-1 sticky top-24">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
              Admin Panel
            </div>

            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-[#111111] text-white shadow-xs'
                        : 'text-[#6B7280] hover:text-[#111111] hover:bg-neutral-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            <div className="pt-3 mt-3 border-t border-neutral-100 space-y-1">
              <Link
                to="/videos"
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#6B7280] hover:text-[#111111] hover:bg-neutral-100 text-xs sm:text-sm font-medium transition-colors"
              >
                <PlaySquare className="w-4 h-4 text-[#6B7280]" />
                <span>Video Library</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN PAGE CONTENT */}
        <main className="flex-1 min-w-0">
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="videos" element={<AdminVideos />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>

      {/* Mobile Fixed Bottom Tab Bar (< 768px) */}
      <nav
        aria-label="Admin navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-4 h-[56px]">
          {mobileTabItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                    isActive ? 'text-[#111111]' : 'text-[#6B7280]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative flex items-center justify-center">
                      <Icon
                        className={`w-5 h-5 ${
                          isActive ? 'text-[#111111] stroke-[2.2]' : 'text-[#6B7280] stroke-[1.75]'
                        }`}
                      />
                      {isActive && (
                        <span
                          className="absolute -top-0.5 -right-2 w-1.5 h-1.5 rounded-full bg-[#B8860B]"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <span className="leading-none">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
