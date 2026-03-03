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
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="font-bold text-sm">{profile.displayName}</span>
            <span className="text-xs text-muted-foreground capitalize">({profile.role})</span>
          </div>
          <div className="flex items-center gap-3">
            <NetworkStatus />
            <LanguageToggle />
            <Button variant="ghost" size="sm" onClick={signOut} className="h-8 gap-1">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t('nav.signOut')}</span>
            </Button>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex border-t border-border px-4 gap-1 overflow-x-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap
                ${isActive ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`
              }
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <nav className="lg:hidden border-t border-border bg-background px-2 py-2 space-y-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-3 rounded-md text-sm font-medium
                  ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`
                }
              >
                <item.icon className="h-5 w-5" />
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 p-4 max-w-7xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
