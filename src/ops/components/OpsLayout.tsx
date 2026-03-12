import React from 'react';
import { Navigate, Outlet, NavLink } from 'react-router-dom';
import { useOpsAuth } from '../contexts/OpsAuthContext';
import { useOpsLanguage } from '../contexts/OpsLanguageContext';
import LanguageToggle from './LanguageToggle';
import NetworkStatus from './NetworkStatus';
import NotificationBell from './NotificationBell';
import VectorDock from './VectorDock';
import { Button } from '@/components/ui/button';
import { Home, ClipboardList, Package, ShoppingCart, Users, Clock, FileText, Settings, LogOut, Menu, X, Shirt } from 'lucide-react';
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
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session || !profile) {
    return <Navigate to="/ops" replace />;
  }

  const items = navItems(isAdmin);

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between px-3 h-12">
          <div className="flex items-center gap-2 min-w-0">
            <button
              className="lg:hidden p-1"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="font-bold text-sm truncate">{profile.displayName}</span>
            <span className="text-xs text-foreground/70 capitalize shrink-0">({profile.role})</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <NotificationBell />
            <NetworkStatus />
            <LanguageToggle />
            <Button variant="ghost" size="sm" onClick={signOut} className="h-7 px-2 gap-1">
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">{t('nav.signOut')}</span>
            </Button>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex border-t border-border px-3 gap-1 overflow-x-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap
                ${isActive ? 'text-primary border-b-2 border-primary' : 'text-foreground/60 hover:text-foreground'}`
              }
            >
              <item.icon className="h-3.5 w-3.5" />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <nav className="lg:hidden border-t border-border bg-background px-2 py-1.5 space-y-0.5">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium
                  ${isActive ? 'bg-primary/10 text-primary' : 'text-foreground/70 hover:bg-muted'}`
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

      {/* Vector AI Dock */}
      <VectorDock />
    </div>
  );
}
