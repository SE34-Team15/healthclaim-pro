import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { BadgePercent, Plus, Check, AlertCircle, ShieldCheck, X } from 'lucide-react';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [annualLimit, setAnnualLimit] = useState(5000);
  const [defaultDeductible, setDefaultDeductible] = useState(100);
  const [defaultCoPayRate, setDefaultCoPayRate] = useState(0.8);
  const [creating, setCreating] = useState(false);

  const fetchTiers = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any, BenefitTierItem[]>('/policies/tiers');
      setTiers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch benefit tiers');
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
    setError(null);
    try {
      await apiClient.post('/policies/tiers', {
        name,
        code: code.toUpperCase().trim(),
        description: description || undefined,
        annualLimit: Number(annualLimit),
        defaultDeductible: Number(defaultDeductible),
        defaultCoPayRate: Number(defaultCoPayRate),
        isActive: true,
      });
      setIsModalOpen(false);
      setSuccessMsg(`Benefit tier "${name}" created successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      setName('');
      setCode('');
      setDescription('');
      fetchTiers();
    } catch (err: any) {
      setError(err.message || 'Failed to create benefit tier');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <BadgePercent className="h-6 w-6 text-purple-600" />
            Corporate Medical Benefit Tiers
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure enterprise medical plans, annual coverage limits, deductibles, and co-payment reimbursement ratios.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-purple-600/20"
        >
          <Plus className="h-4 w-4" />
          Create New Plan Tier
        </button>
      </div>

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

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-slate-400 text-xs">
            Loading benefit tier configurations...
          </div>
        ) : (
          tiers.map((tier) => (
            <div
              key={tier.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between hover:border-purple-300 transition-all"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                    {tier.code}
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Active
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">{tier.name}</h3>
                <p className="text-xs text-slate-500 mt-1 min-h-[32px]">
                  {tier.description || 'Corporate healthcare policy tier'}
                </p>

                <div className="mt-6 pt-4 border-t border-slate-100 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Annual Limit:</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      ${tier.annualLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Co-Pay Coverage:</span>
                    <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                      {(tier.defaultCoPayRate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Annual Deductible:</span>
                    <span className="font-semibold text-slate-800">
                      ${tier.defaultDeductible.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Auto-Applies in Actuarial Pipeline</span>
                <ShieldCheck className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <BadgePercent className="h-5 w-5 text-purple-600" />
                Create Corporate Benefit Tier
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTier} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Plan Tier Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Executive Leadership Plan"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unique Code Identifier
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="TIER_EXECUTIVE"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Plan details and eligibility criteria..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Annual Limit ($)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={annualLimit}
                    onChange={(e) => setAnnualLimit(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deductible ($)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={defaultDeductible}
                    onChange={(e) => setDefaultDeductible(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Co-Pay (0 - 1)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.05"
                    min={0}
                    max={1}
                    value={defaultCoPayRate}
                    onChange={(e) => setDefaultCoPayRate(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

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
                  className="px-4 py-2 text-xs font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-md"
                >
                  {creating ? 'Saving...' : 'Create Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
