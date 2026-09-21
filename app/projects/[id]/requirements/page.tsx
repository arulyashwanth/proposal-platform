'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp, useProject } from '@/context/AppContext';
import { ConfidenceBadge } from '@/components/ai/ConfidenceBadge';
import { SourceReference } from '@/components/ai/SourceReference';
import { Button, Card, CardHeader, CardTitle, CardContent, Table, TableHead, TableBody, TableRow, TableHead2, TableCell, Badge, Dialog, Input, Alert } from '@/components/ui';
import { ProjectRequirement, RequirementStatus } from '@/types';
import { CheckCircle2, Edit2, ArrowRight, Sparkles, Check, FileText, AlertTriangle, RefreshCw, ShieldCheck, Wrench, Plus, Minus, Package } from 'lucide-react';
import { api, ValidationRuleResult, HardwareMatchResult } from '@/lib/api';

export default function RequirementsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const project = useProject(projectId);
  const { dispatch, logAudit } = useApp();

  const [editingReq, setEditingReq] = useState<ProjectRequirement | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationRuleResult | null>(null);
  const [hardwareMatch, setHardwareMatch] = useState<HardwareMatchResult | null>(null);
  const [isMatchingHardware, setIsMatchingHardware] = useState(false);

  async function runHardwareMatch(specs: Record<string, any>) {
    setIsMatchingHardware(true);
    try {
      const res = await api.matchHardwareSets(project?.projectType || 'Commercial', specs);
      if (res) setHardwareMatch(res);
    } catch (e) {
      console.error('Hardware matching failed:', e);
    } finally {
      setIsMatchingHardware(false);
    }
  }

  useEffect(() => {
    async function runValidation() {
      if (!project) return;
      const specs: Record<string, any> = {};
      project.requirements.forEach((r) => {
        specs[r.key || r.label.toLowerCase().replace(/\s+/g, '_')] = r.value;
      });
      specs.door_count = project.estimatedDoorQuantity || 48;
      const res = await api.validateRequirements(project.projectType || 'Commercial', specs);
      if (res) {
        setValidationResult(res);
        // Use hardware_match from validation result if available, else call separately
        if (res.hardware_match) {
          setHardwareMatch(res.hardware_match);
        } else {
          await runHardwareMatch(specs);
        }
      }
    }
    runValidation();
  }, [project]);

  if (!project) return null;

  const handleConfirm = (req: ProjectRequirement) => {
    dispatch({ type: 'CONFIRM_REQUIREMENT', payload: { projectId, requirementId: req.id } });
    logAudit({
      action: 'Confirmed Requirement',
      category: 'Requirement',
      projectId,
      projectName: project.name,
      objectId: req.id,
      details: `Confirmed requirement "${req.label}" = ${req.value}`,
      status: 'Success',
    });
  };

  const handleOpenEdit = (req: ProjectRequirement) => {
    setEditingReq(req);
    setEditValue(req.value);
  };

  const handleSaveEdit = () => {
    if (!editingReq) return;
    dispatch({
      type: 'EDIT_REQUIREMENT',
      payload: { projectId, requirementId: editingReq.id, value: editValue, status: 'Confirmed' },
    });
    logAudit({
      action: 'Edited Requirement',
      category: 'Requirement',
      projectId,
      projectName: project.name,
      objectId: editingReq.id,
      details: `Edited "${editingReq.label}" from "${editingReq.value}" to "${editValue}"`,
      status: 'Success',
    });
    setEditingReq(null);
  };

  const handleConfirmAll = () => {
    dispatch({ type: 'CONFIRM_ALL_REQUIREMENTS', payload: { projectId } });
    logAudit({
      action: 'Confirmed All Requirements',
      category: 'Requirement',
      projectId,
      projectName: project.name,
      details: `Confirmed all ${project.requirements.length} requirements. Advanced to Product Selection.`,
      status: 'Success',
    });
  };

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    const specs: Record<string, any> = {};
    project.requirements.forEach((r) => {
      specs[r.key || r.label.toLowerCase().replace(/\s+/g, '_')] = r.value;
    });
    specs.door_count = project.estimatedDoorQuantity || 48;
    const res = await api.validateRequirements(project.projectType || 'Commercial', specs);
    if (res) {
      setValidationResult(res);
      if (res.hardware_match) {
        setHardwareMatch(res.hardware_match);
      } else {
        await runHardwareMatch(specs);
      }
    }
    setTimeout(() => {
      setIsReanalyzing(false);
      dispatch({ type: 'COMPLETE_ANALYSIS', payload: { projectId } });
    }, 1000);
  };

  const unconfirmedCount = project.requirements.filter((r) => r.status !== 'Confirmed').length;

  return (
    <div className="space-y-6">
      {/* Overview stats bar */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-50 border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase">Project Type</p>
          <p className="text-sm font-bold text-slate-800 mt-1">{project.projectType}</p>
        </Card>
        <Card className="p-4 bg-slate-50 border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase">Stage</p>
          <p className="text-sm font-bold text-slate-800 mt-1">{project.stage}</p>
        </Card>
        <Card className="p-4 bg-slate-50 border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase">Location</p>
          <p className="text-sm font-bold text-slate-800 mt-1">{project.location}</p>
        </Card>
        <Card className="p-4 bg-purple-50 border-purple-200">
          <p className="text-xs font-semibold text-purple-700 uppercase">Estimated Quantity</p>
          <p className="text-sm font-bold text-purple-900 mt-1">{project.estimatedDoorQuantity ?? 48} Doors</p>
        </Card>
      </div>

      {validationResult && (
        <Alert variant={validationResult.valid ? 'success' : 'warning'} title="FastAPI Regulatory & Technical Validation">
          <div className="flex items-center justify-between text-xs">
            <span>{validationResult.summary}</span>
            {validationResult.valid && (
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Rule Template Compliant
              </span>
            )}
          </div>
        </Alert>
      )}

      {unconfirmedCount > 0 && !validationResult && (
        <Alert variant="warning" title="Human Review Required">
          AI extracted {project.requirements.length} requirements from uploaded documents. {unconfirmedCount} requirement{unconfirmedCount > 1 ? 's' : ''} require user review and confirmation before proceeding to product recommendations.
        </Alert>
      )}

      {/* Main Table */}
      <Card>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-slate-800">AI-Extracted Requirements</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleReanalyze} isLoading={isReanalyzing} className="gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Re-run AI Analysis
            </Button>
            <Button size="sm" onClick={handleConfirmAll} className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Confirm All Requirements
            </Button>
          </div>
        </div>

        <Table>
          <TableHead>
            <tr>
              <TableHead2>Requirement</TableHead2>
              <TableHead2>Extracted Value</TableHead2>
              <TableHead2>Confidence</TableHead2>
              <TableHead2>Source Reference</TableHead2>
              <TableHead2>Status</TableHead2>
              <TableHead2>Actions</TableHead2>
            </tr>
          </TableHead>
          <TableBody>
            {project.requirements.map((req) => (
              <TableRow key={req.id}>
                <TableCell>
                  <span className="font-semibold text-slate-800">{req.label}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">{req.value}</span>
                    {req.isEdited && (
                      <Badge variant="purple" size="sm">Edited</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <ConfidenceBadge level={req.confidence} />
                </TableCell>
                <TableCell>
                  <SourceReference
                    source={{
                      id: req.id,
                      label: `${req.source}${req.page ? ` — Page ${req.page}` : ''}`,
                      type: 'Document',
                    }}
                    onClick={() => router.push(`/projects/${projectId}/documents`)}
                  />
                </TableCell>
                <TableCell>
                  {req.status === 'Confirmed' ? (
                    <Badge variant="success"><Check className="h-3 w-3" /> Confirmed</Badge>
                  ) : (
                    <Badge variant="warning">Needs Review</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {req.status !== 'Confirmed' && (
                      <Button size="sm" variant="outline" onClick={() => handleConfirm(req)} className="gap-1 text-xs">
                        <Check className="h-3 w-3" /> Confirm
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(req)} className="gap-1 text-xs">
                      <Edit2 className="h-3 w-3" /> Edit
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-lg">
          <span className="text-xs text-slate-500">
            {project.requirements.filter((r) => r.status === 'Confirmed').length} of {project.requirements.length} requirements confirmed
          </span>
          <Button
            onClick={() => router.push(`/projects/${projectId}/recommendations`)}
            className="gap-2"
          >
            Continue to Product Recommendations <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Hardware Set Matching Results */}
      {(hardwareMatch || isMatchingHardware) && (
        <Card className="border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-800">Hardware Set Matching Results</h3>
              {isMatchingHardware && (
                <span className="text-xs text-slate-400 animate-pulse">Searching…</span>
              )}
            </div>
            {hardwareMatch && (
              <span className="text-xs text-slate-500">{hardwareMatch.summary}</span>
            )}
          </div>

          {hardwareMatch && (
            <div className="p-5 space-y-4">
              {/* Exact Matches */}
              {hardwareMatch.exact_matches.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Exact Matches — Ready to Use
                  </p>
                  <div className="space-y-2">
                    {hardwareMatch.exact_matches.map((hw) => (
                      <div key={hw.id} className="flex items-start justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{hw.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{hw.door_type} · {hw.category}</p>
                          <p className="text-xs text-slate-400 mt-1 italic">{hw.specifications}</p>
                          {hw.component_hits.length > 0 && (
                            <p className="text-xs text-emerald-600 mt-1">
                              ✓ Matched: {hw.component_hits.join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 ml-4 text-right">
                          <Badge variant="success">{hw.match_pct}% Match</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Closest Match + Customisation Plan */}
              {hardwareMatch.closest_match && (
                <div>
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Wrench className="h-3.5 w-3.5" /> Closest Match — Customisation Required
                  </p>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{hardwareMatch.closest_match.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{hardwareMatch.closest_match.door_type} · {hardwareMatch.closest_match.category}</p>
                        <p className="text-xs text-slate-400 mt-1 italic">{hardwareMatch.closest_match.specifications}</p>
                      </div>
                      <Badge variant="warning" className="shrink-0 ml-4">{hardwareMatch.closest_match.match_pct}% Match</Badge>
                    </div>

                    {hardwareMatch.customisation_plan && (
                      <div className="mt-3 pt-3 border-t border-amber-200 space-y-2">
                        <p className="text-xs font-semibold text-slate-600">Customisation Plan:</p>
                        {hardwareMatch.customisation_plan.add.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-emerald-700 flex items-center gap-1 mb-1">
                              <Plus className="h-3 w-3" /> Add Components:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {hardwareMatch.customisation_plan.add.map((comp, i) => (
                                <span key={i} className="inline-block bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full border border-emerald-200">
                                  {comp}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {hardwareMatch.customisation_plan.remove.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-red-600 flex items-center gap-1 mb-1">
                              <Minus className="h-3 w-3" /> Review / Remove:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {hardwareMatch.customisation_plan.remove.map((comp, i) => (
                                <span key={i} className="inline-block bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full border border-red-200">
                                  {comp}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-slate-500 italic mt-1">{hardwareMatch.customisation_plan.rationale}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* All scored sets (collapsed table) */}
              {hardwareMatch.all_scored.length > 1 && (
                <details className="text-xs text-slate-500">
                  <summary className="cursor-pointer hover:text-slate-700 font-medium">
                    View all {hardwareMatch.all_scored.length} hardware sets scored ↓
                  </summary>
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-left">
                          <th className="px-3 py-2 font-semibold text-slate-600">Name</th>
                          <th className="px-3 py-2 font-semibold text-slate-600">Category</th>
                          <th className="px-3 py-2 font-semibold text-slate-600">Door Type</th>
                          <th className="px-3 py-2 font-semibold text-slate-600 text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hardwareMatch.all_scored.map((hw) => (
                          <tr key={hw.id} className="border-t border-slate-100">
                            <td className="px-3 py-2 font-medium text-slate-700">{hw.name}</td>
                            <td className="px-3 py-2 text-slate-500">{hw.category}</td>
                            <td className="px-3 py-2 text-slate-500">{hw.door_type}</td>
                            <td className="px-3 py-2 text-right">
                              <span className={`font-semibold ${hw.is_exact_match ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {hw.match_pct}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Edit Modal */}
      <Dialog
        open={!!editingReq}
        onClose={() => setEditingReq(null)}
        title={`Edit ${editingReq?.label}`}
        description="Override the AI-extracted requirement value with human verified data."
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">AI Extracted Value</label>
            <p className="text-sm font-medium text-slate-800 mt-1">{editingReq?.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">Source: {editingReq?.source} (Page {editingReq?.page ?? 1})</p>
          </div>
          <Input
            label="Corrected / Confirmed Value *"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            id="edit-req-value"
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditingReq(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save & Confirm</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
