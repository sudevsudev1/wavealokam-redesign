import React from 'react';
import { Navigate, Outlet, NavLink } from 'react-router-dom';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import LanguageToggle from './LanguageToggle';
import NetworkStatus from './NetworkStatus';
import { Button } from '@/components/ui/button';
import { Home, ClipboardList, Package, ShoppingCart, Users, Clock, FileText, Settings, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navItems = (isAdmin: boolean) => [
  { to: '/ops/home', labelKey: 'nav.home', icon: Home },
  { to: '/ops/tasks', labelKey: 'nav.tasks', icon: ClipboardList },
  { to: '/ops/inventory', labelKey: 'nav.inventory', icon: Package },
  { to: '/ops/purchase', labelKey: 'nav.purchase', icon: ShoppingCart },
  { to: '/ops/guest-log', labelKey: 'nav.guestLog', icon: Users },
  { to: '/ops/shift-punch', labelKey: 'nav.shiftPunch', icon: Clock },
  { to: '/ops/daily-report', labelKey: 'nav.dailyReport', icon: FileText },
  ...(isAdmin ? [{ to: '/ops/admin', labelKey: 'nav.adminConsole', icon: Settings }] : []),
];

export default function OpsLayout() {
  const { session, profile, loading, signOut, isAdmin } = useOpsAuth();
  const { t } = useOpsLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session || !profile) {
    return <Navigate to="/ops" replace />;
  }

  const items = navItems(isAdmin);

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-muted/20 flex flex-col">
      {/* Header with gradient */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-lg">
        <div className="flex items-center justify-between px-3 h-12">
          <div className="flex items-center gap-2 min-w-0">
            <button
              className="lg:hidden p-1 hover:bg-white/20 rounded-md transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-1.5">
              <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                {profile.displayName.charAt(0)}
              </div>
              <span className="font-bold text-xs truncate">{profile.displayName}</span>
              <span className="text-[10px] opacity-80 capitalize shrink-0">({profile.role})</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <NetworkStatus />
            <LanguageToggle />
            <Button variant="ghost" size="sm" onClick={signOut} className="h-7 px-2 gap-1 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground">
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">{t('nav.signOut')}</span>
            </Button>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex border-t border-white/20 px-3 gap-1 overflow-x-auto bg-black/10">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium transition-all whitespace-nowrap
                ${isActive ? 'text-white border-b-2 border-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'}`
              }
            >
              <item.icon className="h-3.5 w-3.5" />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <nav className="lg:hidden border-t border-white/20 bg-primary/95 backdrop-blur px-2 py-1.5 space-y-0.5">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2.5 rounded-md text-xs font-medium transition-all
                  ${isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`
                }
              >
                <item.icon className="h-4 w-4" />
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 p-3 max-w-7xl w-full mx-auto overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
