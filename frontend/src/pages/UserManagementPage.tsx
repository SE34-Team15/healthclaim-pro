import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { UserRole, UserStatus } from '@healthclaim/shared';
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
  DialogFooter,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Search,
  UserPlus,
  Users,
  Filter,
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
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // New User Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Password123!');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.EMPLOYEE);
  const [newTierId, setNewTierId] = useState('');
  const [creating, setCreating] = useState(false);

  // Assign Tier Modal
  const [assignModalUser, setAssignModalUser] = useState<UserRecord | null>(null);
  const [selectedTierId, setSelectedTierId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter && roleFilter !== 'ALL') params.append('role', roleFilter);

      const data = await apiClient.get<any, { items: UserRecord[] }>(
        `/users?${params.toString()}`,
      );
      setUsers(data.items);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch users');
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
      console.error('Failed to load tiers', err);
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
      toast.success(`Role updated to ${newRole}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
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
      toast.success(`User ${newEmail} created successfully`);
      setNewEmail('');
      setNewFirstName('');
      setNewLastName('');
      setNewDepartment('');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
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
      toast.success(`Benefit tier reassigned successfully`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign tier');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0a2540] flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-700" />
            User Management & RBAC
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage enterprise member accounts, privilege tiers, and benefit allowances.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Member</span>
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full sm:w-auto">
          <Search className="h-4 w-4 absolute left-3.5 top-2.5 text-slate-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or department..."
            className="pl-9"
          />
        </form>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Role Filter:</span>
          <div className="w-40">
            <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val)}>
              <SelectTrigger>
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value={UserRole.EMPLOYEE}>Employee</SelectItem>
                <SelectItem value={UserRole.CLAIM_OFFICER}>Claim Officer</SelectItem>
                <SelectItem value={UserRole.FINANCE_MANAGER}>Finance Manager</SelectItem>
                <SelectItem value={UserRole.SYSTEM_ADMIN}>System Admin</SelectItem>
                <SelectItem value={UserRole.SECURITY_AUDITOR}>Security Auditor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold tracking-wider uppercase text-[11px]">
                <th className="py-3.5 px-5">Member</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">RBAC Role</th>
                <th className="py-3.5 px-4">Benefit Plan</th>
                <th className="py-3.5 px-4">Remaining / Quota</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Loading directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No members found matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-950">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {u.department || '—'}
                    </td>
                    <td className="py-3.5 px-4 w-44">
                      <Select
                        value={u.role}
                        onValueChange={(val) => handleRoleChange(u.id, val as UserRole)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UserRole.EMPLOYEE}>Employee</SelectItem>
                          <SelectItem value={UserRole.CLAIM_OFFICER}>Claim Officer</SelectItem>
                          <SelectItem value={UserRole.FINANCE_MANAGER}>Finance Manager</SelectItem>
                          <SelectItem value={UserRole.SYSTEM_ADMIN}>System Admin</SelectItem>
                          <SelectItem value={UserRole.SECURITY_AUDITOR}>Security Auditor</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {u.benefitTier}
                    </td>
                    <td className="py-3.5 px-4">
                      {u.annualLimit > 0 ? (
                        <div>
                          <span className="font-bold text-[#0a2540]">
                            ${u.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-slate-400 text-[11px]"> / ${u.annualLimit.toLocaleString()}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      {u.role === UserRole.EMPLOYEE && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAssignModalUser(u);
                            setSelectedTierId(tiers[0]?.id || '');
                          }}
                        >
                          Change Tier
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Add Enterprise Member
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-3.5 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                <Input
                  type="text"
                  required
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                <Input
                  type="text"
                  required
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <Input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@healthclaim.pro"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Password</label>
              <Input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <Input
                type="text"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="Engineering / Treasury / HR"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Enterprise Role</label>
              <Select
                value={newRole}
                onValueChange={(val) => setNewRole(val as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.EMPLOYEE}>Employee</SelectItem>
                  <SelectItem value={UserRole.CLAIM_OFFICER}>Claim Officer</SelectItem>
                  <SelectItem value={UserRole.FINANCE_MANAGER}>Finance Manager</SelectItem>
                  <SelectItem value={UserRole.SYSTEM_ADMIN}>System Admin</SelectItem>
                  <SelectItem value={UserRole.SECURITY_AUDITOR}>Security Auditor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newRole === UserRole.EMPLOYEE && tiers.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Benefit Plan</label>
                <Select
                  value={newTierId}
                  onValueChange={(val) => setNewTierId(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} (${t.annualLimit.toLocaleString()}/yr)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Tier Dialog */}
      <Dialog open={!!assignModalUser} onOpenChange={(open) => !open && setAssignModalUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Benefit Plan</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAssignTier} className="space-y-4 mt-2">
            <div>
              <p className="text-xs text-slate-500 mb-3">
                Select tier plan for <strong>{assignModalUser?.email}</strong>
              </p>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Benefit Plan Tier</label>
              <Select
                value={selectedTierId}
                onValueChange={(val) => setSelectedTierId(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} (${t.annualLimit.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAssignModalUser(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={assigning}
              >
                {assigning ? 'Saving...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
