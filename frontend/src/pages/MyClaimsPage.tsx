import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { ClaimResponseDto, ClaimStatus } from '@healthclaim/shared';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { animatePageEntrance } from '../lib/animation';
import {
  Receipt,
  FilePlus2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const MyClaimsPage: React.FC = () => {
  const [claims, setClaims] = useState<ClaimResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<ClaimResponseDto | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any, ClaimResponseDto[]>('/claims/my-claims');
      setClaims(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch personal claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  useEffect(() => {
    if (containerRef.current && !loading) {
      animatePageEntrance(containerRef.current);
    }
  }, [loading]);

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
            <AlertCircle className="h-3 w-3" /> Flagged for Review
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 anim-header">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0a2540] flex items-center gap-2">
            <Receipt className="h-5 w-5 text-slate-700" />
            Medical Claims History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track submitted reimbursement requests and payout status.
          </p>
        </div>

        <Link to="/claims/submit">
          <Button className="gap-2">
            <FilePlus2 className="h-4 w-4" />
            <span>Submit New Claim</span>
          </Button>
        </Link>
      </div>

      {/* Claims Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden anim-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold tracking-wider uppercase text-[11px]">
                <th className="py-3.5 px-5">Claim Number</th>
                <th className="py-3.5 px-4">Institution / Date</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Claimed / Approved</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Loading claims...
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No medical claims submitted yet.
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr
                    key={claim.id}
                    className="hover:bg-slate-50/80 transition-colors duration-150 cursor-pointer group"
                    onClick={() => setSelectedClaim(claim)}
                  >
                    <td className="py-3.5 px-5 font-mono font-bold text-[#0a2540]">
                      {claim.claimNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{claim.hospitalName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {new Date(claim.invoiceDate).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {claim.category}
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
                      <button className="p-1 text-slate-400 group-hover:text-[#0a2540] transition-colors">
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

      {/* Claim Detail Dialog */}
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

              {/* Line Items */}
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
                        <th className="p-2.5 text-right">Total Price</th>
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
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Claim Amount:</span>
                  <span className="font-mono font-bold">${selectedClaim.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Deductible Absorbed:</span>
                  <span className="font-mono text-amber-700">-${selectedClaim.deductibleCovered.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Co-Pay Coverage Rate:</span>
                  <span className="font-mono font-semibold text-[#00a88f]">
                    {(selectedClaim.coPayRate * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm">
                  <span className="text-[#0a2540]">Approved Insurance Payout:</span>
                  <span className="font-mono text-[#00a88f]">${selectedClaim.approvedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Employee Out-of-Pocket:</span>
                  <span className="font-mono">${selectedClaim.outOfPocketAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
