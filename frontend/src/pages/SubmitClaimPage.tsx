import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/client';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ClaimCategory,
  ClaimItem,
  ActuarialCalculationPreviewDto,
} from '@healthclaim/shared';
import gsap from 'gsap';
import {
  Plus,
  Trash2,
  Send,
  Building2,
  Calendar as CalendarIcon,
  Layers,
  FileText,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const SubmitClaimPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [category, setCategory] = useState<ClaimCategory>(ClaimCategory.CONSULTATION);
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalGrade, setHospitalGrade] = useState('GRADE_3A');
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');

  // Clean initial state with placeholders
  const [items, setItems] = useState<ClaimItem[]>([
    {
      description: '',
      category: ClaimCategory.CONSULTATION,
      unitPrice: '' as any,
      quantity: 1,
      totalPrice: 0,
      isEligible: true,
    },
  ]);

  const [preview, setPreview] = useState<ActuarialCalculationPreviewDto | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0.9, y: 6 },
        { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' },
      );
    }
  }, []);

  // Fetch real-time actuarial quote preview
  const fetchPreview = async (currentItems: ClaimItem[], currentCategory: ClaimCategory) => {
    const validItems = currentItems.filter((it) => it.description.trim() && Number(it.unitPrice) > 0);
    if (validItems.length === 0 || !hospitalName.trim()) {
      setPreview(null);
      return;
    }

    setLoadingPreview(true);
    try {
      const data = await apiClient.post<any, ActuarialCalculationPreviewDto>('/claims/preview', {
        category: currentCategory,
        hospitalName: hospitalName.trim(),
        hospitalGrade,
        invoiceDate: invoiceDate.toISOString().split('T')[0],
        items: validItems.map((it) => ({
          ...it,
          unitPrice: Number(it.unitPrice) || 0,
          quantity: Number(it.quantity) || 1,
          totalPrice: Number(((Number(it.unitPrice) || 0) * (Number(it.quantity) || 1)).toFixed(2)),
        })),
      });
      setPreview(data);
    } catch (err) {
      // preview error handled silently
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchPreview(items, category);
  }, [items, category, hospitalGrade, hospitalName, invoiceDate]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        description: '',
        category: ClaimCategory.CONSULTATION,
        unitPrice: '' as any,
        quantity: 1,
        totalPrice: 0,
        isEligible: true,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.error('Claim must contain at least one line-item');
      return;
    }
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const handleItemChange = (
    index: number,
    field: keyof ClaimItem,
    value: any,
  ) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    if (field === 'unitPrice' || field === 'quantity') {
      const uPrice = field === 'unitPrice' ? (value === '' ? ('' as any) : parseFloat(value) || 0) : item.unitPrice;
      const qty = field === 'quantity' ? (value === '' ? ('' as any) : parseInt(value, 10) || 0) : item.quantity;
      item.unitPrice = uPrice;
      item.quantity = qty;
      const calcPrice = (Number(uPrice) || 0) * (Number(qty) || 0);
      item.totalPrice = Number(calcPrice.toFixed(2));
    }

    updated[index] = item;
    setItems(updated);
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalName.trim()) {
      toast.error('Please enter hospital/clinic name');
      return;
    }

    for (const item of items) {
      if (!item.description.trim() || Number(item.unitPrice) <= 0 || Number(item.quantity) <= 0) {
        toast.error('Please fill all item descriptions with valid amounts');
        return;
      }
    }

    setSubmitting(true);
    try {
      const formattedItems = items.map((it) => ({
        ...it,
        unitPrice: Number(it.unitPrice),
        quantity: Number(it.quantity),
        totalPrice: Number((Number(it.unitPrice) * Number(it.quantity)).toFixed(2)),
      }));

      const response = await apiClient.post<any, any>('/claims', {
        category,
        hospitalName: hospitalName.trim(),
        hospitalGrade,
        invoiceDate: invoiceDate.toISOString().split('T')[0],
        notes: notes || undefined,
        items: formattedItems,
      });

      toast.success(`Claim ${response.claimNumber} submitted successfully!`);
      await refreshProfile();
      navigate('/claims/my-claims');
    } catch (err: any) {
      toast.error(err.message || 'Claim submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const totalClaimAmount = items.reduce(
    (sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0),
    0,
  );

  return (
    <div ref={containerRef} className="space-y-6 text-slate-900 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0a2540] flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-700" />
            File New Medical Reimbursement
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit invoice details for real-time compliance evaluation and actuarial settlement.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmitClaim} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Details & Items (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Institution & General Info Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5 anim-card">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-600" /> Medical Provider Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Category
                </label>
                <Select value={category} onValueChange={(val) => setCategory(val as ClaimCategory)}>
                  <SelectTrigger className="h-9 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ClaimCategory.CONSULTATION}>Consultation (GP / Specialist)</SelectItem>
                    <SelectItem value={ClaimCategory.MEDICATION}>Medication & Prescription</SelectItem>
                    <SelectItem value={ClaimCategory.SURGERY}>Outpatient / Day Surgery</SelectItem>
                    <SelectItem value={ClaimCategory.HOSPITALIZATION}>Hospitalization</SelectItem>
                    <SelectItem value={ClaimCategory.DENTAL}>Dental Treatment</SelectItem>
                    <SelectItem value={ClaimCategory.OPTICAL}>Optical & Eye Care</SelectItem>
                    <SelectItem value={ClaimCategory.HEALTH_SCREENING}>Preventative Screening</SelectItem>
                    <SelectItem value={ClaimCategory.OTHER}>Other Medical Services</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Provider Accreditation Grade
                </label>
                <Select value={hospitalGrade} onValueChange={setHospitalGrade}>
                  <SelectTrigger className="h-9 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GRADE_3A">Grade 3A Hospital (Top Tier)</SelectItem>
                    <SelectItem value="GRADE_A">Grade A Hospital / Medical Center</SelectItem>
                    <SelectItem value="SPECIALIST_CLINIC">Certified Specialist Clinic</SelectItem>
                    <SelectItem value="PUBLIC_HOSPITAL">General Public Hospital</SelectItem>
                    <SelectItem value="COMMUNITY_CLINIC">Community Clinic / GP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hospital / Clinic Name
                </label>
                <Input
                  type="text"
                  required
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="e.g. Mount Elizabeth Hospital, Parkway Clinic"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invoice Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-9 justify-start text-left font-normal text-xs bg-white border-slate-200"
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-500" />
                      {invoiceDate ? (
                        <span className="font-mono text-slate-900">{format(invoiceDate, 'PPP')}</span>
                      ) : (
                        <span className="text-slate-400">Pick an invoice date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={invoiceDate}
                      onSelect={(date) => date && setInvoiceDate(date)}
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Medical Diagnosis / Notes (Optional)
              </label>
              <Input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Brief summary of condition (e.g. Acute bronchitis prescription)"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Invoice Line-Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4 anim-card">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-600" /> Invoice Line Items
              </h3>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="gap-1.5 h-8 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" /> Add Item
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="pb-2 pl-1 min-w-[180px]">Description</th>
                    <th className="pb-2 px-2 w-44 min-w-[140px]">Category</th>
                    <th className="pb-2 px-2 w-32 min-w-[100px]">Price ($)</th>
                    <th className="pb-2 px-2 w-24 min-w-[80px] text-center">Qty</th>
                    <th className="pb-2 pr-1 text-right w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className="group">
                      <td className="py-2.5 pl-1 pr-2">
                        <Input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="e.g. Specialist Consultation / Blood Test"
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <Select
                          value={item.category}
                          onValueChange={(val) => handleItemChange(idx, 'category', val as ClaimCategory)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={ClaimCategory.CONSULTATION}>Consultation</SelectItem>
                            <SelectItem value={ClaimCategory.MEDICATION}>Medication</SelectItem>
                            <SelectItem value={ClaimCategory.SURGERY}>Surgery</SelectItem>
                            <SelectItem value={ClaimCategory.HOSPITALIZATION}>Hospitalization</SelectItem>
                            <SelectItem value={ClaimCategory.DENTAL}>Dental</SelectItem>
                            <SelectItem value={ClaimCategory.OPTICAL}>Optical</SelectItem>
                            <SelectItem value={ClaimCategory.HEALTH_SCREENING}>Screening</SelectItem>
                            <SelectItem value={ClaimCategory.OTHER}>Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2.5 px-2">
                        <Input
                          type="number"
                          required
                          min={0}
                          step="0.01"
                          value={item.unitPrice !== undefined ? item.unitPrice : ''}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          placeholder="0.00"
                          className="h-8 text-xs font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <Input
                          type="number"
                          required
                          min={1}
                          value={item.quantity !== undefined ? item.quantity : ''}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          placeholder="1"
                          className="h-8 text-xs font-mono text-center px-2 w-full"
                        />
                      </td>
                      <td className="py-2.5 pr-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs font-bold text-[#0a2540]">
              <span>Total Invoice Amount:</span>
              <span className="text-base font-mono">
                ${totalClaimAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Real-time Actuarial Fee Calculator & Submission */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5 sticky top-20 anim-card">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Calculator className="h-4 w-4 text-[#00a88f]" /> Fee Calculation
              </h3>
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                LIVE
              </span>
            </div>

            {preview ? (
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Claimed Subtotal:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    ${preview.totalClaimedAmount.toFixed(2)}
                  </span>
                </div>

                {preview.deductibleApplied > 0 && (
                  <div className="flex justify-between text-amber-700 bg-amber-50/60 p-2 rounded-xl border border-amber-200/60">
                    <span>Deductible Applied:</span>
                    <span className="font-mono font-bold">-${preview.deductibleApplied.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Coverage Rate:</span>
                  <span className="font-mono font-semibold text-[#00a88f]">
                    {(preview.applicableCoPayRate * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex justify-between font-bold text-[#0a2540]">
                    <span>Reimbursable Amount:</span>
                    <span className="text-base font-mono text-[#00a88f]">
                      ${preview.reimbursedAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Employee Out-of-Pocket:</span>
                    <span className="font-mono">${preview.employeeOutOfPocket.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Quota After Claim:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      ${preview.quotaAfterClaim.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Remaining Deductible:</span>
                    <span className="font-mono">${preview.remainingDeductibleAfter.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                Enter hospital provider and invoice items to preview live settlement calculation.
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || totalClaimAmount <= 0}
              className="w-full gap-2 font-semibold h-10 shadow-sm"
            >
              <Send className="h-4 w-4" />
              <span>{submitting ? 'Auditing & Submitting...' : 'Submit Claim'}</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
