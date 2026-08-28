import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { UserRole } from '@healthclaim/shared';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  FileText,
  ShieldCheck,
  TrendingUp,
  Clock,
  CheckCircle2,
  Users,
  BadgePercent,
  PlusCircle,
  FileCheck2,
  Lock,
  ArrowUpRight,
  Receipt,
  Layers,
  Key,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  // 1. Employee Dashboard View
  const renderEmployeeView = () => {
    const quota = user?.activeQuota;
    const remaining = quota?.remainingBalance || 0;
    const total = quota?.annualLimit || 0;
    const spent = total - remaining;
    const progressPercent = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0;

    return (
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl p-6 md:p-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/30 border border-blue-400/30 text-blue-200 mb-2">
                Employee Benefits Portal • Fiscal Year {currentYear}
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Welcome back, {user?.firstName}!
              </h2>
              <p className="text-blue-100 text-sm mt-1 max-w-xl">
                Track your corporate medical coverage, submit encrypted invoices, and monitor claim reimbursement progression.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs flex items-center gap-2 backdrop-blur-sm transition-all"
              >
                <CreditCard className="h-4 w-4" />
                View Full Quota
              </Link>
            </div>
          </div>
        </div>

        {/* Quota & Balances Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Annual Quota Balance */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Available Quota
              </span>
              <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-slate-900">
                ${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                out of ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} limit ({quota?.benefitTier?.name || 'Standard Plan'})
              </p>
            </div>
            <div className="mt-4">
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${100 - progressPercent}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
                <span>{100 - progressPercent}% Remaining</span>
                <span>{progressPercent}% Utilized</span>
              </div>
            </div>
          </div>

          {/* Card 2: Co-Pay Rate & Deductible */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Plan Coverage Ratio
              </span>
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <BadgePercent className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-slate-900">
                {((quota?.benefitTier?.defaultCoPayRate || 0.8) * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Company reimbursement coverage
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Annual Deductible:</span>
              <span className="font-bold text-slate-800">
                ${quota?.benefitTier?.defaultDeductible || 100}.00
              </span>
            </div>
          </div>

          {/* Card 3: Security & Encryption */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Receipt Privacy
              </span>
              <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Lock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-slate-900">Zero-Trust</p>
              <p className="text-xs text-slate-500 mt-1">
                RSA-4096 / AES-256 Envelope Encryption
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Singapore PDPA Compliant</span>
            </div>
          </div>
        </div>

        {/* Quick Actions & Recent Claims Mockup */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Claim Pipeline Preview (Iteration 2)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic rule compilation & visual invoice submission will be fully enabled in Iteration 2.
              </p>
            </div>
          </div>
          <div className="py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3">
              <Receipt className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Ready for Iteration 2 Claim Submissions</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Your profile is verified with active tier <span className="font-semibold text-slate-700">{quota?.benefitTier?.name}</span> and ${remaining.toFixed(2)} quota limit.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // 2. Claim Officer Dashboard View
  const renderClaimOfficerView = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 rounded-2xl p-6 md:p-8 text-white shadow-xl">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/30 border border-blue-400/30 text-blue-200">
          Claim Officer Audit Center
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-2">
          Officer Review Workspace
        </h2>
        <p className="text-slate-300 text-sm mt-1 max-w-xl">
          Inspect incoming claims, evaluate automated AST rule compliance reports, and issue first-line audit determinations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Role Boundary</span>
          <p className="text-xl font-bold text-blue-600 mt-2">First-Line Audit</p>
          <p className="text-xs text-slate-500 mt-1">Authorized to review, reject or request documents</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Rule Engine AST</span>
          <p className="text-xl font-bold text-slate-900 mt-2">Composite & Spec</p>
          <p className="text-xs text-slate-500 mt-1">Evaluates multi-level AND / OR criteria</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Status</span>
          <p className="text-xl font-bold text-emerald-600 mt-2">Ready</p>
          <p className="text-xs text-slate-500 mt-1">RBAC authenticated with CLAIM_OFFICER scope</p>
        </div>
      </div>
    </div>
  );

  // 3. Finance Manager Dashboard View
  const renderFinanceView = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/30 border border-emerald-400/30 text-emerald-200">
          Corporate Treasury & Finance
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-2">
          Financial Settlement Console
        </h2>
        <p className="text-emerald-100 text-sm mt-1 max-w-xl">
          Execute final fiscal approvals on high-value claims, initiate disbursements, and export audit-ready settlement vouchers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Disbursement Authority</span>
          <p className="text-xl font-bold text-emerald-700 mt-2">Financial Officer</p>
          <p className="text-xs text-slate-500 mt-1">Authorized for settlement state transitions</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Settlement Engine</span>
          <p className="text-xl font-bold text-slate-900 mt-2">Template Method</p>
          <p className="text-xs text-slate-500 mt-1">Standardized settlement statements & PDF export</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Dual Control Check</span>
          <p className="text-xl font-bold text-emerald-600 mt-2">Enforced</p>
          <p className="text-xs text-slate-500 mt-1">Prevents unauthorized unilateral disbursements</p>
        </div>
      </div>
    </div>
  );

  // 4. System Administrator View
  const renderAdminView = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-900 via-slate-900 to-indigo-950 rounded-2xl p-6 md:p-8 text-white shadow-xl">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/30 border border-purple-400/30 text-purple-200">
          System Administration & RBAC Master
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-2">
          Administrator Command Hub
        </h2>
        <p className="text-purple-100 text-sm mt-1 max-w-xl">
          Manage corporate enterprise users, configure benefit tiers, allocate annual quotas, and oversee security boundaries.
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <Link
            to="/admin/users"
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-purple-600/30"
          >
            <Users className="h-4 w-4" />
            Manage Users & Roles
          </Link>
          <Link
            to="/admin/policies"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-2 transition-all border border-white/20"
          >
            <BadgePercent className="h-4 w-4" />
            Configure Benefit Tiers
          </Link>
          <Link
            to="/audit-logs"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-2 transition-all border border-white/20"
          >
            <ShieldCheck className="h-4 w-4" />
            Audit Trails
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Enterprise RBAC</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">5 Distinct Roles</p>
          <p className="text-xs text-slate-500 mt-1">Strict vertical & horizontal separation</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Benefit Tiers</span>
          <p className="text-2xl font-bold text-purple-700 mt-2">3 Pre-configured Plans</p>
          <p className="text-xs text-slate-500 mt-1">Standard, Executive, Premium Global</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Database & ORM</span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">PostgreSQL + Prisma</p>
          <p className="text-xs text-slate-500 mt-1">ACID transactions with versioned migrations</p>
        </div>
      </div>
    </div>
  );

  // 5. Security Auditor View
  const renderAuditorView = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/30 border border-amber-400/30 text-amber-200">
          Security Auditor & Compliance Officer
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-2">
          Regulatory Audit & Decryption Governance
        </h2>
        <p className="text-amber-100 text-sm mt-1 max-w-xl">
          Holder of enterprise master keys for compliance audits under Singapore PDPA & HIPAA data confidentiality standards.
        </p>
        <div className="mt-4">
          <Link
            to="/audit-logs"
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold inline-flex items-center gap-2 transition-all shadow-md shadow-amber-600/30"
          >
            <ShieldCheck className="h-4 w-4" />
            Inspect Tamper-Proof Audit Logs
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Master Key Status</span>
          <p className="text-xl font-bold text-amber-700 mt-2">RSA-4096 Ready</p>
          <p className="text-xs text-slate-500 mt-1">Asymmetric DEK decryption capability</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Audit Records</span>
          <p className="text-xl font-bold text-slate-900 mt-2">Immutable Log</p>
          <p className="text-xs text-slate-500 mt-1">Tracks logins, role changes, tier adjustments</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase">Zero-Trust Guard</span>
          <p className="text-xl font-bold text-emerald-600 mt-2">Enforced</p>
          <p className="text-xs text-slate-500 mt-1">No plaintext receipt persistence</p>
        </div>
      </div>
    </div>
  );

  switch (user?.role) {
    case UserRole.SYSTEM_ADMIN:
      return renderAdminView();
    case UserRole.CLAIM_OFFICER:
      return renderClaimOfficerView();
    case UserRole.FINANCE_MANAGER:
      return renderFinanceView();
    case UserRole.SECURITY_AUDITOR:
      return renderAuditorView();
    case UserRole.EMPLOYEE:
    default:
      return renderEmployeeView();
  }
};
