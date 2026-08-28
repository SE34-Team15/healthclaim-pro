import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Layers, Edit3, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface BenefitTierItem {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  annualLimit: number;
  defaultDeductible: number;
  defaultCoPayRate: number;
  isActive: boolean;
}

export const BenefitTiersPage: React.FC = () => {
  const [tiers, setTiers] = useState<BenefitTierItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createCode, setCreateCode] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createAnnualLimit, setCreateAnnualLimit] = useState(5000);
  const [createDefaultDeductible, setCreateDefaultDeductible] = useState(100);
  const [createDefaultCoPayRate, setCreateDefaultCoPayRate] = useState(0.8);
  const [creating, setCreating] = useState(false);

  // Edit Modal State
  const [editingTier, setEditingTier] = useState<BenefitTierItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAnnualLimit, setEditAnnualLimit] = useState(5000);
  const [editDefaultDeductible, setEditDefaultDeductible] = useState(100);
  const [editDefaultCoPayRate, setEditDefaultCoPayRate] = useState(0.8);
  const [editIsActive, setEditIsActive] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Delete State
  const [deletingTier, setDeletingTier] = useState<BenefitTierItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTiers = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any, BenefitTierItem[]>('/policies/tiers');
      setTiers(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch benefit tiers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiers();
  }, []);

  const handleCreateTier = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await apiClient.post('/policies/tiers', {
        name: createName,
        code: createCode.toUpperCase().trim(),
        description: createDescription || undefined,
        annualLimit: Number(createAnnualLimit),
        defaultDeductible: Number(createDefaultDeductible),
        defaultCoPayRate: Number(createDefaultCoPayRate),
        isActive: true,
      });
      setIsCreateModalOpen(false);
      toast.success(`Benefit tier "${createName}" created successfully`);
      setCreateName('');
      setCreateCode('');
      setCreateDescription('');
      fetchTiers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create benefit tier');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (tier: BenefitTierItem) => {
    setEditingTier(tier);
    setEditName(tier.name);
    setEditDescription(tier.description || '');
    setEditAnnualLimit(tier.annualLimit);
    setEditDefaultDeductible(tier.defaultDeductible);
    setEditDefaultCoPayRate(tier.defaultCoPayRate);
    setEditIsActive(tier.isActive);
  };

  const handleUpdateTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;

    setUpdating(true);
    try {
      await apiClient.patch(`/policies/tiers/${editingTier.id}`, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        annualLimit: Number(editAnnualLimit),
        defaultDeductible: Number(editDefaultDeductible),
        defaultCoPayRate: Number(editDefaultCoPayRate),
        isActive: editIsActive,
      });

      setEditingTier(null);
      toast.success(`Benefit tier "${editName}" updated successfully`);
      fetchTiers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update benefit tier');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTier = async () => {
    if (!deletingTier) return;

    setDeleting(true);
    try {
      const res = await apiClient.delete<any, { message: string }>(
        `/policies/tiers/${deletingTier.id}`,
      );
      setDeletingTier(null);
      toast.success(res.message || 'Benefit tier deleted successfully');
      fetchTiers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete benefit tier');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0a2540] flex items-center gap-2">
            <Layers className="h-5 w-5 text-slate-700" />
            Corporate Medical Benefit Tiers
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure enterprise healthcare plans, annual coverage limits, deductibles, and co-payment ratios.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          <span>Create Plan Tier</span>
        </Button>
      </div>

      {/* Grid of Benefit Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-slate-400 text-xs">
            Loading benefit tiers...
          </div>
        ) : (
          tiers.map((tier) => (
            <div
              key={tier.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-800">
                    {tier.code}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs">
                    {tier.isActive ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00a88f] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-[#0a2540] mt-1">{tier.name}</h3>
                <p className="text-xs text-slate-500 mt-1 min-h-[32px] leading-relaxed">
                  {tier.description || 'Corporate medical plan tier'}
                </p>

                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Annual Limit:</span>
                    <span className="font-bold text-[#0a2540] text-sm font-mono">
                      ${tier.annualLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Co-Pay Subsidy:</span>
                    <span className="font-semibold text-[#00a88f] font-mono">
                      {(tier.defaultCoPayRate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Annual Deductible:</span>
                    <span className="font-medium text-slate-800 font-mono">
                      ${tier.defaultDeductible.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(tier)}
                  className="h-8 text-xs gap-1.5"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingTier(tier)}
                  className="h-8 text-xs gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-slate-200"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader className="pr-6">
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Create Corporate Benefit Tier
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTier} className="space-y-3.5 mt-2 text-xs">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Name</label>
              <Input
                type="text"
                required
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Executive Leadership Plan"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Code Identifier</label>
              <Input
                type="text"
                required
                value={createCode}
                onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                placeholder="TIER_EXECUTIVE"
                className="uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <Input
                type="text"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Eligibility details..."
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Limit ($)</label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={createAnnualLimit}
                  onChange={(e) => setCreateAnnualLimit(parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deductible ($)</label>
                <Input
                  type="number"
                  required
                  min={0}
                  value={createDefaultDeductible}
                  onChange={(e) => setCreateDefaultDeductible(parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Co-Pay (0-1)</label>
                <Input
                  type="number"
                  required
                  step="0.05"
                  min={0}
                  max={1}
                  value={createDefaultCoPayRate}
                  onChange={(e) => setCreateDefaultCoPayRate(parseFloat(e.target.value))}
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Saving...' : 'Create Tier'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingTier} onOpenChange={(open) => !open && setEditingTier(null)}>
        <DialogContent>
          <DialogHeader className="pr-6">
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-4 w-4" /> Edit Benefit Tier: {editingTier?.code}
            </DialogTitle>
          </DialogHeader>

          {editingTier && (
            <form onSubmit={handleUpdateTier} className="space-y-3.5 mt-2 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Name</label>
                <Input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <Input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Limit ($)</label>
                  <Input
                    type="number"
                    required
                    min={1}
                    value={editAnnualLimit}
                    onChange={(e) => setEditAnnualLimit(parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deductible ($)</label>
                  <Input
                    type="number"
                    required
                    min={0}
                    value={editDefaultDeductible}
                    onChange={(e) => setEditDefaultDeductible(parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Co-Pay (0-1)</label>
                  <Input
                    type="number"
                    required
                    step="0.05"
                    min={0}
                    max={1}
                    value={editDefaultCoPayRate}
                    onChange={(e) => setEditDefaultCoPayRate(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="editIsActive"
                  checked={editIsActive}
                  onCheckedChange={(checked) => setEditIsActive(checked === true)}
                />
                <label htmlFor="editIsActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Active policy tier (eligible for employee assignments)
                </label>
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => setEditingTier(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updating}>
                  {updating ? 'Updating...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingTier} onOpenChange={(open) => !open && setDeletingTier(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pr-6">
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" /> Delete Benefit Tier
            </DialogTitle>
          </DialogHeader>

          {deletingTier && (
            <div className="space-y-3 text-xs text-slate-600 mt-2">
              <p>
                Are you sure you want to delete <span className="font-bold text-slate-900">{deletingTier.name}</span> ({deletingTier.code})?
              </p>
              <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                Note: Plans that are currently assigned to active employees cannot be deleted to preserve actuarial accounting records.
              </p>
            </div>
          )}

          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setDeletingTier(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTier}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
