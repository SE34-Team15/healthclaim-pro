import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { ClaimResponseDto, ClaimStatus, ReceiptAttachmentDto } from '@healthclaim/shared';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
  File,
  Image as ImageIcon,
  Eye,
  Download,
  Lock,
  Archive,
  Check,
  X,
  FileX2,
} from 'lucide-react';

export const MyClaimsPage: React.FC = () => {
  const [claims, setClaims] = useState<ClaimResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<ClaimResponseDto | null>(null);
  const [cancellingClaim, setCancellingClaim] = useState<ClaimResponseDto | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [previewingAttachment, setPreviewingAttachment] = useState<{
    id: string;
    fileName: string;
    mimeType: string;
    blobUrl?: string;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any, ClaimResponseDto[]>('/claims/my-claims');
      setClaims(data);
      if (selectedClaim) {
        const updated = data.find((c) => c.id === selectedClaim.id);
        if (updated) setSelectedClaim(updated);
      }
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

  const handleWithdrawClaim = async () => {
    if (!cancellingClaim) return;
    setCancelling(true);
    try {
      const updated = await apiClient.post<any, ClaimResponseDto>(
        `/claims/${cancellingClaim.id}/transition`,
        {
          targetStatus: ClaimStatus.CANCELLED,
          reason: cancelReason.trim() || 'Withdrawn by employee',
        },
      );
      toast.success('Claim application successfully withdrawn.');
      setSelectedClaim(updated);
      setCancellingClaim(null);
      setCancelReason('');
      await fetchClaims();
    } catch (err: any) {
      toast.error(err.message || 'Failed to withdraw claim');
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenAttachmentPreview = async (attachment: ReceiptAttachmentDto) => {
    const token = localStorage.getItem('healthclaim_token');
    try {
      const res = await fetch(`/api/v1/attachments/${attachment.id}/preview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to decrypt attachment preview');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreviewingAttachment({
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        blobUrl,
      });
    } catch (err: any) {
      toast.error(err.message || 'Could not decrypt preview');
    }
  };

  const handleDownloadAttachment = async (attachment: ReceiptAttachmentDto) => {
    const token = localStorage.getItem('healthclaim_token');
    try {
      const res = await fetch(`/api/v1/attachments/${attachment.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to download attachment');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Downloaded '${attachment.fileName}'`);
    } catch (err: any) {
      toast.error(err.message || 'Download failed');
    }
  };

  const handleClosePreview = () => {
    if (previewingAttachment?.blobUrl) {
      URL.revokeObjectURL(previewingAttachment.blobUrl);
    }
    setPreviewingAttachment(null);
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
            <AlertCircle className="h-3 w-3" /> Under Review
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
            <ShieldCheck className="h-3 w-3" /> Settled & Paid
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
            <Archive className="h-3 w-3" /> Withdrawn / Void
          </span>
        );
      case ClaimStatus.SUBMITTED:
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
            <Clock className="h-3 w-3" /> Submitted
          </span>
        );
    }
  };

  const renderProgressSteps = (status: ClaimStatus) => {
    const isRejected = status === ClaimStatus.OFFICER_REJECTED;
    const isCancelled = status === ClaimStatus.CANCELLED;

    if (isRejected || isCancelled) {
      return (
        <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
          isRejected ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-slate-100 border-slate-200 text-slate-700'
        }`}>
          {isRejected ? <FileX2 className="h-4 w-4 text-rose-600 shrink-0" /> : <Archive className="h-4 w-4 text-slate-500 shrink-0" />}
          <div>
            <span>{isRejected ? 'Claim Rejected by Review Officer' : 'Claim Withdrawn / Cancelled'}</span>
            {selectedClaim?.statusReason && (
              <p className="text-[11px] font-normal text-slate-600 mt-0.5">
                Remarks: {selectedClaim.statusReason}
              </p>
            )}
          </div>
        </div>
      );
    }

    const steps = [
      { id: 'submitted', label: '1. Submitted', active: true },
      {
        id: 'officer',
        label: '2. Officer Review',
        active: [
          ClaimStatus.OFFICER_APPROVED,
          ClaimStatus.FINANCE_APPROVED,
          ClaimStatus.SETTLED,
        ].includes(status),
      },
      {
        id: 'finance',
        label: '3. Finance Check',
        active: [ClaimStatus.FINANCE_APPROVED, ClaimStatus.SETTLED].includes(status),
      },
      {
        id: 'settled',
        label: '4. Disbursed',
        active: status === ClaimStatus.SETTLED,
      },
    ];

    return (
      <div className="grid grid-cols-4 gap-1 p-2 bg-slate-50 rounded-xl border border-slate-200/80 text-center text-[10px] font-semibold">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className={`py-1.5 px-1 rounded-lg flex items-center justify-center gap-1 transition-colors ${
              step.active
                ? 'bg-white text-[#0a2540] shadow-2xs font-bold border border-slate-200/60'
                : 'text-slate-400'
            }`}
          >
            {step.active && <Check className="h-3 w-3 text-emerald-600" />}
            <span className="truncate">{step.label}</span>
          </div>
        ))}
      </div>
    );
  };

  const isWithdrawable =
    selectedClaim &&
    [ClaimStatus.SUBMITTED, ClaimStatus.AUTO_VALIDATED, ClaimStatus.FLAGGED_REVIEW].includes(
      selectedClaim.status,
    );

  return (
    <div ref={containerRef} className="space-y-6 text-slate-900 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0a2540] flex items-center gap-2">
            <Receipt className="h-5 w-5 text-slate-700" />
            My Reimbursement Claims
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track real-time approval states, actuarial deduction summaries, and encrypted invoices.
          </p>
        </div>

        <Button asChild size="sm" className="gap-2 font-semibold shadow-xs">
          <Link to="/claims/submit">
            <FilePlus2 className="h-4 w-4" /> File New Claim
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
          Loading your reimbursement records...
        </div>
      ) : claims.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
          <Receipt className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">No claims submitted yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You have not submitted any medical claims for the current fiscal year.
          </p>
          <Button asChild size="sm" variant="outline" className="mt-2">
            <Link to="/claims/submit">Submit First Claim</Link>
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {claims.map((claim) => (
              <div
                key={claim.id}
                onClick={() => setSelectedClaim(claim)}
                className="p-5 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-bold text-xs text-[#0a2540]">
                      {claim.claimNumber}
                    </span>
                    {getStatusBadge(claim.status)}
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                      {claim.category}
                    </span>
                    {claim.attachments && claim.attachments.length > 0 && (
                      <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Lock className="h-2.5 w-2.5" /> {claim.attachments.length} receipt{claim.attachments.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    {claim.hospitalName} • Invoice Date: {new Date(claim.invoiceDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-6 self-end md:self-center">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Claimed / Approved</span>
                    <span className="font-mono text-xs text-slate-500">
                      ${claim.totalAmount.toFixed(2)} →{' '}
                      <strong className="text-sm font-bold text-[#00a88f] text-slate-900">
                        ${claim.approvedAmount.toFixed(2)}
                      </strong>
                    </span>
                  </div>

                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claim Detail Modal */}
      <Dialog open={!!selectedClaim} onOpenChange={(open) => !open && setSelectedClaim(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pr-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#0a2540]">
                <Receipt className="h-5 w-5 text-indigo-600" />
                Claim Voucher: {selectedClaim?.claimNumber}
              </DialogTitle>
              {selectedClaim && getStatusBadge(selectedClaim.status)}
            </div>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4 text-xs mt-2">
              {/* Lifecycle Progress Bar */}
              {renderProgressSteps(selectedClaim.status)}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                <div>
                  <span className="text-slate-400 font-medium">Category:</span>
                  <p className="font-semibold text-slate-900 mt-0.5 font-mono">{selectedClaim.category}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Provider & Grade:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{selectedClaim.hospitalName}</p>
                  <span className="text-[10px] text-indigo-600 font-mono font-bold">{selectedClaim.hospitalGrade}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Visit Date:</span>
                  <p className="font-semibold text-slate-900 mt-0.5 font-mono">
                    {new Date(selectedClaim.invoiceDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Withdraw Application Action (if still pre-review) */}
              {isWithdrawable && (
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-amber-900">Need to cancel or edit this submission?</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      You can withdraw this claim before officer review begins.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCancellingClaim(selectedClaim);
                      setCancelReason('');
                    }}
                    className="border-amber-300 text-amber-900 hover:bg-amber-100 h-8 text-xs font-semibold shrink-0"
                  >
                    Withdraw Claim
                  </Button>
                </div>
              )}

              {/* Attached Receipts */}
              {selectedClaim.attachments && selectedClaim.attachments.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="h-3 w-3 text-slate-500" /> Attached Medical Receipts
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-normal normal-case">
                      End-to-End Encrypted
                    </span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedClaim.attachments.map((att: any) => (
                      <div
                        key={att.id}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {att.mimeType.includes('pdf') ? (
                            <File className="h-4 w-4 text-rose-500 shrink-0" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-indigo-500 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate" title={att.fileName}>
                              {att.fileName}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {(att.fileSize / 1024).toFixed(0)} KB
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenAttachmentPreview(att)}
                            className="h-7 px-2 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50"
                          >
                            <Eye className="h-3 w-3 mr-1" /> View
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadAttachment(att)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                            title="Download file"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

      {/* Withdraw Application Prompt Modal */}
      <Dialog open={!!cancellingClaim} onOpenChange={(open) => !open && setCancellingClaim(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Archive className="h-4 w-4 text-amber-600" />
              Withdraw Claim Application
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs mt-2">
            <p className="text-slate-600 leading-relaxed">
              Are you sure you want to withdraw claim <strong>{cancellingClaim?.claimNumber}</strong>?
              This will void the application.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Withdrawal (Optional)
              </label>
              <Input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Attached incorrect receipt / Claimed via other channel"
                className="h-9 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancellingClaim(null)}
                className="text-xs h-8"
              >
                Keep Claim
              </Button>
              <Button
                size="sm"
                onClick={handleWithdrawClaim}
                disabled={cancelling}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-8"
              >
                {cancelling ? 'Withdrawing...' : 'Confirm Withdrawal'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attachment Decrypted Preview Modal */}
      <Dialog open={!!previewingAttachment} onOpenChange={(open) => !open && handleClosePreview()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="pr-6">
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Decrypted Receipt: {previewingAttachment?.fileName}
            </DialogTitle>
          </DialogHeader>

          {previewingAttachment?.blobUrl && (
            <div className="p-2 rounded-xl bg-slate-900/5 flex items-center justify-center max-h-[70vh] overflow-auto">
              {previewingAttachment.mimeType.includes('pdf') ? (
                <iframe
                  src={previewingAttachment.blobUrl}
                  title={previewingAttachment.fileName}
                  className="w-full h-[65vh] rounded-lg border-0"
                />
              ) : (
                <img
                  src={previewingAttachment.blobUrl}
                  alt={previewingAttachment.fileName}
                  className="max-w-full max-h-[65vh] rounded-lg object-contain shadow-md"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
