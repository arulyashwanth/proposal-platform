'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp, useProject } from '@/context/AppContext';
import { ConfidenceBadge } from '@/components/ai/ConfidenceBadge';
import { SourceReference } from '@/components/ai/SourceReference';
import { Button, Card, CardHeader, CardTitle, CardContent, Table, TableHead, TableBody, TableRow, TableHead2, TableCell, Badge, Dialog, Input, Alert } from '@/components/ui';
import { ProjectRequirement, RequirementStatus } from '@/types';
import { CheckCircle2, Edit2, ArrowRight, Sparkles, Check, FileText, AlertTriangle, RefreshCw } from 'lucide-react';

export default function RequirementsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const project = useProject(projectId);
  const { dispatch, logAudit } = useApp();

  const [editingReq, setEditingReq] = useState<ProjectRequirement | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isReanalyzing, setIsReanalyzing] = useState(false);

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

  const handleReanalyze = () => {
    setIsReanalyzing(true);
    setTimeout(() => {
      setIsReanalyzing(false);
      dispatch({ type: 'COMPLETE_ANALYSIS', payload: { projectId } });
    }, 1500);
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

      {unconfirmedCount > 0 && (
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
