import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { UserRole, UserStatus } from '@healthclaim/shared';
import {
  Users,
  Search,
  UserPlus,
  Shield,
  Check,
  X,
  AlertCircle,
  Building,
  CreditCard,
} from 'lucide-react';

interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  department?: string | null;
  benefitTier: string;
  remainingBalance: number;
  annualLimit: number;
  createdAt: string;
}

interface BenefitTierItem {
  id: string;
  name: string;
  code: string;
  annualLimit: number;
}

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [tiers, setTiers] = useState<BenefitTierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Password123!');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.EMPLOYEE);
  const [newTierId, setNewTierId] = useState('');
  const [creating, setCreating] = useState(false);

  // Policy Tier Assignment Modal State
  const [assignModalUser, setAssignModalUser] = useState<UserRecord | null>(null);
  const [selectedTierId, setSelectedTierId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);

      const data = await apiClient.get<any, { items: UserRecord[] }>(
        `/users?${params.toString()}`,
      );
      setUsers(data.items);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user directory');
    } finally {
      setLoading(false);
    }
  };

  const fetchTiers = async () => {
    try {
      const data = await apiClient.get<any, BenefitTierItem[]>('/policies/tiers');
      setTiers(data);
      if (data.length > 0) {
        setNewTierId(data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load benefit tiers', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchTiers();
  }, [roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await apiClient.patch(`/users/${userId}/role`, { role: newRole });
      setSuccessMsg(`User role successfully updated to ${newRole}`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user role');
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await apiClient.post('/users', {
        email: newEmail,
        password: newPassword,
        firstName: newFirstName,
        lastName: newLastName,
        department: newDepartment || undefined,
        role: newRole,
        benefitTierId: newRole === UserRole.EMPLOYEE ? newTierId || undefined : undefined,
      });
      setIsModalOpen(false);
      setSuccessMsg(`User ${newEmail} created successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      // Reset form
      setNewEmail('');
      setNewFirstName('');
      setNewLastName('');
      setNewDepartment('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleAssignTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalUser || !selectedTierId) return;
    setAssigning(true);
    try {
      await apiClient.post('/policies/assign', {
        userId: assignModalUser.id,
        benefitTierId: selectedTierId,
        fiscalYear: new Date().getFullYear(),
      });
      setAssignModalUser(null);
      setSuccessMsg(`Benefit tier assigned to ${assignModalUser.email}`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to assign benefit tier');
    } finally {
      setAssigning(false);
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.SYSTEM_ADMIN:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case UserRole.CLAIM_OFFICER:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case UserRole.FINANCE_MANAGER:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case UserRole.SECURITY_AUDITOR:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case UserRole.EMPLOYEE:
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Enterprise User & Access Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage corporate employee directory, configure RBAC privileges, and assign medical benefit tiers.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-blue-600/20"
        >
          <UserPlus className="h-4 w-4" />
          Add New User
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full sm:w-auto">
          <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or department..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Roles</option>
            <option value={UserRole.EMPLOYEE}>Employee</option>
            <option value={UserRole.CLAIM_OFFICER}>Claim Officer</option>
            <option value={UserRole.FINANCE_MANAGER}>Finance Manager</option>
            <option value={UserRole.SYSTEM_ADMIN}>System Admin</option>
            <option value={UserRole.SECURITY_AUDITOR}>Security Auditor</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">RBAC Role</th>
                <th className="py-3.5 px-4">Benefit Tier</th>
                <th className="py-3.5 px-4">Annual Quota</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Loading user directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {u.department || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className={`text-xs font-semibold px-2 py-1 rounded-md border focus:outline-none focus:ring-1 ${getRoleColor(
                          u.role,
                        )}`}
                      >
                        <option value={UserRole.EMPLOYEE}>Employee</option>
                        <option value={UserRole.CLAIM_OFFICER}>Claim Officer</option>
                        <option value={UserRole.FINANCE_MANAGER}>Finance Manager</option>
                        <option value={UserRole.SYSTEM_ADMIN}>System Admin</option>
                        <option value={UserRole.SECURITY_AUDITOR}>Security Auditor</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-700">{u.benefitTier}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.annualLimit > 0 ? (
                        <div>
                          <span className="font-semibold text-emerald-700">
                            ${u.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-slate-400 text-[11px]"> / ${u.annualLimit.toLocaleString()}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {u.role === UserRole.EMPLOYEE && (
                        <button
                          onClick={() => {
                            setAssignModalUser(u);
                            setSelectedTierId(tiers[0]?.id || '');
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition-colors"
                        >
                          Change Tier
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                Add Enterprise Member
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Corporate Email
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="name@healthclaim.pro"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Temporary Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  placeholder="e.g. Finance, Engineering"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned RBAC Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={UserRole.EMPLOYEE}>Employee</option>
                  <option value={UserRole.CLAIM_OFFICER}>Claim Officer</option>
                  <option value={UserRole.FINANCE_MANAGER}>Finance Manager</option>
                  <option value={UserRole.SYSTEM_ADMIN}>System Admin</option>
                  <option value={UserRole.SECURITY_AUDITOR}>Security Auditor</option>
                </select>
              </div>

              {newRole === UserRole.EMPLOYEE && tiers.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Benefit Tier Plan
                  </label>
                  <select
                    value={newTierId}
                    onChange={(e) => setNewTierId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {tiers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (${t.annualLimit.toLocaleString()}/yr)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Tier Modal */}
      {assignModalUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="font-bold text-base text-slate-900 mb-1 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Reassign Benefit Tier
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Update medical insurance tier for <span className="font-semibold text-slate-700">{assignModalUser.email}</span>.
            </p>

            <form onSubmit={handleAssignTier} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Benefit Tier
                </label>
                <select
                  value={selectedTierId}
                  onChange={(e) => setSelectedTierId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {tiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Limit: ${t.annualLimit.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssignModalUser(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md"
                >
                  {assigning ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
