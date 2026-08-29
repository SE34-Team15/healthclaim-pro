import React, { useState, useEffect } from 'react';
import {
  AstNode,
  LogicalOperator,
  ComparisonOperator,
  ComparisonAstNode,
} from '@healthclaim/shared';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Plus,
  Trash2,
  Code2,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

const AVAILABLE_FIELDS = [
  { value: 'category', label: 'Claim Category (category)', example: 'e.g. DENTAL, MEDICATION, SURGERY, CONSULTATION' },
  { value: 'totalAmount', label: 'Total Claim Amount (totalAmount)', example: 'e.g. 1000.00' },
  { value: 'hospitalGrade', label: 'Hospital Grade (hospitalGrade)', example: 'e.g. GRADE_A, GRADE_3A, PUBLIC_HOSPITAL, SPECIALIST_CLINIC' },
  { value: 'hospitalName', label: 'Hospital Name (hospitalName)', example: 'e.g. General Hospital, Specialist Center' },
  { value: 'items.count', label: 'Invoice Items Count (items.count)', example: 'e.g. 5' },
  { value: 'userQuota.remainingBalance', label: 'Remaining Quota (remainingBalance)', example: 'e.g. 500.00' },
];

const AVAILABLE_OPERATORS = [
  { value: ComparisonOperator.EQUALS, label: 'equals (==)' },
  { value: ComparisonOperator.NOT_EQUALS, label: 'does not equal (!=)' },
  { value: ComparisonOperator.IN, label: 'is in list (in)' },
  { value: ComparisonOperator.NOT_IN, label: 'is not in list (not in)' },
  { value: ComparisonOperator.GREATER_THAN, label: 'greater than (>)' },
  { value: ComparisonOperator.GREATER_EQUAL, label: 'greater or equal (>=)' },
  { value: ComparisonOperator.LESS_THAN, label: 'less than (<)' },
  { value: ComparisonOperator.LESS_EQUAL, label: 'less or equal (<=)' },
  { value: ComparisonOperator.CONTAINS, label: 'contains substring' },
];

// Helper to convert AST Node to expression string
export function astToExpression(node: AstNode): string {
  if (!node) return '';
  if (node.type === 'COMPARISON') {
    if (node.value === undefined || node.value === '' || (Array.isArray(node.value) && node.value.length === 0)) {
      return `claim.${node.field || 'field'} [empty]`;
    }

    const val = Array.isArray(node.value)
      ? `{${node.value.map((v: any) => `"${v}"`).join(' ')}}`
      : typeof node.value === 'string'
      ? `"${node.value}"`
      : `${node.value}`;

    let op = 'eq';
    if (node.operator === ComparisonOperator.EQUALS) op = 'eq';
    if (node.operator === ComparisonOperator.NOT_EQUALS) op = 'ne';
    if (node.operator === ComparisonOperator.GREATER_THAN) op = 'gt';
    if (node.operator === ComparisonOperator.GREATER_EQUAL) op = 'ge';
    if (node.operator === ComparisonOperator.LESS_THAN) op = 'lt';
    if (node.operator === ComparisonOperator.LESS_EQUAL) op = 'le';
    if (node.operator === ComparisonOperator.IN) op = 'in';
    if (node.operator === ComparisonOperator.NOT_IN) op = 'not in';
    if (node.operator === ComparisonOperator.CONTAINS) op = 'contains';

    return `(claim.${node.field} ${op} ${val})`;
  }

  if (node.type === 'LOGICAL') {
    const op = node.operator.toLowerCase();
    const childrenStr = node.children?.map(astToExpression).filter(Boolean) || [];
    if (childrenStr.length === 0) return '';
    if (childrenStr.length === 1) return childrenStr[0];
    return `(${childrenStr.join(` ${op} `)})`;
  }

  return '';
}

interface ConditionItem {
  id: string;
  field: string;
  operator: ComparisonOperator;
  value: any;
}

interface ConditionGroup {
  id: string;
  conditions: ConditionItem[];
}

function astToGroups(ast: AstNode): ConditionGroup[] {
  if (!ast) {
    return [
      {
        id: 'g-1',
        conditions: [
          { id: 'c-1', field: 'category', operator: ComparisonOperator.EQUALS, value: '' },
        ],
      },
    ];
  }

  if (ast.type === 'COMPARISON') {
    return [
      {
        id: 'g-1',
        conditions: [{ id: 'c-1', field: ast.field, operator: ast.operator, value: ast.value }],
      },
    ];
  }

  if (ast.type === 'LOGICAL') {
    if (ast.operator === LogicalOperator.OR) {
      return ast.children.map((child: AstNode, gIdx: number) => {
        if (child.type === 'LOGICAL' && child.operator === LogicalOperator.AND) {
          return {
            id: `g-${gIdx}-${Date.now()}`,
            conditions: child.children.map((sub: AstNode, cIdx: number) => {
              if (sub.type === 'COMPARISON') {
                return { id: `c-${cIdx}-${Date.now()}`, field: sub.field, operator: sub.operator, value: sub.value };
              }
              return { id: `c-${cIdx}`, field: 'category', operator: ComparisonOperator.EQUALS, value: '' };
            }),
          };
        } else if (child.type === 'COMPARISON') {
          return {
            id: `g-${gIdx}-${Date.now()}`,
            conditions: [{ id: `c-0`, field: child.field, operator: child.operator, value: child.value }],
          };
        }
        return { id: `g-${gIdx}`, conditions: [] };
      });
    } else if (ast.operator === LogicalOperator.AND) {
      return [
        {
          id: 'g-root',
          conditions: ast.children.map((child: AstNode, cIdx: number) => {
            if (child.type === 'COMPARISON') {
              return { id: `c-${cIdx}`, field: child.field, operator: child.operator, value: child.value };
            }
            return { id: `c-${cIdx}`, field: 'category', operator: ComparisonOperator.EQUALS, value: '' };
          }),
        },
      ];
    }
  }

  return [
    {
      id: 'g-default',
      conditions: [{ id: 'c-1', field: 'category', operator: ComparisonOperator.EQUALS, value: '' }],
    },
  ];
}

function groupsToAst(groups: ConditionGroup[]): AstNode {
  const validGroups = groups
    .map((g) => ({
      ...g,
      conditions: g.conditions.filter((c) => c.field),
    }))
    .filter((g) => g.conditions.length > 0);

  if (validGroups.length === 0) {
    return {
      type: 'LOGICAL',
      operator: LogicalOperator.AND,
      children: [{ type: 'COMPARISON', field: 'category', operator: ComparisonOperator.EQUALS, value: '' }],
    };
  }

  const groupNodes: AstNode[] = validGroups.map((g) => {
    if (g.conditions.length === 1) {
      const c = g.conditions[0];
      return {
        type: 'COMPARISON',
        field: c.field,
        operator: c.operator,
        value: c.value,
      };
    }
    return {
      type: 'LOGICAL',
      operator: LogicalOperator.AND,
      children: g.conditions.map((c) => ({
        type: 'COMPARISON',
        field: c.field,
        operator: c.operator,
        value: c.value,
      })),
    };
  });

  if (groupNodes.length === 1) {
    return groupNodes[0];
  }

  return {
    type: 'LOGICAL',
    operator: LogicalOperator.OR,
    children: groupNodes,
  };
}

interface AstRuleBuilderProps {
  initialAst: AstNode;
  onChange: (ast: AstNode) => void;
}

export const AstRuleBuilder: React.FC<AstRuleBuilderProps> = ({ initialAst, onChange }) => {
  const [mode, setMode] = useState<'BUILDER' | 'MANUAL'>('BUILDER');
  const [groups, setGroups] = useState<ConditionGroup[]>(() => astToGroups(initialAst));
  const [rawJson, setRawJson] = useState(() => JSON.stringify(initialAst, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    setGroups(astToGroups(initialAst));
    setRawJson(JSON.stringify(initialAst, null, 2));
  }, [initialAst]);

  const updateGroups = (newGroups: ConditionGroup[]) => {
    setGroups(newGroups);
    const ast = groupsToAst(newGroups);
    setRawJson(JSON.stringify(ast, null, 2));
    setJsonError(null);
    onChange(ast);
  };

  const handleRawJsonChange = (text: string) => {
    setRawJson(text);
    try {
      const parsed = JSON.parse(text);
      setJsonError(null);
      setGroups(astToGroups(parsed));
      onChange(parsed);
    } catch (err: any) {
      setJsonError('Invalid JSON AST syntax');
    }
  };

  const handleAddAnd = (groupIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex].conditions.push({
      id: `c-${Date.now()}`,
      field: 'category',
      operator: ComparisonOperator.EQUALS,
      value: '',
    });
    updateGroups(newGroups);
  };

  const handleAddOr = () => {
    const newGroups = [
      ...groups,
      {
        id: `g-${Date.now()}`,
        conditions: [
          {
            id: `c-${Date.now()}`,
            field: 'category',
            operator: ComparisonOperator.EQUALS,
            value: '',
          },
        ],
      },
    ];
    updateGroups(newGroups);
  };

  const handleDeleteCondition = (groupIndex: number, conditionIndex: number) => {
    const newGroups = [...groups];
    newGroups[groupIndex].conditions.splice(conditionIndex, 1);

    if (newGroups[groupIndex].conditions.length === 0) {
      newGroups.splice(groupIndex, 1);
    }

    if (newGroups.length === 0) {
      newGroups.push({
        id: `g-init-${Date.now()}`,
        conditions: [{ id: `c-init`, field: 'category', operator: ComparisonOperator.EQUALS, value: '' }],
      });
    }

    updateGroups(newGroups);
  };

  const handleUpdateCondition = (
    groupIndex: number,
    conditionIndex: number,
    field: string,
    operator: ComparisonOperator,
    value: any,
  ) => {
    const newGroups = [...groups];
    newGroups[groupIndex].conditions[conditionIndex] = {
      ...newGroups[groupIndex].conditions[conditionIndex],
      field,
      operator,
      value,
    };
    updateGroups(newGroups);
  };

  const compiledAst = groupsToAst(groups);
  const expressionPreview = astToExpression(compiledAst);

  return (
    <div className="space-y-4 text-slate-900">
      {/* Header & Mode Switcher */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Rule Definition Mode:</span>
          <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setMode('BUILDER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                mode === 'BUILDER'
                  ? 'bg-white text-[#0a2540] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-indigo-600" />
              <span>Visual Builder</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('MANUAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                mode === 'MANUAL'
                  ? 'bg-white text-[#0a2540] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Code2 className="h-3.5 w-3.5 text-slate-600" />
              <span>Expression / JSON Mode</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] font-mono flex items-center gap-1">
          {jsonError ? (
            <span className="text-rose-600 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Syntax Error
            </span>
          ) : (
            <span className="text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> AST Valid
            </span>
          )}
        </div>
      </div>

      {mode === 'BUILDER' ? (
        /* Visual Config Panel with Unified Left Gutter Alignment */
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            This rule applies to claims matching the custom expression. Conditions in the same group are joined by <span className="font-bold text-indigo-600">And</span>; distinct groups are joined by <span className="font-bold text-amber-600">Or</span>.
          </p>

          <div className="space-y-4">
            {groups.map((group, gIdx) => (
              <div key={group.id} className="space-y-2">
                {/* OR Group Separator Banner */}
                {gIdx > 0 && (
                  <div className="relative flex items-center justify-center my-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-dashed border-amber-300" />
                    </div>
                    <span className="relative px-3 py-0.5 rounded-full text-[11px] font-bold font-mono bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                      Or (Alternatively matches following group)
                    </span>
                  </div>
                )}

                {/* Group Box with Unified Fixed Left Gutter (pl-10) for 100% Horizontal Alignment */}
                <div className="relative pl-10 space-y-3">
                  {/* Left Dashed Branch Connector */}
                  {group.conditions.length > 1 && (
                    <div className="absolute left-3 top-5 bottom-5 w-4 border-l-2 border-dashed border-indigo-300 pointer-events-none flex items-center">
                      <span className="absolute -left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 px-1 py-0.5 rounded shadow-2xs">
                        And
                      </span>
                    </div>
                  )}

                  {/* Conditions inside this group */}
                  {group.conditions.map((condition, cIdx) => (
                    <div key={condition.id} className="relative">
                      {/* Horizontal connecting tick line from vertical tree to row */}
                      {group.conditions.length > 1 && (
                        <div className="absolute -left-7 top-1/2 -translate-y-1/2 w-7 border-t-2 border-dashed border-indigo-300 pointer-events-none" />
                      )}

                      <ConditionRow
                        condition={condition}
                        canDelete={groups.length > 1 || group.conditions.length > 1}
                        onUpdate={(field, op, val) =>
                          handleUpdateCondition(gIdx, cIdx, field, op, val)
                        }
                        onAddAnd={() => handleAddAnd(gIdx)}
                        onAddOr={handleAddOr}
                        onDelete={() => handleDeleteCondition(gIdx, cIdx)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Manual Code / JSON Editor */
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>JSON AST Composite Tree Representation</span>
            <span className="text-[11px] text-slate-400">Two-way synchronized</span>
          </div>
          <textarea
            rows={10}
            value={rawJson}
            onChange={(e) => handleRawJsonChange(e.target.value)}
            className="w-full font-mono text-[11px] p-3.5 rounded-xl border border-slate-200 bg-slate-900 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-slate-950 leading-relaxed"
          />
        </div>
      )}

      {/* Live Generated Expression Preview */}
      <div className="p-3 rounded-xl bg-slate-950 text-slate-100 font-mono text-[11px] space-y-1 shadow-xs border border-slate-800">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Sparkles className="h-3 w-3" /> Generated Rule Expression:
          </span>
          <span className="text-slate-500">Evaluated at runtime</span>
        </div>
        <p className="text-emerald-300 font-semibold break-all">
          {expressionPreview || '(All incoming claims will pass)'}
        </p>
      </div>
    </div>
  );
};

// Single Condition Row
const ConditionRow: React.FC<{
  condition: ConditionItem;
  canDelete: boolean;
  onUpdate: (field: string, operator: ComparisonOperator, value: any) => void;
  onAddAnd: () => void;
  onAddOr: () => void;
  onDelete: () => void;
}> = ({ condition, canDelete, onUpdate, onAddAnd, onAddOr, onDelete }) => {
  const isMultiValue =
    condition.operator === ComparisonOperator.IN || condition.operator === ComparisonOperator.NOT_IN;

  const currentFieldMeta = AVAILABLE_FIELDS.find((f) => f.value === condition.field);

  // Parse tag chips for IN / NOT_IN
  const tags: string[] = Array.isArray(condition.value)
    ? condition.value
    : typeof condition.value === 'string' && condition.value.trim()
    ? condition.value.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const [tagInputText, setTagInputText] = useState('');

  const handleAddTag = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      const nextTags = [...tags, trimmed];
      onUpdate(condition.field, condition.operator, nextTags);
    }
    setTagInputText('');
  };

  const handleRemoveTag = (index: number) => {
    const nextTags = tags.filter((_, i) => i !== index);
    onUpdate(condition.field, condition.operator, nextTags);
  };

  return (
    <div className="space-y-1">
      <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center gap-2">
        {/* 1. Field Dropdown */}
        <div className="w-full md:w-56 shrink-0">
          <Select
            value={condition.field}
            onValueChange={(val) => onUpdate(val, condition.operator, condition.value)}
          >
            <SelectTrigger className="h-9 text-xs font-semibold text-slate-800 bg-slate-50/50">
              <SelectValue placeholder="Select Field" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_FIELDS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 2. Operator Dropdown */}
        <div className="w-full md:w-44 shrink-0">
          <Select
            value={condition.operator}
            onValueChange={(val) =>
              onUpdate(condition.field, val as ComparisonOperator, isMultiValue ? [] : '')
            }
          >
            <SelectTrigger className="h-9 text-xs font-bold text-indigo-700 bg-slate-50/50">
              <SelectValue placeholder="Select Operator" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 3. Value Input (with Multi-Tag Chips support for IN / NOT_IN) */}
        <div className="flex-1 min-w-0">
          {isMultiValue ? (
            <div className="min-h-[36px] p-1.5 rounded-lg border border-slate-200 bg-white flex flex-wrap items-center gap-1.5 focus-within:ring-1 focus-within:ring-slate-950">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(idx)}
                    className="text-indigo-400 hover:text-indigo-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInputText}
                onChange={(e) => setTagInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddTag(tagInputText);
                  }
                }}
                onBlur={() => {
                  if (tagInputText.trim()) handleAddTag(tagInputText);
                }}
                placeholder={tags.length === 0 ? 'Type and press Enter to add (e.g. GRADE_A)' : 'Add more...'}
                className="text-xs font-mono flex-1 min-w-[120px] bg-transparent outline-none px-1"
              />
            </div>
          ) : (
            <Input
              type="text"
              value={condition.value !== undefined ? String(condition.value) : ''}
              onChange={(e) => {
                const text = e.target.value;
                const num = Number(text);
                if (!isNaN(num) && text !== '' && condition.field.includes('Amount')) {
                  onUpdate(condition.field, condition.operator, num);
                } else {
                  onUpdate(condition.field, condition.operator, text);
                }
              }}
              placeholder="Enter threshold value..."
              className="h-9 text-xs font-mono"
            />
          )}
        </div>

        {/* 4. Action Buttons (And, Or, Trash) */}
        <div className="flex items-center gap-1.5 shrink-0 justify-end pt-1 md:pt-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddAnd}
            className="h-8 px-2.5 text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            title="Add parallel AND condition"
          >
            <Plus className="h-3 w-3 mr-0.5" />
            And
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddOr}
            className="h-8 px-2.5 text-xs font-bold text-amber-600 border-amber-200 hover:bg-amber-50"
            title="Add new OR group"
          >
            <Plus className="h-3 w-3 mr-0.5" />
            Or
          </Button>
          {canDelete && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:border-rose-200"
              title="Remove condition"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Helper Example Subtext */}
      {currentFieldMeta && (
        <p className="text-[10px] text-slate-400 pl-2">
          {currentFieldMeta.example}
        </p>
      )}
    </div>
  );
};
