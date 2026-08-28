import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { UserRole } from '@healthclaim/shared';
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  FileCheck2,
  ReceiptText,
  BadgePercent,
  LogOut,
  UserCheck,
  Building2,
  Menu,
  X,
  CreditCard,
  Lock,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case UserRole.SYSTEM_ADMIN:
        return { label: 'System Admin', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      case UserRole.CLAIM_OFFICER:
        return { label: 'Claim Officer', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case UserRole.FINANCE_MANAGER:
        return { label: 'Finance Manager', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case UserRole.SECURITY_AUDITOR:
        return { label: 'Security Auditor', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      case UserRole.EMPLOYEE:
      default:
        return { label: 'Employee', bg: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const roleInfo = getRoleBadge(user?.role);

  // Navigation Items by RBAC permission
  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: Object.values(UserRole),
    },
    {
      to: '/profile',
      label: 'My Quota & Profile',
      icon: CreditCard,
      roles: [UserRole.EMPLOYEE],
    },
    {
      to: '/admin/users',
      label: 'User Management',
      icon: Users,
      roles: [UserRole.SYSTEM_ADMIN],
    },
    {
      to: '/admin/policies',
      label: 'Benefit Tiers',
      icon: BadgePercent,
      roles: [UserRole.SYSTEM_ADMIN],
    },
    {
      to: '/audit-logs',
      label: 'Audit Trails',
      icon: ShieldAlert,
      roles: [UserRole.SYSTEM_ADMIN, UserRole.SECURITY_AUDITOR],
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => user?.role && item.roles.includes(user.role),
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-100 border-r border-slate-800">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800">
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            <span className="text-xl">✚</span>
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              HealthClaim <span className="text-blue-400 font-extrabold text-xs px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-400/20">PRO</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Enterprise Settlement</p>
          </div>
        </div>

        {/* User Mini Profile */}
        <div className="px-4 py-4 border-b border-slate-800/60 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-blue-400">
              {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border font-medium mt-1 ${roleInfo.bg}`}>
                {roleInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline">
                Department:
              </span>
              <span className="text-xs font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">
                {user?.department || 'Corporate Member'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Real-time Employee Quota Indicator */}
            {user?.role === UserRole.EMPLOYEE && user.activeQuota && (
              <div className="hidden sm:flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-emerald-800">
                    Remaining Quota ({user.activeQuota.fiscalYear})
                  </p>
                  <p className="text-xs font-extrabold text-emerald-700">
                    ${user.activeQuota.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} / ${user.activeQuota.annualLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}

            {/* User status */}
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              <span className="text-xs font-medium text-slate-600">Zero-Trust Active</span>
            </div>
          </div>
        </header>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 text-white px-4 py-3 space-y-1 border-b border-slate-800">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-rose-400"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        )}

        {/* Page Body */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
