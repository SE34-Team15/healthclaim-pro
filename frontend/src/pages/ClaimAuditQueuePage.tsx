import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';
import { ClaimResponseDto, ClaimStatus, ReceiptAttachmentDto } from '@healthclaim/shared';
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
  File,
  Image as ImageIcon,
  Download,
  Lock,
} from 'lucide-react';

export const ClaimAuditQueuePage: React.FC = () => {
  const [claims, setClaims] = useState<ClaimResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<ClaimResponseDto | null>(null);
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
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
            <Clock className="h-3 w-3" /> Submitted
          </span>
        );
    }
  };

  return (
    <div ref={containerRef} className="space-y-6 text-slate-900 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0a2540] flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-slate-700" />
            Claim Review & Audit Workbench
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspect automated AST compliance flags, verify encrypted receipts, and review reimbursement payouts.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:w-auto relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by claim number, employee email, or hospital name..."
            className="pl-9 h-9 text-xs"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full md:w-56">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value={ClaimStatus.FLAGGED_REVIEW}>Flagged for Review</SelectItem>
                <SelectItem value={ClaimStatus.AUTO_VALIDATED}>Auto-Validated</SelectItem>
                <SelectItem value={ClaimStatus.SUBMITTED}>Submitted</SelectItem>
                <SelectItem value={ClaimStatus.OFFICER_APPROVED}>Officer Approved</SelectItem>
                <SelectItem value={ClaimStatus.FINANCE_APPROVED}>Finance Approved</SelectItem>
                <SelectItem value={ClaimStatus.SETTLED}>Settled</SelectItem>
                <SelectItem value={ClaimStatus.OFFICER_REJECTED}>Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Claims Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
          Loading claims audit queue...
        </div>
      ) : claims.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
          <FileCheck2 className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">No claims in queue</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No medical claims match your current filter criteria.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="py-3.5 px-4">Claim Details</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Claimed / Approved</th>
                  <th className="py-3.5 px-4">Compliance Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900 text-xs">{claim.claimNumber}</div>
                      <p className="text-[11px] text-slate-500">{claim.hospitalName}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">
                        {claim.user?.firstName} {claim.user?.lastName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">{claim.user?.email}</p>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-[11px] text-slate-700">
                      {claim.category}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className="text-slate-500">${claim.totalAmount.toFixed(2)}</span>
                      <span className="text-slate-400 mx-1">→</span>
                      <span className="font-bold text-[#00a88f]">${claim.approvedAmount.toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(claim.status)}
                        {claim.attachments && claim.attachments.length > 0 && (
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" /> {claim.attachments.length} receipt{claim.attachments.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedClaim(claim)}
                        className="gap-1.5 text-xs h-7"
                      >
                        <Eye className="h-3.5 w-3.5" /> Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Claim Detail & Audit Modal */}
      <Dialog open={!!selectedClaim} onOpenChange={(open) => !open && setSelectedClaim(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pr-6">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#0a2540]">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              Claim Audit Detail: {selectedClaim?.claimNumber}
            </DialogTitle>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4 text-xs mt-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                <div>
                  <span className="text-slate-400 font-medium">Employee:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {selectedClaim.user?.firstName} {selectedClaim.user?.lastName}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">{selectedClaim.user?.email}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Provider & Grade:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{selectedClaim.hospitalName}</p>
                  <p className="text-[10px] text-indigo-600 font-mono font-bold">{selectedClaim.hospitalGrade}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Invoice Date:</span>
                  <p className="font-semibold text-slate-900 mt-0.5 font-mono">
                    {new Date(selectedClaim.invoiceDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Attached Encrypted Receipts */}
              {selectedClaim.attachments && selectedClaim.attachments.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-2 flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-indigo-600" /> Attached Medical Receipts (AES-256 Encrypted)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedClaim.attachments.map((att) => (
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

              {/* Compliance Rule Audit Results */}
              <div>
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-2">
                  Automated AST Compliance Evaluations
                </h4>
                <div className="space-y-2">
                  {selectedClaim.ruleEvaluations && selectedClaim.ruleEvaluations.length > 0 ? (
                    selectedClaim.ruleEvaluations.map((rule, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                          rule.isPassed
                            ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-950'
                            : 'bg-amber-50/60 border-amber-200 text-amber-950'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold flex items-center gap-2 text-xs">
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

      {/* Decrypted Receipt Preview Modal */}
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
