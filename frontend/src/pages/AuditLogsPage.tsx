import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { ShieldCheck, Search, Filter, Lock } from 'lucide-react';

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

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.append('action', actionFilter);

      const data = await apiClient.get<any, { items: AuditRecord[] }>(
        `/audit/logs?${params.toString()}`,
      );
      setLogs(data.items);
    } catch (err) {
      console.error('Failed to load audit trails', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-amber-600" />
            Immutable Security & Compliance Audit Trails
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-proof audit logs recording all authentication events, RBAC modifications, and policy adjustments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">All Actions</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="UPDATE_USER_ROLE">UPDATE_USER_ROLE</option>
            <option value="UPDATE_USER_STATUS">UPDATE_USER_STATUS</option>
            <option value="ASSIGN_POLICY_TIER">ASSIGN_POLICY_TIER</option>
            <option value="CREATE_BENEFIT_TIER">CREATE_BENEFIT_TIER</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Target Resource</th>
                <th className="py-3.5 px-4">Details</th>
                <th className="py-3.5 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 font-sans">
                    Loading immutable audit trail records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 font-sans">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {log.actor ? (
                        <div>
                          <p className="font-semibold text-slate-800 text-xs">
                            {log.actor.firstName} {log.actor.lastName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">{log.actor.email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">System Kernel</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {log.targetResource}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate text-[11px]">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {log.ipAddress || '127.0.0.1'}
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
