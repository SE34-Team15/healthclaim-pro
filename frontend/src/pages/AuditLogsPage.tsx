import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Shield,
  Filter,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  Code2,
  Calendar,
  Layers,
} from 'lucide-react';

interface AuditRecord {
  id: string;
  actorId?: string | null;
  action: string;
  targetResource: string;
  targetResourceId?: string | null;
  details?: any;
  ipAddress?: string | null;
  createdAt: string;
  actor?: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null;
}

interface AuditApiResponse {
  items: AuditRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [exporting, setExporting] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Details Modal Inspection
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter && actionFilter !== 'ALL') params.append('action', actionFilter);
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));

      const data = await apiClient.get<any, AuditApiResponse>(
        `/audit/logs?${params.toString()}`,
      );
      setLogs(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, page, pageSize]);

  // Reset to page 1 when filter changes
  const handleFilterChange = (val: string) => {
    setActionFilter(val);
    setPage(1);
  };

  const handlePageSizeChange = (val: string) => {
    setPageSize(Number(val));
    setPage(1);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('healthclaim_token');
      const params = new URLSearchParams();
      if (actionFilter && actionFilter !== 'ALL') params.append('action', actionFilter);

      const response = await fetch(
        `http://localhost:4000/api/v1/audit/export/csv?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) throw new Error('Failed to export CSV');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `healthclaim_audit_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Audit logs CSV exported successfully');
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col min-h-0 space-y-3.5 text-slate-900">
      {/* Header with Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 print:hidden">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0a2540] flex items-center gap-2">
            <Shield className="h-5 w-5 text-slate-700" />
            Audit Trails & Compliance Stream
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log tracking identity authentication, role modifications, claims, and policy assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={exporting}
            className="gap-2 text-xs font-semibold h-8 bg-white"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintReport}
            className="gap-2 text-xs font-semibold h-8 bg-white"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span>Print / PDF</span>
          </Button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-950">HealthClaim Pro - Compliance Audit Report</h1>
        <p className="text-xs text-slate-500 mt-1">Generated: {new Date().toLocaleString()} • Filter: {actionFilter}</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0 print:hidden">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-600 font-semibold whitespace-nowrap">Filter Action:</span>
          <div className="w-64">
            <Select value={actionFilter} onValueChange={handleFilterChange}>
              <SelectTrigger className="h-8 text-xs bg-slate-50/50">
                <SelectValue placeholder="All Audit Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Audit Actions</SelectItem>
                <SelectItem value="SUBMIT_CLAIM">SUBMIT_CLAIM</SelectItem>
                <SelectItem value="USER_LOGIN">USER_LOGIN</SelectItem>
                <SelectItem value="UPDATE_SELF_PROFILE">UPDATE_SELF_PROFILE</SelectItem>
                <SelectItem value="UPDATE_USER_ROLE">UPDATE_USER_ROLE</SelectItem>
                <SelectItem value="UPDATE_USER_STATUS">UPDATE_USER_STATUS</SelectItem>
                <SelectItem value="ASSIGN_POLICY_TIER">ASSIGN_POLICY_TIER</SelectItem>
                <SelectItem value="CREATE_BENEFIT_TIER">CREATE_BENEFIT_TIER</SelectItem>
                <SelectItem value="UPDATE_BENEFIT_TIER">UPDATE_BENEFIT_TIER</SelectItem>
                <SelectItem value="DELETE_BENEFIT_TIER">DELETE_BENEFIT_TIER</SelectItem>
                <SelectItem value="CREATE_COMPLIANCE_RULE">CREATE_COMPLIANCE_RULE</SelectItem>
                <SelectItem value="UPDATE_COMPLIANCE_RULE">UPDATE_COMPLIANCE_RULE</SelectItem>
                <SelectItem value="REORDER_COMPLIANCE_RULES">REORDER_COMPLIANCE_RULES</SelectItem>
                <SelectItem value="ADMIN_CREATE_USER">ADMIN_CREATE_USER</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
          <span>
            Total: <strong className="text-slate-900">{total}</strong> records
          </span>
        </div>
      </div>

      {/* Viewport Filling Dedicated Scrollable Table Container */}
      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Scrollable Table Body Area */}
        <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Timestamp</TableHead>
                <TableHead className="w-48">Event Action</TableHead>
                <TableHead className="w-52">Actor</TableHead>
                <TableHead className="w-40">Target Resource</TableHead>
                <TableHead className="min-w-[200px]">Payload Snapshot</TableHead>
                <TableHead className="w-32 text-right">IP Origin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-slate-400 font-sans">
                    Loading audit stream...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-slate-400 font-sans">
                    No audit records found matching current criteria.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow
                    key={log.id}
                    onClick={() => setSelectedRecord(log)}
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    <TableCell className="text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 font-mono font-bold text-slate-800 text-[11px]">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell>
                      {log.actor ? (
                        <div>
                          <p className="font-semibold text-slate-900 text-xs">
                            {log.actor.firstName} {log.actor.lastName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">{log.actor.email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs font-sans">System Kernel</span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-700 font-semibold text-xs">
                      {log.targetResource}
                    </TableCell>
                    <TableCell className="text-slate-600 font-mono text-[11px] max-w-md truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </TableCell>
                    <TableCell className="text-slate-400 font-mono text-[11px] text-right">
                      {log.ipAddress || '127.0.0.1'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Dedicated Fixed Pagination Footer */}
        <div className="shrink-0 p-3.5 px-4 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-slate-900 font-mono">{startIndex}</strong> - <strong className="text-slate-900 font-mono">{endIndex}</strong> of <strong className="text-slate-900 font-mono">{total}</strong> records
            </span>
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <span className="text-slate-500 text-[11px]">Rows per page:</span>
              <div className="w-20">
                <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="h-7 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px] font-mono mr-2">
              Page {page} of {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="h-7 px-2 text-xs gap-1 bg-white"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="h-7 px-2 text-xs gap-1 bg-white"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Record Payload Inspection Modal */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader className="pr-6">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-600" />
              Audit Record Details: {selectedRecord?.action}
            </DialogTitle>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-3.5 text-xs text-slate-700 mt-2">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Timestamp</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {new Date(selectedRecord.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">IP Address</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {selectedRecord.ipAddress || '127.0.0.1'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Actor</span>
                  <span className="font-semibold text-slate-900">
                    {selectedRecord.actor
                      ? `${selectedRecord.actor.firstName} ${selectedRecord.actor.lastName} (${selectedRecord.actor.role})`
                      : 'System Kernel'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Target Resource</span>
                  <span className="font-semibold text-slate-900">{selectedRecord.targetResource}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5 flex items-center gap-1.5">
                  <Code2 className="h-3.5 w-3.5" /> Payload Details Snapshot
                </span>
                <pre className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-60">
                  {JSON.stringify(selectedRecord.details || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
