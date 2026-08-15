'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp, useProject } from '@/context/AppContext';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Table, TableHead, TableBody, TableRow, TableHead2, TableCell, Dialog, Alert } from '@/components/ui';
import { SourceReference } from '@/components/ai/SourceReference';
import { formatCurrency } from '@/lib/utils';
import { AIRecommendation } from '@/types';
import {
  Sparkles, CheckCircle2, Check, X, Layers, ArrowRight,
  HelpCircle, Eye, SlidersHorizontal, Scale
} from 'lucide-react';

export default function RecommendationsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const project = useProject(projectId);
  const { dispatch, logAudit } = useApp();

  const [showCompare, setShowCompare] = useState(false);
  const [selectedDetailsRec, setSelectedDetailsRec] = useState<AIRecommendation | null>(null);

  if (!project) return null;

  const handleAccept = (rec: AIRecommendation) => {
    dispatch({
      type: 'SELECT_DOOR_SET',
      payload: { projectId, doorSetId: rec.doorSetId, recommendationId: rec.id },
    });
    logAudit({
      action: 'Accepted AI Recommendation',
      category: 'Recommendation',
      projectId,
      projectName: project.name,
      objectId: rec.doorSetId,
      details: `Accepted recommendation ${rec.doorSetCode} (${rec.matchScore}% match) as primary door set selection.`,
      status: 'Success',
    });
    router.push(`/projects/${projectId}/pricing`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Product Recommendations
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Recommendations generated based on 8 confirmed project requirements.
          </p>
        </div>
        <Button onClick={() => setShowCompare(true)} variant="outline" className="gap-2">
          <Scale className="h-4 w-4 text-purple-600" /> Compare Recommendations
        </Button>
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {project.recommendations.map((rec) => {
          const isSelected = rec.status === 'Accepted' || project.selectedDoorSetId === rec.doorSetId;
          return (
            <Card
              key={rec.id}
              className={`flex flex-col relative transition-all ${
                isSelected
                  ? 'border-2 border-blue-500 shadow-md bg-blue-50/20'
                  : rec.isRecommended
                  ? 'border-2 border-purple-300 shadow-sm'
                  : 'border-slate-200'
              }`}
            >
              {/* Top Match Ribbon */}
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={rec.isRecommended ? 'purple' : 'neutral'}>
                    {rec.isRecommended ? 'Top Recommendation' : 'Alternative'}
                  </Badge>
                  {isSelected && (
                    <Badge variant="success"><Check className="h-3 w-3" /> Selected</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full text-xs font-bold border border-purple-200">
                  <Sparkles className="h-3 w-3" /> {rec.matchScore}% Match
                </div>
              </div>

              <CardContent className="p-5 flex-1 space-y-4">
                <div>
                  <span className="text-xs font-bold text-purple-700">{rec.doorSetCode}</span>
                  <h4 className="text-base font-bold text-slate-800 mt-0.5">{rec.doorSetName}</h4>
                </div>

                {/* Reasons checklist */}
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg text-xs">
                  <p className="font-semibold text-slate-700 mb-1">Why this was recommended:</p>
                  {rec.reasons.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {r.matched ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                      )}
                      <span className={r.matched ? 'text-slate-700' : 'text-slate-400'}>{r.label}</span>
                    </div>
                  ))}
                </div>

                {/* AI Explanation snippet */}
                <div className="text-xs text-slate-600 bg-purple-50/50 border border-purple-100 p-3 rounded-lg leading-relaxed">
                  <p className="font-semibold text-purple-900 mb-1">AI Recommendation Context:</p>
                  {rec.aiExplanation}
                </div>

                {/* Products Summary */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Included Products ({rec.products.length})</p>
                  <div className="space-y-1.5">
                    {rec.products.map((p) => (
                      <div key={p.productId} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                        <span className="text-slate-700 truncate max-w-[180px]">{p.productName}</span>
                        <span className="font-semibold text-slate-800">{formatCurrency(p.unitPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sources List */}
                <div className="pt-2">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Knowledge Sources</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {rec.sources.map((s) => (
                      <SourceReference key={s.id} source={s} />
                    ))}
                  </div>
                </div>
              </CardContent>

              {/* Actions Footer */}
              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2 rounded-b-lg">
                <Button
                  onClick={() => handleAccept(rec)}
                  variant={isSelected ? 'outline' : 'default'}
                  className={`w-full gap-2 ${!isSelected ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
                >
                  {isSelected ? 'Accepted & Active' : 'Accept Recommendation'}
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-xs text-slate-600"
                    onClick={() => setSelectedDetailsRec(rec)}
                  >
                    <Eye className="h-3 w-3 mr-1" /> View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-xs text-purple-700"
                    onClick={() => alert(`Asking AI why ${rec.doorSetCode} was recommended...`)}
                  >
                    <HelpCircle className="h-3 w-3 mr-1" /> Ask AI Why?
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Comparison Modal */}
      <Dialog
        open={showCompare}
        onClose={() => setShowCompare(false)}
        title="Compare AI Door Set Recommendations"
        description="Side-by-side technical evaluation matrix across project requirements."
        size="xl"
      >
        <div className="p-6">
          <Table>
            <TableHead>
              <tr>
                <TableHead2>Feature / Requirement</TableHead2>
                {project.recommendations.map((r) => (
                  <TableHead2 key={r.id}>
                    <div className="text-slate-800 font-bold">{r.doorSetCode}</div>
                    <div className="text-xs font-normal text-purple-600">{r.matchScore}% Match</div>
                  </TableHead2>
                ))}
              </tr>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold">Fire Rating</TableCell>
                <TableCell><Badge variant="success">120 min ✓</Badge></TableCell>
                <TableCell><Badge variant="success">120 min ✓</Badge></TableCell>
                <TableCell><Badge variant="warning">60 min ~</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Security Level</TableCell>
                <TableCell><Badge variant="success">High ✓</Badge></TableCell>
                <TableCell><Badge variant="neutral">Standard</Badge></TableCell>
                <TableCell><Badge variant="neutral">Standard</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Finish</TableCell>
                <TableCell>Stainless Steel</TableCell>
                <TableCell>Chrome</TableCell>
                <TableCell>Aluminium</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Primary Supplier</TableCell>
                <TableCell>Dorma Kaba Group</TableCell>
                <TableCell>Dorma Kaba Group</TableCell>
                <TableCell>Eurospec Ltd</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Est. Door Set Unit Price</TableCell>
                <TableCell className="font-bold text-slate-800">£2,775</TableCell>
                <TableCell className="font-bold text-slate-800">£2,380</TableCell>
                <TableCell className="font-bold text-slate-800">£1,980</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-semibold">Selection Action</TableCell>
                {project.recommendations.map((r) => (
                  <TableCell key={r.id}>
                    <Button size="sm" onClick={() => { handleAccept(r); setShowCompare(false); }}>
                      Select {r.doorSetCode}
                    </Button>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Dialog>
    </div>
  );
}
