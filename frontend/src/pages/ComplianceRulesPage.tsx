import React, { useState, useEffect, useRef } from 'react';
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
import {
  ShieldAlert,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Sparkles,
  GripVertical,
  Eye,
  ArrowUp,
  ArrowDown,
  FileText,
  Lock,
} from 'lucide-react';
import { AstNode, ComplianceRule, LogicalOperator, ComparisonOperator, UserRole } from '@healthclaim/shared';
import { AstRuleBuilder, astToExpression } from '../components/rules/AstRuleBuilder';
import { useAuth } from '../auth/AuthContext';

export const ComplianceRulesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.SYSTEM_ADMIN;

  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Modern Container-Relative Drag State (Strictly locks X-axis and fixes stacking context)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [targetSlotIndex, setTargetSlotIndex] = useState<number | null>(null);
  const [dragRelativeY, setDragRelativeY] = useState<number>(0);
  const startPointerYRef = useRef<number>(0);
  const initialRelativeTopRef = useRef<number>(0);
  const itemHeightRef = useRef<number>(72);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Clean minimal initial AST node for new rule creation
  const defaultInitialAst: AstNode = {
    type: 'LOGICAL',
    operator: LogicalOperator.AND,
    children: [
      {
        type: 'COMPARISON',
        field: 'category',
        operator: ComparisonOperator.EQUALS,
        value: '',
      },
    ],
  };

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createCode, setCreateCode] = useState('');
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createAst, setCreateAst] = useState<AstNode>(defaultInitialAst);
  const [createIsActive, setCreateIsActive] = useState(true);
  const [savingCreate, setSavingCreate] = useState(false);

  // Edit / Detail Modal State
  const [editingRule, setEditingRule] = useState<ComplianceRule | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAst, setEditAst] = useState<AstNode>(defaultInitialAst);
  const [editIsActive, setEditIsActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Modal State
  const [deletingRule, setDeletingRule] = useState<ComplianceRule | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any, ComplianceRule[]>('/rules');
      setRules(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch compliance rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  // Save new order to backend
  const saveReorderedRules = async (newOrder: ComplianceRule[]) => {
    setRules(newOrder);
    try {
      const ruleIds = newOrder.map((r) => r.id);
      await apiClient.patch('/rules/reorder', { ruleIds });
      toast.success('Rule execution priority updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update rule order');
      fetchRules();
    }
  };

  // Strictly Y-axis locked Pointer Drag Handlers
  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    if (e.button !== 0) return;

    const container = listContainerRef.current;
    const targetElement = itemRefs.current[index];
    if (!container || !targetElement) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect = targetElement.getBoundingClientRect();

    itemHeightRef.current = itemRect.height;
    const initialRelTop = itemRect.top - containerRect.top;

    startPointerYRef.current = e.clientY;
    initialRelativeTopRef.current = initialRelTop;

    setDragRelativeY(initialRelTop);
    setDraggingIndex(index);
    setTargetSlotIndex(index);

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingIndex === null) return;

    const deltaY = e.clientY - startPointerYRef.current;
    const currentRelTop = initialRelativeTopRef.current + deltaY;
    setDragRelativeY(currentRelTop);

    // Auto-scroll when near viewport edges
    const threshold = 100;
    if (e.clientY < threshold) {
      window.scrollBy({ top: -12, behavior: 'auto' });
    } else if (e.clientY > window.innerHeight - threshold) {
      window.scrollBy({ top: 12, behavior: 'auto' });
    }

    // Determine target slot by stride calculation (height + gap 10px)
    const stride = itemHeightRef.current + 10;
    const estimatedSlot = Math.round(currentRelTop / stride);
    const clampedSlot = Math.min(rules.length - 1, Math.max(0, estimatedSlot));

    if (clampedSlot !== targetSlotIndex) {
      setTargetSlotIndex(clampedSlot);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingIndex === null) return;

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (targetSlotIndex !== null && targetSlotIndex !== draggingIndex) {
      const newRules = [...rules];
      const [moved] = newRules.splice(draggingIndex, 1);
      newRules.splice(targetSlotIndex, 0, moved);
      saveReorderedRules(newRules);
    }

    setDraggingIndex(null);
    setTargetSlotIndex(null);
  };

  const handleMoveRule = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rules.length) return;

    const newRules = [...rules];
    const [moved] = newRules.splice(index, 1);
    newRules.splice(targetIndex, 0, moved);
    saveReorderedRules(newRules);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createCode.trim() || !createName.trim()) {
      toast.error('Rule code and name are required');
      return;
    }

    setSavingCreate(true);
    try {
      await apiClient.post('/rules', {
        code: createCode.toUpperCase().trim(),
        name: createName.trim(),
        description: createDesc.trim() || undefined,
        astDefinition: createAst,
        isActive: createIsActive,
      });

      setIsCreateOpen(false);
      toast.success(`Compliance rule "${createName}" created successfully`);
      setCreateCode('');
      setCreateName('');
      setCreateDesc('');
      setCreateAst(defaultInitialAst);
      fetchRules();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create compliance rule');
    } finally {
      setSavingCreate(false);
    }
  };

  const handleOpenEdit = (rule: ComplianceRule) => {
    setEditingRule(rule);
    setEditName(rule.name);
    setEditDesc(rule.description || '');
    setEditAst(rule.astDefinition as unknown as AstNode);
    setEditIsActive(rule.isActive);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    setSavingEdit(true);
    try {
      await apiClient.patch(`/rules/${editingRule.id}`, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        astDefinition: editAst,
        isActive: editIsActive,
      });

      setEditingRule(null);
      toast.success(`Rule "${editName}" updated successfully`);
      fetchRules();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update rule');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteRule = async () => {
    if (!deletingRule) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/rules/${deletingRule.id}`);
      setDeletingRule(null);
      toast.success('Compliance rule deleted successfully');
      fetchRules();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete rule');
    } finally {
      setDeleting(false);
    }
  };

  const applyTemplate = (templateType: 'HOSPITAL' | 'DENTAL' | 'MIN_AMOUNT') => {
    if (templateType === 'HOSPITAL') {
      setCreateCode('RULE_HOSPITAL_ACCREDITED');
      setCreateName('Accredited Hospital Grade Verification');
      setCreateDesc('Institutions must be accredited Grade A or certified Specialist clinic.');
      setCreateAst({
        type: 'COMPARISON',
        field: 'hospitalGrade',
        operator: ComparisonOperator.IN,
        value: ['GRADE_A', 'GRADE_3A', 'PUBLIC_HOSPITAL', 'SPECIALIST_CLINIC'],
      });
    } else if (templateType === 'DENTAL') {
      setCreateCode('RULE_DENTAL_CEILING');
      setCreateName('Dental Single Claim Ceiling');
      setCreateDesc('Category is not Dental OR total claimed amount is less than or equal to $1,000.');
      setCreateAst({
        type: 'LOGICAL',
        operator: LogicalOperator.OR,
        children: [
          {
            type: 'COMPARISON',
            field: 'category',
            operator: ComparisonOperator.NOT_EQUALS,
            value: 'DENTAL',
          },
          {
            type: 'COMPARISON',
            field: 'totalAmount',
            operator: ComparisonOperator.LESS_EQUAL,
            value: 1000,
          },
        ],
      });
    } else if (templateType === 'MIN_AMOUNT') {
      setCreateCode('RULE_POSITIVE_VALUE');
      setCreateName('Strict Positive Total Validation');
      setCreateDesc('Total invoice claim amount must be strictly greater than $0.');
      setCreateAst({
        type: 'COMPARISON',
        field: 'totalAmount',
        operator: ComparisonOperator.GREATER_THAN,
        value: 0,
      });
    }
  };

  const activeDraggedRule = draggingIndex !== null ? rules[draggingIndex] : null;

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0a2540] flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-slate-700" />
            Compliance Rules Pipeline
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? 'Rules execute sequentially from top to bottom. Drag cards vertically to reorder priority.'
              : 'Active automated compliance validation rules evaluated during claim pre-flight auditing.'}
          </p>
        </div>

        {isAdmin && (
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 font-semibold">
            <Plus className="h-4 w-4" />
            <span>New AST Rule</span>
          </Button>
        )}
      </div>

      {/* Reorderable Pipeline Container with Relative Coordinate Space */}
      <div ref={listContainerRef} className="space-y-2.5 relative">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs">
            Loading compliance rules pipeline...
          </div>
        ) : rules.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs">
            No compliance rules defined. Click "New AST Rule" to create one.
          </div>
        ) : (
          rules.map((rule, index) => {
            const expressionStr = astToExpression(rule.astDefinition as unknown as AstNode);
            const isBeingDragged = draggingIndex === index;

            // Calculate interactive displacement offset
            let translateY = 0;
            const stride = itemHeightRef.current + 10;

            if (draggingIndex !== null && targetSlotIndex !== null && !isBeingDragged) {
              if (draggingIndex < targetSlotIndex) {
                // Dragging down: items between draggingIndex and targetSlotIndex shift UP
                if (index > draggingIndex && index <= targetSlotIndex) {
                  translateY = -stride;
                }
              } else if (draggingIndex > targetSlotIndex) {
                // Dragging up: items between targetSlotIndex and draggingIndex shift DOWN
                if (index >= targetSlotIndex && index < draggingIndex) {
                  translateY = stride;
                }
              }
            }

            return (
              <div
                key={rule.id}
                ref={(el) => (itemRefs.current[index] = el)}
                onClick={() => handleOpenEdit(rule)}
                style={{
                  transform: isBeingDragged ? 'none' : `translate3d(0, ${translateY}px, 0)`,
                  transition: isBeingDragged
                    ? 'none'
                    : 'transform 200ms cubic-bezier(0.2, 0, 0, 1), box-shadow 150ms ease',
                }}
                className={`bg-white rounded-2xl border p-4 shadow-xs flex items-center justify-between gap-4 select-none group transition-colors w-full ${
                  isBeingDragged
                    ? 'opacity-0 pointer-events-none' // Hidden in original slot while floating layer is active
                    : 'border-slate-200/90 hover:border-slate-300 hover:shadow-sm cursor-pointer'
                }`}
              >
                {/* Left: Drag Handle & Rank Badge */}
                <div className="flex items-center gap-3 shrink-0">
                  {isAdmin && (
                    <div
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        handlePointerDown(e, index);
                      }}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      className="p-1.5 rounded-lg text-slate-300 group-hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-grab active:cursor-grabbing touch-none"
                      title="Drag vertically to reorder priority"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="h-4 w-4" />
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-xs font-extrabold text-[#0a2540] bg-slate-100 px-2.5 py-1 rounded-lg">
                      #{index + 1}
                    </span>
                  </div>
                </div>

                {/* Center: Simplified Summary & Live Expression Snippet */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[#0a2540]">
                      {rule.name}
                    </span>
                    <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {rule.code}
                    </span>
                    {rule.isActive ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#00a88f] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 truncate max-w-2xl">
                    <span className="text-slate-400 font-sans">Expression: </span>
                    <span className="text-emerald-700 font-semibold">{expressionStr}</span>
                  </p>
                </div>

                {/* Right: Quick Action Controls */}
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {isAdmin && (
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveRule(index, 'UP')}
                        className="p-1 rounded text-slate-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Move Up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === rules.length - 1}
                        onClick={() => handleMoveRule(index, 'DOWN')}
                        className="p-1 rounded text-slate-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Move Down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(rule)}
                    className="h-8 text-xs gap-1.5 font-medium"
                  >
                    {isAdmin ? (
                      <>
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Inspect & Edit</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Details</span>
                      </>
                    )}
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingRule(rule)}
                      className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-slate-200"
                      title="Delete Rule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Strictly X-Aligned Floating Card During Dragging (left: 0, right: 0, width: 100%) */}
        {draggingIndex !== null && activeDraggedRule && (
          <div
            style={{
              top: `${dragRelativeY}px`,
              left: 0,
              right: 0,
              width: '100%',
            }}
            className="absolute bg-white rounded-2xl border-2 border-indigo-500 shadow-2xl p-4 flex items-center justify-between gap-4 z-50 pointer-events-none scale-[1.01] transition-transform"
          >
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-1.5 rounded-lg text-indigo-600 bg-indigo-50">
                <GripVertical className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                  #{targetSlotIndex !== null ? targetSlotIndex + 1 : draggingIndex + 1}
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-[#0a2540]">
                  {activeDraggedRule.name}
                </span>
                <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {activeDraggedRule.code}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 truncate max-w-2xl">
                <span className="text-slate-400 font-sans">Expression: </span>
                <span className="text-emerald-700 font-semibold">
                  {astToExpression(activeDraggedRule.astDefinition as unknown as AstNode)}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 opacity-40">
              <div className="h-8 w-24 bg-slate-100 rounded-lg" />
            </div>
          </div>
        )}
      </div>

      {/* Create Rule Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden p-6">
          <DialogHeader className="pr-6">
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Create Compliance Rule (AST Engine)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs mt-2">
            {/* Quick Templates */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Quick Rule Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate('DENTAL')}
                  className="text-[11px] h-7 bg-white"
                >
                  OR Operator (Dental $1,000 Cap)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate('HOSPITAL')}
                  className="text-[11px] h-7 bg-white"
                >
                  IN Operator (Hospital Grade)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate('MIN_AMOUNT')}
                  className="text-[11px] h-7 bg-white"
                >
                  GREATER_THAN (Min Amount)
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rule Name</label>
                <Input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Single Dental Claim Ceiling"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Code Identifier</label>
                <Input
                  type="text"
                  required
                  value={createCode}
                  onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                  placeholder="RULE_DENTAL_CAP"
                  className="uppercase font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <Input
                type="text"
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="Explanation of validation criteria..."
              />
            </div>

            {/* Cloudflare Dual-Mode AST Rule Builder Component */}
            <div className="pt-2 max-w-full overflow-hidden">
              <AstRuleBuilder
                initialAst={createAst}
                onChange={(newAst) => setCreateAst(newAst)}
              />
            </div>

            {/* Shadcn Checkbox */}
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="createIsActive"
                checked={createIsActive}
                onCheckedChange={(checked) => setCreateIsActive(checked === true)}
              />
              <label htmlFor="createIsActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Enable rule for automated claim evaluations
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingCreate}>
                {savingCreate ? 'Saving...' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit / Inspect Rule Dialog */}
      <Dialog open={!!editingRule} onOpenChange={(open) => !open && setEditingRule(null)}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden p-6">
          <DialogHeader className="pr-6">
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {isAdmin ? (
                <>
                  <Edit3 className="h-4 w-4" /> Rule Details & AST Builder: {editingRule?.code}
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 text-indigo-600" /> Rule Specification: {editingRule?.code}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 inline-flex items-center gap-1 font-mono">
                    <Lock className="h-3 w-3 text-slate-400" /> Read-Only
                  </span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {editingRule && (
            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rule Name</label>
                  <Input
                    type="text"
                    required
                    disabled={!isAdmin}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={!isAdmin ? 'bg-slate-50 text-slate-700 cursor-default' : ''}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Code</label>
                  <Input
                    type="text"
                    disabled
                    value={editingRule.code}
                    className="font-mono bg-slate-50 text-slate-500 cursor-default"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <Input
                  type="text"
                  disabled={!isAdmin}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className={!isAdmin ? 'bg-slate-50 text-slate-700 cursor-default' : ''}
                />
              </div>

              {/* Cloudflare Dual-Mode AST Rule Builder Component */}
              <div className="pt-2 max-w-full overflow-hidden">
                <AstRuleBuilder
                  initialAst={editAst}
                  readOnly={!isAdmin}
                  onChange={(newAst) => setEditAst(newAst)}
                />
              </div>

              {/* Shadcn Checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="editIsActive"
                  disabled={!isAdmin}
                  checked={editIsActive}
                  onCheckedChange={(checked) => setEditIsActive(checked === true)}
                />
                <label htmlFor="editIsActive" className={`text-xs font-semibold text-slate-700 ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}>
                  Active rule (evaluated during claim pre-flight)
                </label>
              </div>

              <DialogFooter className="pt-3">
                {isAdmin ? (
                  <>
                    <Button type="button" variant="outline" onClick={() => setEditingRule(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingEdit}>
                      {savingEdit ? 'Updating...' : 'Save AST Changes'}
                    </Button>
                  </>
                ) : (
                  <Button type="button" onClick={() => setEditingRule(null)}>
                    Close
                  </Button>
                )}
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deletingRule} onOpenChange={(open) => !open && setDeletingRule(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pr-6">
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="h-5 w-5" /> Delete Compliance Rule
            </DialogTitle>
          </DialogHeader>

          {deletingRule && (
            <div className="space-y-3 text-xs text-slate-600 mt-2">
              <p>
                Are you sure you want to delete <span className="font-bold text-slate-900">{deletingRule.name}</span> ({deletingRule.code})?
              </p>
              <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                Claims will no longer be audited against this AST specification tree.
              </p>
            </div>
          )}

          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setDeletingRule(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRule}
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
