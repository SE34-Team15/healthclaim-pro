import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/client';
import { UserRole, ClaimResponseDto, ClaimStatus } from '@healthclaim/shared';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  CreditCard,
  Users,
  Layers,
  Shield,
  ArrowRight,
  Receipt,
  FileCheck2,
  FilePlus2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Building2,
  ChevronRight,
  Eye,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  const [claims, setClaims] = useState<ClaimResponseDto[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<ClaimResponseDto | null>(null);

  const quota = user?.activeQuota;
  const remaining = quota?.remainingBalance || 0;
  const total = quota?.annualLimit || 0;
  const spent = total - remaining;
  const progressPercent = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0;
  const remainingPercent = 100 - progressPercent;

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoadingClaims(true);
      try {
        if (user?.role === UserRole.EMPLOYEE) {
          const data = await apiClient.get<any, ClaimResponseDto[]>('/claims/my-claims');
          setClaims(data);
        } else if (
          user?.role === UserRole.CLAIM_OFFICER ||
          user?.role === UserRole.FINANCE_MANAGER ||
          user?.role === UserRole.SYSTEM_ADMIN
        ) {
          const data = await apiClient.get<any, ClaimResponseDto[]>('/claims');
          setClaims(data);
        }
      } catch (err: any) {
        // silently handled for dashboard summary
      } finally {
        setLoadingClaims(false);
      }
    };

    fetchDashboardData();
  }, [user?.role]);

  // Calculate actual approved payout YTD
  const ytdApprovedPayout = claims
    .filter(
      (c) =>
        c.status === ClaimStatus.AUTO_VALIDATED ||
        c.status === ClaimStatus.OFFICER_APPROVED ||
        c.status === ClaimStatus.FINANCE_APPROVED ||
        c.status === ClaimStatus.SETTLED,
    )
    .reduce((sum, c) => sum + (c.approvedAmount || 0), 0);

  const pendingClaimsCount = claims.filter(
    (c) => c.status === ClaimStatus.SUBMITTED || c.status === ClaimStatus.FLAGGED_REVIEW,
  ).length;

  const autoValidatedCount = claims.filter(
    (c) => c.status === ClaimStatus.AUTO_VALIDATED,
  ).length;

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
      case ClaimStatus.FINANCE_APPROVED:
      case ClaimStatus.SETTLED:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00a88f] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
            <ShieldCheck className="h-3 w-3" /> {status}
          </span>
        );
      case ClaimStatus.OFFICER_REJECTED:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
            <AlertCircle className="h-3 w-3" /> Rejected
          </span>
        );
      case ClaimStatus.SUBMITTED:
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
            <Clock className="h-3 w-3" /> Pending Review
          </span>
        );
    }
  };

  // Employee View
  const renderEmployeeView = () => (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0a2540]">
            Welcome, {user?.firstName} {user?.lastName}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Fiscal Year {currentYear} • Healthcare Plan: <span className="font-semibold text-slate-800">{quota?.benefitTier?.name || 'Corporate Standard Plan'}</span>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link to="/claims/submit">
            <Button className="gap-2 font-semibold">
              <FilePlus2 className="h-4 w-4" />
              <span>Submit Claim</span>
            </Button>
          </Link>
          <Link to="/claims/my-claims">
            <Button variant="outline" className="gap-2">
              <Receipt className="h-4 w-4" />
              <span>All Claims</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Professional KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Available Quota
          </span>
          <p className="text-2xl font-extrabold text-[#0a2540] tracking-tight font-mono mt-1.5">
            ${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-3">
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#00a88f] h-full rounded-full"
                style={{ width: `${remainingPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
              <span>{remainingPercent}% Remaining</span>
              <span>Limit: ${total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            YTD Reimbursed
          </span>
          <p className="text-2xl font-extrabold text-[#00a88f] tracking-tight font-mono mt-1.5">
            ${ytdApprovedPayout.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-3 font-medium">
            Approved insurance payouts
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Subsidy Co-Pay Rate
          </span>
          <p className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono mt-1.5">
            {((quota?.benefitTier?.defaultCoPayRate || 0.8) * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-slate-500 mt-3 font-medium">
            Corporate coverage share
          </p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Annual Deductible
          </span>
          <p className="text-2xl font-extrabold text-slate-900 tracking-tight font-mono mt-1.5">
            ${(quota?.benefitTier?.defaultDeductible || 100).toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-3 font-medium">
            Per-year policy deductible
          </p>
        </div>
      </div>

      {/* Embedded Recent Claims Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0a2540]">Recent Medical Claims</h3>
            <p className="text-xs text-slate-400 mt-0.5">Your latest submitted insurance claims</p>
          </div>
          <Link to="/claims/my-claims" className="text-xs font-semibold text-[#00a88f] hover:underline flex items-center gap-1">
            <span>View All</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold tracking-wider uppercase text-[11px]">
                <th className="py-3 px-5">Claim Number</th>
                <th className="py-3 px-4">Institution / Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Approved Payout</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingClaims ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Loading claims summary...
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No claims submitted yet. Click "Submit Claim" to submit your first receipt.
                  </td>
                </tr>
              ) : (
                claims.slice(0, 5).map((claim) => (
                  <tr
                    key={claim.id}
                    onClick={() => setSelectedClaim(claim)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-5 font-mono font-bold text-[#0a2540]">
                      {claim.claimNumber}
                    </td>
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
                    <td className="py-3 px-4">
                      {getStatusBadge(claim.status)}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <button className="p-1 text-slate-400 hover:text-slate-900">
                        <ChevronRight className="h-4 w-4" />
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

  // Claim Officer View
  const renderClaimOfficerView = () => (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0a2540]">
            Claim Officer Audit Console
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            First-line medical claim audit and AST compliance rule evaluations.
          </p>
        </div>
        <Link to="/admin/audit-queue">
          <Button className="gap-2 font-semibold">
            <FileCheck2 className="h-4 w-4" />
            <span>Open Audit Queue ({claims.length})</span>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Claims
          </span>
          <p className="text-2xl font-bold text-[#0a2540] mt-1.5 font-mono">{claims.length}</p>
          <p className="text-xs text-slate-500 mt-2">All incoming claims in scope</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Auto-Validated
          </span>
          <p className="text-2xl font-bold text-[#00a88f] mt-1.5 font-mono">{autoValidatedCount}</p>
          <p className="text-xs text-slate-500 mt-2">Passed all AST compliance rules</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Flagged for Review
          </span>
          <p className="text-2xl font-bold text-amber-600 mt-1.5 font-mono">{pendingClaimsCount}</p>
          <p className="text-xs text-slate-500 mt-2">Rule anomalies requiring inspection</p>
        </div>
      </div>

      {/* Claims Queue Stream */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0a2540]">Recent Claims Queue</h3>
            <p className="text-xs text-slate-400 mt-0.5">Incoming claims awaiting officer review</p>
          </div>
          <Link to="/admin/audit-queue" className="text-xs font-semibold text-[#00a88f] hover:underline flex items-center gap-1">
            <span>View Full Queue</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold tracking-wider uppercase text-[11px]">
                <th className="py-3 px-5">Claim Number</th>
                <th className="py-3 px-4">Applicant</th>
                <th className="py-3 px-4">Hospital / Grade</th>
                <th className="py-3 px-4">Amount / Payout</th>
                <th className="py-3 px-4">Audit Status</th>
                <th className="py-3 px-5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {claims.slice(0, 5).map((claim) => (
                <tr key={claim.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-5 font-mono font-bold text-[#0a2540]">{claim.claimNumber}</td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">{claim.user?.firstName} {claim.user?.lastName}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{claim.user?.email}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">{claim.hospitalName}</p>
                    <span className="text-[10px] font-mono text-slate-500">{claim.hospitalGrade || 'GRADE_A'}</span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-[#00a88f]">
                    ${claim.approvedAmount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(claim.status)}</td>
                  <td className="py-3 px-5 text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelectedClaim(claim)} className="h-7 text-xs gap-1">
                      <Eye className="h-3 w-3" /> Inspect
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Finance Manager View
  const renderFinanceView = () => (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0a2540]">
            Financial Settlement Console
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Authorize medical claims reimbursements and track fiscal year disbursements.
          </p>
        </div>
        <Link to="/admin/audit-queue">
          <Button className="gap-2 font-semibold">
            <Receipt className="h-4 w-4" />
            <span>Settlement Queue</span>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Approved Payouts
          </span>
          <p className="text-2xl font-bold text-[#00a88f] mt-1.5 font-mono">
            ${ytdApprovedPayout.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-2">Cumulative disbursements YTD</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Settlement Queue
          </span>
          <p className="text-2xl font-bold text-[#0a2540] mt-1.5 font-mono">{claims.length}</p>
          <p className="text-xs text-slate-500 mt-2">Invoices in fiscal workflow</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Fiscal Period
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1.5 font-mono">{currentYear}</p>
          <p className="text-xs text-slate-500 mt-2">Active corporate fiscal calendar</p>
        </div>
      </div>
    </div>
  );

  // System Admin View
  const renderAdminView = () => (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0a2540]">
          System Administrator Hub
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Manage enterprise users, benefit policy tiers, audit queues, and review system events.
        </p>
        <div className="flex flex-wrap gap-2.5 mt-5">
          <Link to="/admin/audit-queue">
            <Button size="sm" className="gap-1.5">
              <FileCheck2 className="h-4 w-4" /> Claims Queue
            </Button>
          </Link>
          <Link to="/admin/users">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Users className="h-4 w-4" /> User Directory
            </Button>
          </Link>
          <Link to="/admin/policies">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Layers className="h-4 w-4" /> Benefit Tiers
            </Button>
          </Link>
          <Link to="/audit-logs">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Shield className="h-4 w-4" /> Audit Trails
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Claims Logged
          </span>
          <p className="text-2xl font-bold text-[#0a2540] mt-1.5 font-mono">{claims.length}</p>
          <p className="text-xs text-slate-500 mt-1">Recorded in database</p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Enterprise RBAC
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1.5 font-mono">5 Roles</p>
          <p className="text-xs text-slate-500 mt-1">Active role-based permissions</p>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Compliance Engine
          </span>
          <p className="text-2xl font-bold text-[#00a88f] mt-1.5 font-mono">Active</p>
          <p className="text-xs text-slate-500 mt-1">AST Composite Specification</p>
        </div>
      </div>
    </div>
  );

  // Security Auditor View
  const renderAuditorView = () => (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0a2540]">
          Audit Governance Console
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Inspect immutable system event logs and authentication activities.
        </p>
        <div className="mt-5">
          <Link to="/audit-logs">
            <Button className="gap-2">
              <Shield className="h-4 w-4" />
              <span>Inspect Audit Logs</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {user?.role === UserRole.SYSTEM_ADMIN && renderAdminView()}
      {user?.role === UserRole.CLAIM_OFFICER && renderClaimOfficerView()}
      {user?.role === UserRole.FINANCE_MANAGER && renderFinanceView()}
      {user?.role === UserRole.SECURITY_AUDITOR && renderAuditorView()}
      {(!user?.role || user?.role === UserRole.EMPLOYEE) && renderEmployeeView()}

      {/* Claim Detail Modal */}
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
                  <span className="text-slate-400 font-medium">Institution:</span>
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
                  Invoice Items
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedClaim.items.map((it, idx) => (
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

              {/* Actuarial Calculation */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Claim Amount:</span>
                  <span className="font-mono font-bold">${selectedClaim.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Deductible Covered:</span>
                  <span className="font-mono text-amber-700">-${selectedClaim.deductibleCovered.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-200">
                  <span className="text-[#0a2540]">Approved Reimbursement:</span>
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
