import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';
import { ClaimResponseDto, ClaimStatus } from '@healthclaim/shared';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { animatePageEntrance } from '../lib/animation';
import {
  FileCheck2,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Eye,
  Filter,
} from 'lucide-react';

export const ClaimAuditQueuePage: React.FC = () => {
  const [claims, setClaims] = useState<ClaimResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<ClaimResponseDto | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search) params.append('search', search);

      const data = await apiClient.get<any, ClaimResponseDto[]>(`/claims?${params.toString()}`);
      setClaims(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load claims queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [statusFilter]);

  useEffect(() => {
    if (containerRef.current && !loading) {
      animatePageEntrance(containerRef.current);
    }
  }, [loading]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClaims();
  };

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

  return (
    <div ref={containerRef} className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 anim-header">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0a2540] flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-slate-700" />
            Claim Audit Queue
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review incoming claims and automated compliance evaluations.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between anim-card">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full sm:w-auto">
          <Search className="h-4 w-4 absolute left-3.5 top-2.5 text-slate-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by claim number, hospital, or email..."
            className="pl-9"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Status:</span>
          <div className="w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value={ClaimStatus.AUTO_VALIDATED}>Auto-Validated</SelectItem>
                <SelectItem value={ClaimStatus.FLAGGED_REVIEW}>Flagged</SelectItem>
                <SelectItem value={ClaimStatus.OFFICER_APPROVED}>Approved</SelectItem>
                <SelectItem value={ClaimStatus.OFFICER_REJECTED}>Rejected</SelectItem>
                <SelectItem value={ClaimStatus.SETTLED}>Settled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden anim-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold tracking-wider uppercase text-[11px]">
                <th className="py-3.5 px-5">Claim Number</th>
                <th className="py-3.5 px-4">Applicant</th>
                <th className="py-3.5 px-4">Hospital / Grade</th>
                <th className="py-3.5 px-4">Claimed / Payout</th>
                <th className="py-3.5 px-4">Audit Status</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Loading queue...
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No claims pending in the audit queue.
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                    <td className="py-3.5 px-5 font-mono font-bold text-[#0a2540]">
                      {claim.claimNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">
                        {claim.user?.firstName} {claim.user?.lastName}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">{claim.user?.email}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{claim.hospitalName}</p>
                      <span className="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {claim.hospitalGrade || 'GRADE_A'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-mono font-bold text-[#00a88f] text-sm">
                        ${claim.approvedAmount.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Total: ${claim.totalAmount.toFixed(2)}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(claim.status)}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedClaim(claim)}
                        className="gap-1.5 h-8"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Inspect</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Inspection Dialog */}
      <Dialog open={!!selectedClaim} onOpenChange={(open) => !open && setSelectedClaim(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="pr-6">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-sm font-bold text-[#0a2540]">
                Claim Audit: {selectedClaim?.claimNumber}
              </DialogTitle>
              {selectedClaim && getStatusBadge(selectedClaim.status)}
            </div>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4 text-xs mt-2">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                <div>
                  <span className="text-slate-400 font-medium">Applicant:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {selectedClaim.user?.firstName} {selectedClaim.user?.lastName} ({selectedClaim.user?.email})
                  </p>
                  <p className="text-[11px] text-slate-500">{selectedClaim.user?.department || 'General Enterprise'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Hospital & Grade:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{selectedClaim.hospitalName}</p>
                  <p className="text-[11px] text-slate-500 font-mono">Grade: {selectedClaim.hospitalGrade || 'GRADE_A'}</p>
                </div>
              </div>

              {/* AST Rule Evaluation Results */}
              <div>
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#00a88f]" /> Compliance Rule Evaluations
                </h4>
                <div className="space-y-2">
                  {selectedClaim.ruleEvaluations && selectedClaim.ruleEvaluations.length > 0 ? (
                    selectedClaim.ruleEvaluations.map((rule, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-start justify-between ${
                          rule.isPassed
                            ? 'bg-emerald-50/60 border-emerald-200/60 text-emerald-950'
                            : 'bg-amber-50/60 border-amber-200/60 text-amber-950'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 font-bold">
                            {rule.isPassed ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                            )}
                            <span>{rule.ruleName}</span>
                          </div>
                          {!rule.isPassed && rule.reason && (
                            <p className="text-[11px] text-amber-800 pl-6 leading-relaxed">
                              {rule.reason}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-white/80 border border-current shrink-0">
                          {rule.isPassed ? 'Passed' : 'Flagged'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-slate-400 bg-slate-50 rounded-xl border">
                      No automated rule evaluations recorded.
                    </div>
                  )}
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

              {/* Actuarial Calculation Breakdown */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Claimed:</span>
                  <span className="font-mono font-bold">${selectedClaim.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Deductible Absorbed:</span>
                  <span className="font-mono text-amber-700">-${selectedClaim.deductibleCovered.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-200">
                  <span className="text-[#0a2540]">Approved Payout:</span>
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
