import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/client';
import {
  UserRole,
  ClaimResponseDto,
  ClaimStatus,
} from '@healthclaim/shared';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import gsap from 'gsap';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  CreditCard,
  Users,
  Layers,
  Shield,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Building2,
  Eye,
  Archive,
  Check,
  X,
  Activity,
  TrendingUp,
  Percent,
  Zap,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  Stethoscope,
  HeartPulse,
  KeyRound,
  ShieldAlert,
  FolderTree,
  LayoutDashboard,
} from 'lucide-react';

const CHART_PALETTE = [
  '#00a88f',
  '#0a2540',
  '#6366f1',
  '#f59e0b',
  '#06b6d4',
  '#ec4899',
  '#10b981',
  '#8b5cf6',
];

// Dark theme customized tooltip for Recharts
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0a2540] text-white p-3 rounded-xl shadow-xl border border-slate-700/60 text-xs font-sans">
        <p className="font-semibold text-slate-200 mb-1">{label || payload[0]?.name}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2 mt-0.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <span className="text-slate-400 capitalize">{entry.name}:</span>
            <span className="font-mono font-bold text-white">
              {typeof entry.value === 'number' && entry.value % 1 !== 0
                ? `$${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : typeof entry.value === 'number'
                ? entry.value.toLocaleString()
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<ClaimResponseDto | null>(null);
  const [claims, setClaims] = useState<ClaimResponseDto[]>([]);

  // 5 Role Analytics States (100% Real from Backend)
  const [adminData, setAdminData] = useState<any>(null);
  const [financeData, setFinanceData] = useState<any>(null);
  const [officerData, setOfficerData] = useState<any>(null);
  const [securityData, setSecurityData] = useState<any>(null);
  const [employeeData, setEmployeeData] = useState<any>(null);

  useEffect(() => {
    const loadDashboardAnalytics = async () => {
      setLoading(true);
      try {
        if (user?.role === UserRole.SYSTEM_ADMIN) {
          const [adm, clms] = await Promise.all([
            apiClient.get<any, any>('/analytics/admin-overview'),
            apiClient.get<any, ClaimResponseDto[]>('/claims'),
          ]);
          setAdminData(adm);
          setClaims(clms);
        } else if (user?.role === UserRole.FINANCE_MANAGER) {
          const [fin, clms] = await Promise.all([
            apiClient.get<any, any>('/analytics/finance'),
            apiClient.get<any, ClaimResponseDto[]>('/claims'),
          ]);
          setFinanceData(fin);
          setClaims(clms);
        } else if (user?.role === UserRole.CLAIM_OFFICER) {
          const [off, clms] = await Promise.all([
            apiClient.get<any, any>('/analytics/underwriting'),
            apiClient.get<any, ClaimResponseDto[]>('/claims'),
          ]);
          setOfficerData(off);
          setClaims(clms);
        } else if (user?.role === UserRole.SECURITY_AUDITOR) {
          const sec = await apiClient.get<any, any>('/analytics/security');
          setSecurityData(sec);
        } else {
          // Employee role
          const [emp, clms] = await Promise.all([
            apiClient.get<any, any>('/analytics/employee-me'),
            apiClient.get<any, ClaimResponseDto[]>('/claims/my-claims'),
          ]);
          setEmployeeData(emp);
          setClaims(clms);
        }
      } catch (err: any) {
        console.error('Failed to load dashboard analytics', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardAnalytics();
  }, [user?.role]);

  // Trigger GSAP entrance animation on load
  useEffect(() => {
    if (!loading && containerRef.current) {
      gsap.fromTo(
        containerRef.current.querySelectorAll('.telemetry-card'),
        { opacity: 0, y: 14, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.35,
          stagger: 0.05,
          ease: 'power2.out',
        },
      );
    }
  }, [loading, user?.role]);

  // Aggregate Helper: Status Badge
  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case ClaimStatus.AUTO_VALIDATED:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
            <CheckCircle2 className="h-3 w-3" /> Auto-Validated
          </span>
        );
      case ClaimStatus.FLAGGED_REVIEW:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
            <AlertCircle className="h-3 w-3" /> Flagged
          </span>
        );
      case ClaimStatus.OFFICER_APPROVED:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
            <Check className="h-3 w-3" /> Officer Approved
          </span>
        );
      case ClaimStatus.FINANCE_APPROVED:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-md">
            <Check className="h-3 w-3" /> Finance Approved
          </span>
        );
      case ClaimStatus.SETTLED:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00a88f] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
            <ShieldCheck className="h-3 w-3" /> Settled
          </span>
        );
      case ClaimStatus.OFFICER_REJECTED:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
            <X className="h-3 w-3" /> Rejected
          </span>
        );
      case ClaimStatus.CANCELLED:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
            <Archive className="h-3 w-3" /> Withdrawn
          </span>
        );
      case ClaimStatus.SUBMITTED:
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
            <Clock className="h-3 w-3" /> In Triage
          </span>
        );
    }
  };

  /* =========================================================================
   * 1. EMPLOYEE DASHBOARD (Personal Healthcare Actuarial & Expense Insights)
   * ========================================================================= */
  const renderEmployeeDashboard = () => {
    if (!employeeData) return null;

    const {
      tierName,
      totalLimit,
      remaining,
      spent,
      quotaBurnRate,
      deductibleSpent,
      defaultDeductible,
      defaultCoPayRate,
      totalBilledYtd,
      totalReimbursedYtd,
      corporateSavingsRate,
      categoryBreakdown,
      monthlyTrend,
    } = employeeData;

    return (
      <div className="space-y-6">
        {/* Header Telemetry Banner */}
        <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Employee Health Actuarial Hub
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0a2540] mt-1">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Active Tier: <span className="font-semibold text-slate-800">{tierName}</span> • Department:{' '}
              <span className="font-semibold text-slate-800">{user?.department || 'Engineering & IT'}</span>
            </p>
          </div>
        </div>

        {/* 4 Actuarial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Available Quota</span>
              <CreditCard className="h-4 w-4 text-[#00a88f]" />
            </div>
            <p className="text-2xl font-black text-[#0a2540] font-mono tracking-tight">
              ${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <div className="mt-3">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#00a88f] h-full rounded-full transition-all duration-500"
                  style={{ width: `${100 - quotaBurnRate}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                <span>{100 - quotaBurnRate}% Unused</span>
                <span>Annual Cap: ${totalLimit.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">YTD Subsidies Paid</span>
              <HeartPulse className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-[#00a88f] font-mono tracking-tight">
              ${totalReimbursedYtd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1 font-medium">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <span>{corporateSavingsRate}% of claimed medical bills absorbed</span>
            </p>
          </div>

          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Annual Deductible</span>
              <Percent className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              ${deductibleSpent.toFixed(2)}{' '}
              <span className="text-xs font-normal text-slate-400 font-sans">/ ${defaultDeductible.toFixed(2)}</span>
            </p>
            <p className="text-xs text-slate-500 mt-3 font-medium flex items-center gap-1">
              {deductibleSpent >= defaultDeductible ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 inline" />
                  <span className="text-emerald-700 font-semibold">100% Deductible Satisfied</span>
                </>
              ) : (
                `Remaining: $${(defaultDeductible - deductibleSpent).toFixed(2)}`
              )}
            </p>
          </div>

          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Claims Filed</span>
              <Activity className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">{claims.length}</p>
            <p className="text-xs text-slate-500 mt-3 font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Total Billed: ${totalBilledYtd.toFixed(2)}
            </p>
          </div>
        </div>

        {/* 2 Visual Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0a2540] flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-[#00a88f]" /> Medical Spending by Category
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Itemized distribution across clinical specialties</p>
              </div>
            </div>
            <div className="h-64">
              {categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryBreakdown} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `$${v}`} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      interval={0}
                      axisLine={false}
                      tickLine={false}
                      tick={({ y, payload }) => (
                        <text x={0} y={y} dy={3.5} textAnchor="start" fill="#475569" fontSize={10.5} fontWeight={500}>
                          {payload.value}
                        </text>
                      )}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar dataKey="value" name="Amount" radius={[0, 6, 6, 0]}>
                      {categoryBreakdown.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No medical category data recorded yet.
                </div>
              )}
            </div>
          </div>

          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0a2540] flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#0a2540]" /> Expense & Reimbursement Timeline
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Billed invoices vs approved corporate subsidies</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0a2540" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0a2540" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorReimbursed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00a88f" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00a88f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="billed"
                    name="Billed"
                    stroke="#0a2540"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorBilled)"
                  />
                  <Area
                    type="monotone"
                    dataKey="reimbursed"
                    name="Reimbursed"
                    stroke="#00a88f"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorReimbursed)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0a2540]">Recent Health Claim Telemetry</h3>
              <p className="text-xs text-slate-400 mt-0.5">Live status feed of your insurance submissions</p>
            </div>
            <span className="text-xs font-mono text-slate-400">{claims.length} Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold tracking-wider uppercase text-[11px]">
                  <th className="py-3 px-5">Claim ID</th>
                  <th className="py-3 px-4">Institution / Date</th>
                  <th className="py-3 px-4">Specialty</th>
                  <th className="py-3 px-4">Approved Subsidy</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Quick Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      No claims recorded for this fiscal year.
                    </td>
                  </tr>
                ) : (
                  claims.slice(0, 5).map((claim) => (
                    <tr
                      key={claim.id}
                      onClick={() => setSelectedClaim(claim)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-5 font-mono font-bold text-[#0a2540]">{claim.claimNumber}</td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{claim.hospitalName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {new Date(claim.invoiceDate).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {claim.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#00a88f]">
                        ${claim.approvedAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(claim.status)}</td>
                      <td className="py-3 px-5 text-right">
                        <button className="p-1 text-slate-400 group-hover:text-slate-900 transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================================
   * 2. CLAIM OFFICER DASHBOARD (Underwriting Risk & AST Rule Telemetry)
   * ========================================================================= */
  const renderClaimOfficerDashboard = () => {
    if (!officerData) return null;

    const {
      totalClaims,
      autoValidatedCount,
      flaggedCount,
      officerApprovedCount,
      stpRate,
      avgTriageLatencyHours,
      ruleExecutionStats,
      hospitalGradeDistribution,
    } = officerData;

    return (
      <div className="space-y-6">
        <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Underwriting & AST Engine Telemetry
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0a2540] mt-1">
              Claim Officer Audit Console
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live AST compliance rule telemetry, Straight-Through Processing (STP) rate, and fraud triage.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">STP Auto-Pass Rate</span>
              <Zap className="h-4 w-4 text-[#00a88f]" />
            </div>
            <p className="text-2xl font-black text-[#00a88f] font-mono tracking-tight flex items-baseline">
              {stpRate}
              <span className="text-lg font-bold font-sans ml-1 text-[#00a88f]/80">%</span>
            </p>
            <p className="text-xs text-slate-500 mt-3 font-medium">Automated straight-through pass rate</p>
          </div>

          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Pending Triage</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-600 font-mono tracking-tight">{flaggedCount}</p>
            <p className="text-xs text-slate-500 mt-3 font-medium">Claims awaiting officer review</p>
          </div>

          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Officer Approved</span>
              <FileCheck2 className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-black text-indigo-600 font-mono tracking-tight">{officerApprovedCount}</p>
            <p className="text-xs text-slate-500 mt-3 font-medium">Forwarded to Finance settlement</p>
          </div>

          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Triage Latency</span>
              <Activity className="h-4 w-4 text-slate-700" />
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">{avgTriageLatencyHours} hrs</p>
            <p className="text-xs text-slate-500 mt-3 font-medium">Average claim review turnaround</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0a2540] flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#00a88f]" /> AST Compliance Rule Executions
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Execution volume and rule anomaly intercepts</p>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={ruleExecutionStats}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                    tick={({ y, payload }) => (
                      <text
                        x={0}
                        y={y}
                        dy={3.5}
                        textAnchor="start"
                        fill="#475569"
                        fontSize={10}
                        fontWeight={600}
                        fontFamily="monospace"
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                  <Bar dataKey="executions" name="Executions" fill="#0a2540" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="flagged" name="Flagged Anomaly" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0a2540] flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-indigo-600" /> Hospital Grade & Provider Tiers
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Accreditation distribution of claimant institutions</p>
              </div>
            </div>
            <div className="h-72 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={hospitalGradeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {hospitalGradeDistribution.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0a2540]">Claims Ingest Telemetry</h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time incoming stream with automated rule tags</p>
            </div>
            <span className="text-xs font-mono text-slate-400">{totalClaims} Claims Evaluated</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold tracking-wider uppercase text-[11px]">
                  <th className="py-3 px-5">Claim ID</th>
                  <th className="py-3 px-4">Applicant / Dept</th>
                  <th className="py-3 px-4">Hospital Grade</th>
                  <th className="py-3 px-4">Claim Total</th>
                  <th className="py-3 px-4">Rule Evaluation</th>
                  <th className="py-3 px-5 text-right">Quick Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claims.slice(0, 6).map((claim) => (
                  <tr
                    key={claim.id}
                    onClick={() => setSelectedClaim(claim)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-5 font-mono font-bold text-[#0a2540]">{claim.claimNumber}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">
                        {claim.user?.firstName} {claim.user?.lastName}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">{claim.user?.department || '—'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {claim.hospitalGrade || 'GRADE_A'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">${claim.totalAmount.toFixed(2)}</td>
                    <td className="py-3 px-4">{getStatusBadge(claim.status)}</td>
                    <td className="py-3 px-5 text-right">
                      <button className="p-1 text-slate-400 group-hover:text-slate-900 transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================================
   * 3. FINANCE MANAGER DASHBOARD (Dynamic Dept Cost Allocation & Liquidity)
   * ========================================================================= */
  const renderFinanceDashboard = () => {
    if (!financeData) return null;

    const {
      totalCorporatePool,
      settledDisbursements,
      pendingLiquidity,
      deductiblesAbsorbed,
      solvencyRate,
      departmentSpending,
      monthlyDisbursementTrend,
      agingBacklog,
    } = financeData;

    return (
      <div className="space-y-6">
        {/* Header Telemetry Banner */}
        <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Corporate Treasury & Benefit Solvency
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0a2540] mt-1">
              Financial Settlement & Liquidity Console
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-department expense allocation, cashflow disbursement SLA, and benefit reserve solvency.
            </p>
          </div>
        </div>

        {/* 4 Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Settled Disbursements</span>
              <DollarSign className="h-4 w-4 text-[#00a88f]" />
            </div>
            <p className="text-2xl font-black text-[#00a88f] font-mono tracking-tight">
              ${settledDisbursements.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-3 font-medium">Cumulative corporate payouts YTD</p>
          </div>

          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Pending Liquidity</span>
              <Activity className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-black text-indigo-600 font-mono tracking-tight">
              ${pendingLiquidity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-3 font-medium">Approved claims awaiting weekly cash execution</p>
          </div>

          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Deductibles Absorbed</span>
              <ShieldCheck className="h-4 w-4 text-teal-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              ${deductiblesAbsorbed.toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 mt-3 font-medium">Employee out-of-pocket corporate savings</p>
          </div>

          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Active Cost Centers</span>
              <Building2 className="h-4 w-4 text-[#0a2540]" />
            </div>
            <p className="text-2xl font-black text-[#0a2540] font-mono tracking-tight">
              {departmentSpending.length}
            </p>
            <p className="text-xs text-slate-500 mt-3 font-medium">Cost center departments</p>
          </div>
        </div>

        {/* Dynamic Department Cost Allocation Chart */}
        <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0a2540] flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#00a88f]" /> Dynamic Department Medical Cost Allocation
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time expenditure aggregated across all registered corporate departments
              </p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={departmentSpending}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) => `$${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="department"
                  width={140}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                  tick={({ y, payload }) => (
                    <text
                      x={0}
                      y={y}
                      dy={3.5}
                      textAnchor="start"
                      fill="#475569"
                      fontSize={10.5}
                      fontWeight={500}
                    >
                      {payload.value}
                    </text>
                  )}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                <Bar dataKey="totalDisbursed" name="Total Subsidies ($)" fill="#00a88f" radius={[0, 4, 4, 0]} />
                <Bar dataKey="avgPerClaim" name="Avg per Claim ($)" fill="#0a2540" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2 Sub Charts: Monthly Burn & Aging SLA */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Monthly Burn */}
          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0a2540]">Monthly Settlement Disbursements</h3>
                <p className="text-xs text-slate-400 mt-0.5">Actual corporate disbursements by claim date</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyDisbursementTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00a88f" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00a88f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="actualDisbursed"
                    name="Actual Disbursed"
                    stroke="#00a88f"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorActual)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Payout Liquidity Aging SLA */}
          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0a2540]">Settlement Liquidity Aging Backlog</h3>
                <p className="text-xs text-slate-400 mt-0.5">Invoices pending disbursement grouped by latency</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={agingBacklog}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="bucket"
                    width={90}
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                    tick={({ y, payload }) => (
                      <text
                        x={0}
                        y={y}
                        dy={3.5}
                        textAnchor="start"
                        fill="#475569"
                        fontSize={10.5}
                        fontWeight={500}
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="amount" name="Pending Amount ($)" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================================
   * 4. SYSTEM ADMIN DASHBOARD (Pure Organization, Headcount & Policy Governance)
   * ========================================================================= */
  const renderSystemAdminDashboard = () => {
    if (!adminData) return null;

    const {
      totalMembers,
      activeMembers,
      activeRate,
      totalDepartments,
      totalAllocatedPool,
      totalClaimsCount,
      approvedClaimsCount,
      globalApprovalRate,
      departmentWorkforceAndClaims,
      departmentPerCapitaStats,
      monthlyThroughput,
      quotaUtilizationDistribution,
      policyTierEnrollment,
    } = adminData;

    return (
      <div className="space-y-6">
        {/* Header Telemetry Banner */}
        <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Organization & Policy Governance Hub
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0a2540] mt-1">
              Enterprise System Administrator Hub
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Workforce distribution, corporate department density, policy tier commitments, and global claim throughput.
            </p>
          </div>
        </div>

        {/* 4 Admin Business KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Enterprise Members</span>
              <Users className="h-4 w-4 text-[#0a2540]" />
            </div>
            <p className="text-2xl font-black text-[#0a2540] font-mono tracking-tight">{totalMembers}</p>
            <p className="text-xs text-slate-500 mt-3 font-medium">
              <span className="text-emerald-600 font-semibold">{activeMembers} Active</span> ({totalMembers - activeMembers} Inactive)
            </p>
          </div>

          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Active Departments</span>
              <Building2 className="h-4 w-4 text-[#00a88f]" />
            </div>
            <p className="text-2xl font-black text-[#00a88f] font-mono tracking-tight">{totalDepartments}</p>
            <p className="text-xs text-slate-500 mt-3 font-medium">Organizational department units</p>
          </div>

          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Allocated Quota Pool</span>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-600 font-mono tracking-tight">
              ${totalAllocatedPool.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-3 font-medium">Total active healthcare quota commitments</p>
          </div>

          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Global Approval Rate</span>
              <Activity className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-black text-indigo-600 font-mono tracking-tight flex items-baseline">
              {globalApprovalRate}
              <span className="text-lg font-bold font-sans ml-1 text-indigo-600/80">%</span>
            </p>
            <p className="text-xs text-emerald-600 mt-3 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> {approvedClaimsCount} approved / {totalClaimsCount} total
            </p>
          </div>
        </div>

        {/* 4 High-Value Enterprise Visual Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Enterprise Claims Ingest & Settlement Throughput Velocity */}
          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0a2540] flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-600" /> Enterprise Claims Throughput & Settlement Velocity
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Annual submitted vs settled claim velocity across organization</p>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyThroughput} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminSubmittedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0a2540" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0a2540" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="adminSettledGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00a88f" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#00a88f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <Area
                    type="monotone"
                    dataKey="submitted"
                    name="Submitted Claims"
                    stroke="#0a2540"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#adminSubmittedGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="settled"
                    name="Settled Claims"
                    stroke="#00a88f"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#adminSettledGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Workforce & Claim Activity across Dynamic Departments */}
          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0a2540] flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#00a88f]" /> Department Workforce & Claims Volume
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Member headcount vs submitted claims per department</p>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={departmentWorkforceAndClaims}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="department"
                    width={130}
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                    tick={({ y, payload }) => (
                      <text
                        x={0}
                        y={y}
                        dy={3.5}
                        textAnchor="start"
                        fill="#475569"
                        fontSize={10.5}
                        fontWeight={500}
                      >
                        {payload.value}
                      </text>
                    )}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                  <Bar dataKey="memberCount" name="Headcount" fill="#0a2540" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="claimCount" name="Claims Filed" fill="#00a88f" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Department Per-Capita Medical Spending Intensity */}
          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0a2540] flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" /> Department Per-Capita Medical Spending Intensity
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Average medical expenditure per enrolled employee by department</p>
              </div>
            </div>
            <div className="h-72">
              {departmentPerCapitaStats && departmentPerCapitaStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={departmentPerCapitaStats}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="department"
                      width={130}
                      interval={0}
                      axisLine={false}
                      tickLine={false}
                      tick={({ y, payload }) => (
                        <text
                          x={0}
                          y={y}
                          dy={3.5}
                          textAnchor="start"
                          fill="#475569"
                          fontSize={10.5}
                          fontWeight={500}
                        >
                          {payload.value}
                        </text>
                      )}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                    <Bar dataKey="perCapitaSpent" name="Per-Capita Spent ($)" fill="#00a88f" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="totalSpent" name="Total Dept Spent ($)" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No department spending records available.
                </div>
              )}
            </div>
          </div>

          {/* Chart 4: Organization-Wide Quota Utilization Distribution */}
          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0a2540] flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-600" /> Organization Quota Utilization Brackets
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Distribution of employee quota burn rates across organization</p>
              </div>
            </div>
            <div className="h-72 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={quotaUtilizationDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                  >
                    {(quotaUtilizationDistribution || []).map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Global Organization Operational Roster Table */}
        <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0a2540]">Global Organization Policy Distribution</h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time quota pool breakdown across corporate tiers</p>
            </div>
            <span className="text-xs font-mono text-slate-400">{policyTierEnrollment.length} Active Tiers</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold tracking-wider uppercase text-[11px]">
                  <th className="py-3 px-5">Policy Tier Name</th>
                  <th className="py-3 px-4">Code Identifier</th>
                  <th className="py-3 px-4">Annual Limit Cap</th>
                  <th className="py-3 px-4">Enrolled Employees</th>
                  <th className="py-3 px-5 text-right">Committed Quota Pool</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {policyTierEnrollment.map((tier: any) => (
                  <tr key={tier.tierCode} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-5 font-bold text-[#0a2540]">{tier.tierName}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{tier.tierCode}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">${tier.annualLimit.toLocaleString()}</td>
                    <td className="py-3 px-4 font-bold text-[#00a88f]">{tier.enrolledCount} Members</td>
                    <td className="py-3 px-5 text-right font-mono font-black text-[#0a2540]">
                      ${(tier.annualLimit * tier.enrolledCount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================================
   * 5. SECURITY AUDITOR DASHBOARD (Security Posture, Audit Sentinel & Anomalies)
   * ========================================================================= */
  const renderSecurityAuditorDashboard = () => {
    if (!securityData) return null;

    const {
      totalLogsCount,
      privilegedOperationsCount,
      complianceScore,
      eventsByResource,
      privilegedOpsBreakdown,
      securityActivityTrend,
      recentLogs,
    } = securityData;

    return (
      <div className="space-y-6">
        {/* Header Telemetry Banner */}
        <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Security Governance & Compliance Sentinel
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0a2540] mt-1">
              Security Auditor Governance Console
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compliance posture telemetry, immutable audit stream, and privileged operation tracking.
            </p>
          </div>
        </div>

        {/* 4 Security KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Compliance Index</span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-600 font-mono tracking-tight flex items-baseline">
              {complianceScore}
              <span className="text-lg font-bold font-sans ml-1 text-emerald-600/80">%</span>
            </p>
            <p className="text-xs text-slate-500 mt-3 font-medium">Telemetry compliance score</p>
          </div>

          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Immutable Logs</span>
              <Shield className="h-4 w-4 text-[#0a2540]" />
            </div>
            <p className="text-2xl font-black text-[#0a2540] font-mono tracking-tight">{totalLogsCount}</p>
            <p className="text-xs text-slate-500 mt-3 font-medium">Total audit events recorded</p>
          </div>

          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Privileged Ops</span>
              <KeyRound className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-black text-indigo-600 font-mono tracking-tight">
              {privilegedOperationsCount}
            </p>
            <p className="text-xs text-slate-500 mt-3 font-medium">Admin & policy changes</p>
          </div>

          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Monitored Domains</span>
              <ShieldAlert className="h-4 w-4 text-[#00a88f]" />
            </div>
            <p className="text-2xl font-black text-[#00a88f] font-mono tracking-tight">{eventsByResource.length}</p>
            <p className="text-xs text-slate-500 mt-3 font-medium">Distinct audited resource categories</p>
          </div>
        </div>

        {/* Visual Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Audit Event Classification Donut */}
          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0a2540] flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#00a88f]" /> Audit Event Domain Classification
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Proportional breakdown of security telemetry logs</p>
              </div>
            </div>
            <div className="h-72 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={eventsByResource}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {eventsByResource.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Security Telemetry & Privileged Mutation Timeline */}
          <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0a2540] flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-600" /> Security Telemetry & Privileged Velocity
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">7-day audit volume vs high-privilege administrative actions</p>
              </div>
            </div>
            <div className="h-72">
              {securityActivityTrend && securityActivityTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={securityActivityTrend} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="totalAuditGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0a2540" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#0a2540" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="privMutationGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <Area
                      type="monotone"
                      dataKey="totalEvents"
                      name="Total Audit Events"
                      stroke="#0a2540"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#totalAuditGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="privilegedEvents"
                      name="Privileged Mutations"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#privMutationGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No security telemetry recorded for this timeframe.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Immutable Audit Sentinel Feed */}
        <div className="telemetry-card bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0a2540]">Live Immutable Security Event Stream</h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time immutable audit trail</p>
            </div>
            <span className="text-xs font-mono text-slate-400">Append-Only Active</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold tracking-wider uppercase text-[11px]">
                  <th className="py-3 px-5">Timestamp</th>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target Resource</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-5 text-right">Integrity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {recentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 font-sans">
                      Loading audit events...
                    </td>
                  </tr>
                ) : (
                  recentLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-5 text-slate-500 text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#0a2540]">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-sans font-medium">{log.actor}</td>
                      <td className="py-3 px-4 text-slate-600">{log.targetResource}</td>
                      <td className="py-3 px-4 text-slate-500">{log.ipAddress || '127.0.0.1'}</td>
                      <td className="py-3 px-5 text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-sans">
                          <CheckCircle2 className="h-3 w-3" /> Signed
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="space-y-6">
      {user?.role === UserRole.SYSTEM_ADMIN && renderSystemAdminDashboard()}
      {user?.role === UserRole.CLAIM_OFFICER && renderClaimOfficerDashboard()}
      {user?.role === UserRole.FINANCE_MANAGER && renderFinanceDashboard()}
      {user?.role === UserRole.SECURITY_AUDITOR && renderSecurityAuditorDashboard()}
      {(!user?.role || user?.role === UserRole.EMPLOYEE) && renderEmployeeDashboard()}

      {/* Claim Detail Modal for In-Place Inspection */}
      <Dialog open={!!selectedClaim} onOpenChange={(open) => !open && setSelectedClaim(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pr-6">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-sm font-bold text-[#0a2540]">
                Claim {selectedClaim?.claimNumber}
              </DialogTitle>
              {selectedClaim && getStatusBadge(selectedClaim.status)}
            </div>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4 text-xs mt-2">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                <div>
                  <span className="text-slate-400 font-medium">Healthcare Facility:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{selectedClaim.hospitalName}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Visit Date:</span>
                  <p className="font-semibold text-slate-900 mt-0.5 font-mono">
                    {new Date(selectedClaim.invoiceDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-2">
                  Itemized Invoice Details
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="p-2.5">Item Description</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedClaim.items.map((it: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-medium">{it.description}</td>
                          <td className="p-2.5 font-mono text-[11px]">{it.category}</td>
                          <td className="p-2.5 text-right font-mono font-semibold">
                            ${it.totalPrice.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actuarial Calculation Breakdown */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Billed Medical Cost:</span>
                  <span className="font-mono font-bold">${selectedClaim.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Deductible Absorbed:</span>
                  <span className="font-mono text-amber-700">-${selectedClaim.deductibleCovered.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-200">
                  <span className="text-[#0a2540]">Approved Corporate Subsidy:</span>
                  <span className="font-mono text-[#00a88f]">${selectedClaim.approvedAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

