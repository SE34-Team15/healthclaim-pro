import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { UserRole } from '@healthclaim/shared';
import { BRAND_CONFIG, ROLE_METADATA } from '../../config/branding';
import gsap from 'gsap';
import {
  LayoutDashboard,
  Users,
  Shield,
  CreditCard,
  LogOut,
  Menu,
  X,
  Layers,
  ChevronRight,
  FilePlus2,
  Receipt,
  FileCheck2,
  Settings,
  GitBranch,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mainContentRef.current) {
      gsap.fromTo(
        mainContentRef.current,
        { opacity: 0.9, y: 6 },
        { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' },
      );
    }
  }, [location.pathname]);

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: Object.values(UserRole),
    },
    {
      to: '/claims/submit',
      label: 'Submit Claim',
      icon: FilePlus2,
      roles: [UserRole.EMPLOYEE],
    },
    {
      to: '/claims/my-claims',
      label: 'My Claims',
      icon: Receipt,
      roles: [UserRole.EMPLOYEE],
    },
    {
      to: '/admin/audit-queue',
      label: 'Claim Audit Queue',
      icon: FileCheck2,
      roles: [
        UserRole.CLAIM_OFFICER,
        UserRole.FINANCE_MANAGER,
        UserRole.SYSTEM_ADMIN,
      ],
    },
    {
      to: '/profile',
      label: 'Benefit Quota',
      icon: CreditCard,
      roles: [UserRole.EMPLOYEE],
    },
    {
      to: '/admin/users',
      label: 'User Directory',
      icon: Users,
      roles: [UserRole.SYSTEM_ADMIN],
    },
    {
      to: '/admin/policies',
      label: 'Benefit Tiers',
      icon: Layers,
      roles: [UserRole.SYSTEM_ADMIN],
    },
    {
      to: '/admin/rules',
      label: 'Compliance Rules',
      icon: GitBranch,
      roles: [UserRole.SYSTEM_ADMIN, UserRole.CLAIM_OFFICER],
    },
    {
      to: '/audit-logs',
      label: 'Audit Trails',
      icon: Shield,
      roles: [UserRole.SYSTEM_ADMIN, UserRole.SECURITY_AUDITOR],
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
      roles: Object.values(UserRole),
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => user?.role && item.roles.includes(user.role),
  );

  const roleMeta = user?.role ? ROLE_METADATA[user.role] : ROLE_METADATA[UserRole.EMPLOYEE];

  return (
    <div className="h-screen w-full overflow-hidden bg-[#f8fafc] flex flex-col md:flex-row text-slate-900 selection:bg-[#0a2540] selection:text-white">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 h-full shrink-0 bg-white border-r border-slate-200/80 z-20 shadow-xs">
        {/* Brand Header with Clean Logo (Pure Logo, No Text, Scaled with Sidebar Width) */}
        <div className="flex items-center justify-center p-3.5 border-b border-slate-100 shrink-0">
          <img
            src={BRAND_CONFIG.logoUrl}
            alt={BRAND_CONFIG.fullName}
            className="w-full max-w-[215px] h-36 object-contain hover:scale-[1.02] transition-transform duration-300"
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                    isActive
                      ? 'bg-[#0a2540] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 stroke-[1.75]" />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
              </NavLink>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="p-3 shrink-0 border-t border-slate-100">
          <button
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition-colors"
          >
            <LogOut className="h-4 w-4 stroke-[1.75]" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Clean Remaining Quota Indicator (Only rendered for Employees with Quota) */}
            {user && user.role === UserRole.EMPLOYEE && user.activeQuota && (
              <>
                <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl text-xs shadow-2xs">
                  <span className="text-slate-500 font-medium">Quota:</span>
                  <span className="font-bold text-[#0a2540]">
                    ${user.activeQuota.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    / ${user.activeQuota.annualLimit.toLocaleString()}
                  </span>
                </div>
                {/* Clean divider between Quota and User Identity */}
                <div className="hidden sm:block h-5 w-px bg-slate-200/90" />
              </>
            )}

            {/* Aggregated User Identity (Name, Role, Department) */}
            <div className="flex flex-col items-start text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-[10px] font-semibold text-[#00a88f] font-mono px-1.5 py-0.5 rounded-md bg-teal-50 border border-teal-200/60 leading-tight">
                  {roleMeta.badgeLabel}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                {user?.department || 'General Enterprise'}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden shrink-0 bg-white border-b border-slate-200 px-4 py-3 space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        )}

        {/* Page Main Content */}
        <main ref={mainContentRef} className="flex-1 p-6 md:p-8 overflow-y-auto min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
