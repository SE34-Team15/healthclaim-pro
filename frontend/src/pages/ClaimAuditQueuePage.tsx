import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/client';
import {
  ClaimResponseDto,
  ClaimStatus,
  UserRole,
  ReceiptAttachmentDto,
} from '@healthclaim/shared';
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
  Check,
  X,
  Archive,
  Trash2,
  DollarSign,
  AlertTriangle,
  FileX2,
  Zap,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const ClaimAuditQueuePage: React.FC = () => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<ClaimResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<ClaimResponseDto | null>(null);
  
  // Transition Action Dialog States
  const [actionDialog, setActionDialog] = useState<{
    type: 'REJECT' | 'CANCEL' | 'PURGE';
    claim: ClaimResponseDto;
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // Decrypted Preview Modal
  const [previewingAttachment, setPreviewingAttachment] = useState<{
    id: string;
    fileName: string;
    mimeType: string;
    blobUrl?: string;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Role-Specific Quick Tabs configuration
  const isFinanceUser = user?.role === UserRole.FINANCE_MANAGER;
  const isOfficerUser = user?.role === UserRole.CLAIM_OFFICER;

  const roleTabs = useMemo(() => {
    if (isFinanceUser) {
      return [
        {
          id: 'PENDING_MY_ACTION',
          label: 'Pending Finance Settlement',
          icon: Zap,
          statusQuery: `${ClaimStatus.OFFICER_APPROVED},${ClaimStatus.FINANCE_APPROVED}`,
          description: 'Approved claims ready for disbursement',
        },
        {
          id: 'SETTLED',
          label: 'Disbursed & Paid',
          icon: CheckCircle2,
          statusQuery: ClaimStatus.SETTLED,
          description: 'Completed disbursements',
        },
        {
          id: 'ALL',
          label: 'All Financial Ledger',
          icon: Layers,
          statusQuery: 'ALL',
          description: 'Complete cross-stage archive',
        },
      ];
    }

    if (isOfficerUser) {
      return [
        {
          id: 'PENDING_MY_ACTION',
          label: 'Pending Officer Review',
          icon: Zap,
          statusQuery: `${ClaimStatus.FLAGGED_REVIEW},${ClaimStatus.AUTO_VALIDATED},${ClaimStatus.SUBMITTED}`,
          description: 'New submissions & flagged compliance anomalies',
        },
        {
          id: 'APPROVED',
          label: 'Officer Approved',
          icon: CheckCircle2,
          statusQuery: `${ClaimStatus.OFFICER_APPROVED},${ClaimStatus.FINANCE_APPROVED},${ClaimStatus.SETTLED}`,
          description: 'Passed to finance pipeline',
        },
        {
          id: 'REJECTED',
          label: 'Rejected & Void',
          icon: AlertCircle,
          statusQuery: `${ClaimStatus.OFFICER_REJECTED},${ClaimStatus.CANCELLED}`,
          description: 'Ineligible or employee-withdrawn claims',
        },
        {
          id: 'ALL',
          label: 'All Claims',
          icon: Layers,
          statusQuery: 'ALL',
          description: 'Global claims repository',
        },
      ];
    }

    // Default / Admin / Auditor
    return [
      {
        id: 'PENDING_MY_ACTION',
        label: 'Action Required',
        icon: Zap,
        statusQuery: `${ClaimStatus.FLAGGED_REVIEW},${ClaimStatus.AUTO_VALIDATED},${ClaimStatus.OFFICER_APPROVED}`,
        description: 'Claims requiring reviewer attention',
      },
      {
        id: 'SETTLED',
        label: 'Settled & Paid',
        icon: CheckCircle2,
        statusQuery: ClaimStatus.SETTLED,
        description: 'Completed payout archive',
      },
      {
        id: 'ALL',
        label: 'All Claims',
        icon: Layers,
        statusQuery: 'ALL',
        description: 'Global claims repository',
      },
    ];
  }, [user?.role]);

  const [activeTabId, setActiveTabId] = useState<string>('PENDING_MY_ACTION');
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const offset = direction === 'left' ? -220 : 220;
      tabsContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkScroll, 300);
    }
  };

  const fetchClaims = async (tabId = activeTabId, customStatus = statusFilter) => {
    setLoading(true);
    try {
      const activeTab = roleTabs.find((t) => t.id === tabId) || roleTabs[0];
      const params = new URLSearchParams();

      if (customStatus && customStatus !== 'ALL') {
        params.append('status', customStatus);
      } else if (activeTab && activeTab.statusQuery !== 'ALL') {
        params.append('status', activeTab.statusQuery);
      }

      if (search.trim()) params.append('search', search.trim());

      const data = await apiClient.get<any, ClaimResponseDto[]>(`/claims?${params.toString()}`);
      setClaims(data);
      if (selectedClaim) {
        const updated = data.find((c) => c.id === selectedClaim.id);
        if (updated) setSelectedClaim(updated);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load claims queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims(activeTabId, statusFilter);
  }, [activeTabId, statusFilter]);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [roleTabs, claims]);

  useEffect(() => {
    if (containerRef.current && !loading) {
      animatePageEntrance(containerRef.current);
    }
  }, [loading]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClaims(activeTabId, statusFilter);
  };

  // State Machine Transition Handler
  const handleTransition = async (targetStatus: ClaimStatus, reason?: string) => {
    if (!selectedClaim) return;
    setProcessingAction(true);
    try {
      const updated = await apiClient.post<any, ClaimResponseDto>(
        `/claims/${selectedClaim.id}/transition`,
        {
          targetStatus,
          reason,
        },
      );
      toast.success(`Claim status updated to '${targetStatus}'.`);
      setSelectedClaim(updated);
      setActionDialog(null);
      setActionReason('');
      await fetchClaims();
    } catch (err: any) {
      toast.error(err.message || 'Status transition failed');
    } finally {
      setProcessingAction(false);
    }
  };

  // Super Admin Force Purge Handler (DB + Physical Storage Cascade)
  const handleForcePurge = async () => {
    if (!actionDialog || actionDialog.type !== 'PURGE') return;
    setProcessingAction(true);
    try {
      const res = await apiClient.delete<any, any>(`/claims/${actionDialog.claim.id}/force-purge`);
      toast.success(res.message || 'Claim and encrypted receipts purged permanently.');
      setSelectedClaim(null);
      setActionDialog(null);
      await fetchClaims();
    } catch (err: any) {
      toast.error(err.message || 'Force purge failed');
    } finally {
      setProcessingAction(false);
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
            <AlertCircle className="h-3 w-3" /> Flagged Review
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
            <DollarSign className="h-3 w-3" /> Finance Approved
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
            <Archive className="h-3 w-3" /> Archived / Void
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

  // Status Progression Step Indicator
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
            <span>{isRejected ? 'Claim Officially Rejected' : 'Claim Archived / Cancelled'}</span>
            {selectedClaim?.statusReason && (
              <p className="text-[11px] font-normal text-slate-600 mt-0.5">
                Reason: {selectedClaim.statusReason}
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

  const isOfficer = user?.role === UserRole.CLAIM_OFFICER || user?.role === UserRole.SYSTEM_ADMIN;
  const isFinance = user?.role === UserRole.FINANCE_MANAGER || user?.role === UserRole.SYSTEM_ADMIN;
  const isAdmin = user?.role === UserRole.SYSTEM_ADMIN;

  return (
    <div ref={containerRef} className="space-y-6 text-slate-900 max-w-6xl mx-auto">
      {/* Row 1: Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[#0a2540] flex items-center gap-2">
          <FileCheck2 className="h-5 w-5 text-slate-700" />
          Claim Review & Audit Workbench
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Inspect AST compliance flags, verify encrypted receipts, execute multi-stage approvals, and disburse payouts.
        </p>
      </div>

      {/* Row 2: Dedicated Encompassing Segmented Track with Left/Right Arrow Navigation */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => scrollTabs('left')}
          disabled={!canScrollLeft}
          className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white/80 disabled:opacity-20 disabled:hover:bg-transparent transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
          title="Scroll Left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div
          ref={tabsContainerRef}
          onScroll={checkScroll}
          className="flex-1 flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden scroll-smooth py-0.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {roleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTabId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTabId(tab.id);
                  setStatusFilter('ALL');
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all select-none whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#0a2540] shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
                }`}
                title={tab.description}
              >
                <Icon
                  className={`h-3.5 w-3.5 ${
                    isActive
                      ? tab.id === 'PENDING_MY_ACTION'
                        ? 'text-amber-500 fill-amber-500/20'
                        : 'text-[#00a88f]'
                      : 'text-slate-400'
                  }`}
                />
                <span>{tab.label}</span>
                {isActive && (
                  <span className="ml-1 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700">
                    {claims.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollTabs('right')}
          disabled={!canScrollRight}
          className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white/80 disabled:opacity-20 disabled:hover:bg-transparent transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
          title="Scroll Right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
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
          <div className="flex items-center gap-2 w-full md:w-60">
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
                <SelectItem value={ClaimStatus.SETTLED}>Settled & Paid</SelectItem>
                <SelectItem value={ClaimStatus.OFFICER_REJECTED}>Rejected</SelectItem>
                <SelectItem value={ClaimStatus.CANCELLED}>Archived / Void</SelectItem>
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
                  <th className="py-3.5 px-4">Lifecycle Status</th>
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
                        className="gap-1.5 text-xs h-7 font-semibold"
                      >
                        <Eye className="h-3.5 w-3.5" /> Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Claim Detail & Review Action Workbench Modal */}
      <Dialog open={!!selectedClaim} onOpenChange={(open) => !open && setSelectedClaim(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pr-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#0a2540]">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                Claim Audit Workbench: {selectedClaim?.claimNumber}
              </DialogTitle>
              {selectedClaim && getStatusBadge(selectedClaim.status)}
            </div>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-4 text-xs mt-2">
              {/* Lifecycle Step Progression Bar */}
              {renderProgressSteps(selectedClaim.status)}

              {/* General Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                <div>
                  <span className="text-slate-400 font-medium">Applicant:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {selectedClaim.user?.firstName} {selectedClaim.user?.lastName}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">{selectedClaim.user?.email}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Provider & Grade:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{selectedClaim.hospitalName}</p>
                  <span className="text-[10px] text-indigo-600 font-mono font-bold">{selectedClaim.hospitalGrade}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Category & Date:</span>
                  <p className="font-semibold text-slate-900 mt-0.5 font-mono text-[11px]">
                    {selectedClaim.category}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {new Date(selectedClaim.invoiceDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Action Decision Suite */}
              <div className="p-4 bg-white rounded-xl border-2 border-indigo-100 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2 uppercase tracking-wider">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" /> Audit Action Bar
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Role: <strong className="text-indigo-600">{user?.role}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {/* Officer Actions for Initial Stage */}
                  {[ClaimStatus.SUBMITTED, ClaimStatus.AUTO_VALIDATED, ClaimStatus.FLAGGED_REVIEW].includes(selectedClaim.status) && isOfficer && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleTransition(ClaimStatus.OFFICER_APPROVED)}
                        disabled={processingAction}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 gap-1.5"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve Claim
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setActionDialog({ type: 'REJECT', claim: selectedClaim });
                          setActionReason('');
                        }}
                        disabled={processingAction}
                        className="border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs h-8 gap-1.5"
                      >
                        <X className="h-3.5 w-3.5" /> Reject Claim
                      </Button>
                    </>
                  )}

                  {/* Finance Actions for Officer Approved Stage */}
                  {selectedClaim.status === ClaimStatus.OFFICER_APPROVED && isFinance && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleTransition(ClaimStatus.FINANCE_APPROVED)}
                        disabled={processingAction}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs h-8 gap-1.5"
                      >
                        <DollarSign className="h-3.5 w-3.5" /> Finance Verify
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleTransition(ClaimStatus.SETTLED, 'Fast-track settlement by Finance')}
                        disabled={processingAction}
                        className="bg-[#00a88f] hover:bg-[#008f7a] text-white font-semibold text-xs h-8 gap-1.5"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> Settle & Disburse (${selectedClaim.approvedAmount.toFixed(2)})
                      </Button>
                    </>
                  )}

                  {/* Finance Actions for Finance Approved Stage */}
                  {selectedClaim.status === ClaimStatus.FINANCE_APPROVED && isFinance && (
                    <Button
                      size="sm"
                      onClick={() => handleTransition(ClaimStatus.SETTLED, 'Final disbursement execution')}
                      disabled={processingAction}
                      className="bg-[#00a88f] hover:bg-[#008f7a] text-white font-semibold text-xs h-8 gap-1.5"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Disburse & Settle Payout (${selectedClaim.approvedAmount.toFixed(2)})
                    </Button>
                  )}

                  {/* Archive / Cancel Action (Allowed only PRE-SETTLEMENT) */}
                  {![ClaimStatus.SETTLED, ClaimStatus.OFFICER_REJECTED, ClaimStatus.CANCELLED].includes(selectedClaim.status) && (isOfficer || isFinance) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setActionDialog({ type: 'CANCEL', claim: selectedClaim });
                        setActionReason('');
                      }}
                      disabled={processingAction}
                      className="text-slate-500 hover:text-slate-900 text-xs h-8 gap-1.5"
                    >
                      <Archive className="h-3.5 w-3.5" /> Archive / Void
                    </Button>
                  )}

                  {/* Terminal Settled Notification */}
                  {selectedClaim.status === ClaimStatus.SETTLED && (
                    <div className="text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" />
                      <span>Funds disbursed. This record is permanently locked from modification.</span>
                    </div>
                  )}

                  {/* Super Admin Physical Wipe (Force Purge) */}
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setActionDialog({ type: 'PURGE', claim: selectedClaim })}
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs h-8 gap-1.5 ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Force Purge (Wipe)
                    </Button>
                  )}
                </div>
              </div>

              {/* Attached Encrypted Receipts */}
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
                    {selectedClaim.attachments.map((att: ReceiptAttachmentDto) => (
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
                    selectedClaim.ruleEvaluations.map((rule: any, idx: number) => (
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
                  <span className="text-slate-500">Total Claimed:</span>
                  <span className="font-mono font-bold">${selectedClaim.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Deductible Absorbed:</span>
                  <span className="font-mono text-amber-700">-${selectedClaim.deductibleCovered.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-200">
                  <span className="text-[#0a2540]">Approved Insurance Payout:</span>
                  <span className="font-mono text-[#00a88f]">${selectedClaim.approvedAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection / Cancellation / Force Purge Prompt Modal */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
              {actionDialog?.type === 'REJECT' && <X className="h-4 w-4 text-rose-600" />}
              {actionDialog?.type === 'CANCEL' && <Archive className="h-4 w-4 text-slate-600" />}
              {actionDialog?.type === 'PURGE' && <AlertTriangle className="h-4 w-4 text-rose-600" />}
              {actionDialog?.type === 'REJECT' && 'Reject Medical Claim'}
              {actionDialog?.type === 'CANCEL' && 'Archive / Cancel Claim'}
              {actionDialog?.type === 'PURGE' && 'Confirm High-Risk Force Purge'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 text-xs mt-2">
            {actionDialog?.type === 'PURGE' ? (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-950 rounded-xl space-y-2">
                <p className="font-bold">Warning: This action is permanent and destructive!</p>
                <p className="text-[11px] leading-relaxed">
                  This will permanently delete the claim record and cascade-wipe all associated encrypted receipt files from storage.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {actionDialog?.type === 'REJECT' ? 'Mandatory Rejection Reason' : 'Cancellation Remarks (Optional)'}
                </label>
                <Input
                  type="text"
                  required={actionDialog?.type === 'REJECT'}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={
                    actionDialog?.type === 'REJECT'
                      ? 'e.g. Non-accredited clinic receipt / Duplicate submission'
                      : 'e.g. Employee requested voiding before processing'
                  }
                  className="h-9 text-xs"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionDialog(null)}
                className="text-xs h-8"
              >
                Cancel
              </Button>

              {actionDialog?.type === 'PURGE' ? (
                <Button
                  size="sm"
                  onClick={handleForcePurge}
                  disabled={processingAction}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-8"
                >
                  {processingAction ? 'Purging Storage...' : 'Permanently Purge Claim'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() =>
                    handleTransition(
                      actionDialog?.type === 'REJECT' ? ClaimStatus.OFFICER_REJECTED : ClaimStatus.CANCELLED,
                      actionReason,
                    )
                  }
                  disabled={processingAction || (actionDialog?.type === 'REJECT' && !actionReason.trim())}
                  className={
                    actionDialog?.type === 'REJECT'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-8'
                      : 'bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs h-8'
                  }
                >
                  {processingAction ? 'Processing...' : 'Confirm Decision'}
                </Button>
              )}
            </div>
          </div>
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
