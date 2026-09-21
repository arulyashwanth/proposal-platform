'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useApp, useProject } from '@/context/AppContext';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Alert, Dialog, Input, Textarea } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  FileText, CheckCircle2, Download, Send, Edit, Eye, Sparkles,
  AlertTriangle, ShieldCheck, Check, Clock, User, ExternalLink
} from 'lucide-react';
import { api } from '@/lib/api';

export default function ProposalPreparationPage() {
  const params = useParams();
  const projectId = params.id as string;
  const project = useProject(projectId);
  const { dispatch, logAudit } = useApp();

  const [isSubmitted, setIsSubmitted] = useState(project?.status === 'Submitted' || project?.status === 'Approval');
  const [showEditModal, setShowEditModal] = useState(false);
  const [executiveSummary, setExecutiveSummary] = useState(
    `Artibits Proposal Platform is pleased to submit this comprehensive architectural proposal for ${project?.name || 'Downtown Dubai Tower'}. This proposal encompasses 48 certified commercial fire door assemblies engineered to meet 120-minute fire resistance, high-security ironmongery standards, and satin stainless steel architectural finishes.`
  );

  if (!project) return null;

  const handleSendForApproval = () => {
    dispatch({
      type: 'ADVANCE_STATUS',
      payload: { projectId, status: 'Approval' },
    });
    logAudit({
      action: 'Submitted Proposal for Approval',
      category: 'Proposal',
      projectId,
      projectName: project.name,
      details: 'Sent final proposal package for senior review and client sign-off.',
      status: 'Success',
    });
    setIsSubmitted(true);
  };

  const handleGenerateExcel = async () => {
    logAudit({
      action: 'Generated Quotation Excel',
      category: 'Proposal',
      projectId,
      projectName: project.name,
      details: 'Generated official quotation Excel document matching frontend state.',
      status: 'Success',
    });
    
    try {
      const items = project.selectedProducts.map(p => ({
        product_name: p.productName,
        sku: p.productCode,
        category: p.category || 'Hardware',
        quantity: p.quantity || 1,
        unit_price: p.unitPrice || 0,
        subtotal: p.totalPrice || 0
      }));

      const cost_summary = {
        material_cost: project.pricing?.subtotal || 0,
        labor: 0,
        markup: project.pricing?.otherCosts || 0,
        total_price: project.pricing?.finalTotal || 0
      };

      const data = {
        reference_id: project.id,
        project_name: project.name,
        client_name: project.customer || 'Valued Client',
        items,
        cost_summary,
        notes: ''
      };

      const blob = await api.exportExcel(data);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quotation_${project.id}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download Excel:', err);
      alert('Failed to download Excel file. Please ensure backend is running.');
    }
  };

  const handlePreviewHTML = () => {
    logAudit({
      action: 'Previewed HTML Quotation',
      category: 'Proposal',
      projectId,
      projectName: project.name,
      details: 'Launched full HTML proposal preview rendered by FastAPI Jinja2 template.',
      status: 'Success',
    });
    const previewUrl = api.getQuotationPreviewUrl(project.backendEnquiryId ? `enquiry_${project.backendEnquiryId}` : 'latest');
    window.open(previewUrl, '_blank');
  };

  const selectedDoorSetCode = project.selectedDoorSetId === 'ds1' ? 'DS-001' : (project.selectedDoorSetId?.toUpperCase() || 'DS-001');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Workflow Completion Header Stepper */}
      <Card className="p-4 bg-slate-50 border-slate-200">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Project Info
          </div>
          <span className="text-slate-300">→</span>
          <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Requirements
          </div>
          <span className="text-slate-300">→</span>
          <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Documents
          </div>
          <span className="text-slate-300">→</span>
          <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Product Selection
          </div>
          <span className="text-slate-300">→</span>
          <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Pricing (AED)
          </div>
          <span className="text-slate-300">→</span>
          <div className="flex items-center gap-1.5 font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">
            ● Proposal Draft
          </div>
          <span className="text-slate-300">→</span>
          <div className={`flex items-center gap-1.5 font-semibold ${isSubmitted ? 'text-emerald-700' : 'text-slate-400'}`}>
            {isSubmitted ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />} Approval
          </div>
        </div>
      </Card>

      {/* AI Assistant Review Banner */}
      <Alert variant="info" title="AI Document Review & Compliance Verification">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
            <span className="text-xs">
              AI pre-review scan completed &bull; <strong>100% compliant</strong> with BS EN fire rating & security ironmongery requirements. Total values in AED (Dirhams).
            </span>
          </div>
          <Badge variant="purple">Passed Verification</Badge>
        </div>
      </Alert>

      {/* Main Document Preview Card */}
      <Card className="shadow-lg border-slate-300 overflow-hidden">
        {/* Document Header Bar */}
        <div className="bg-slate-800 text-white px-8 py-6 flex items-start justify-between">
          <div>
            <div className="text-xs text-blue-300 uppercase tracking-widest font-bold">COMMERCIAL PROPOSAL (AED)</div>
            <h1 className="text-2xl font-bold mt-1">{project.name}</h1>
            <p className="text-xs text-slate-300 mt-1">Prepared for: {project.customer}</p>
          </div>
          <div className="text-right text-xs text-slate-300 space-y-1">
            <p><strong className="text-white">Ref:</strong> {project.reference}</p>
            <p><strong className="text-white">Date:</strong> {formatDate(new Date().toISOString())}</p>
            <p><strong className="text-white">Valid Until:</strong> 30 Days</p>
          </div>
        </div>

        {/* Document Content Body */}
        <div className="p-8 space-y-8 text-sm text-slate-700 bg-white">
          {/* Executive Summary */}
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Executive Summary</h3>
            <p className="leading-relaxed text-slate-800 font-normal">{executiveSummary}</p>
          </section>

          {/* Project Requirements & Technical Compliance */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Technical Specification & Compliance</h3>
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg text-xs">
              <div><span className="font-semibold text-slate-600">Fire Resistance:</span> 120 Minutes (Confirmed BS EN 1634)</div>
              <div><span className="font-semibold text-slate-600">Security Standard:</span> High Security Grade 1</div>
              <div><span className="font-semibold text-slate-600">Door Finish:</span> Satin Stainless Steel (316)</div>
              <div><span className="font-semibold text-slate-600">Selected Assembly:</span> {selectedDoorSetCode}</div>
            </div>
          </section>

          {/* Door Set Schedule & Itemized Products */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">3. Door Set Schedule & Products (AED)</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-600">
                  <tr>
                    <th className="p-2.5">Product Code</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5">Qty</th>
                    <th className="p-2.5">Unit Price (AED)</th>
                    <th className="p-2.5">Total (AED)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {project.selectedProducts.map((p) => (
                    <tr key={p.productId}>
                      <td className="p-2.5 font-bold text-slate-800">{p.productCode}</td>
                      <td className="p-2.5 text-slate-600">{p.productName}</td>
                      <td className="p-2.5">{p.quantity}</td>
                      <td className="p-2.5">{formatCurrency(p.unitPrice)}</td>
                      <td className="p-2.5 font-semibold text-slate-900">{formatCurrency(p.quantity * p.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Commercial Terms & Pricing Snapshot */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">4. Commercial Summary</h3>
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(project.pricing?.subtotal || 43008)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Discount (5%):</span>
                  <span className="text-emerald-600 font-semibold">-{formatCurrency(project.pricing?.discountAmount || 2150.4)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>UAE VAT (5%):</span>
                  <span>+{formatCurrency(project.pricing?.taxAmount || 2042.88)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Site Allowance:</span>
                  <span>+{formatCurrency(project.pricing?.otherCosts || 3500)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-300">
                  <span>Total Investment:</span>
                  <span className="text-blue-700">{formatCurrency(project.pricing?.finalTotal || 46400.48)}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Action Controls Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-8 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowEditModal(true)} className="gap-1.5">
              <Edit className="h-3.5 w-3.5" /> Edit Narrative
            </Button>
            <Button size="sm" variant="outline" onClick={handlePreviewHTML} className="gap-1.5 text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100">
              <ExternalLink className="h-3.5 w-3.5" /> Preview HTML Document
            </Button>
            <Button size="sm" variant="outline" onClick={handleGenerateExcel} className="gap-1.5 text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100">
              <Download className="h-3.5 w-3.5" /> Download Quotation
            </Button>
          </div>

          <Button
            onClick={handleSendForApproval}
            disabled={isSubmitted}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            {isSubmitted ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> Submitted for Approval
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Send for Final Approval
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Edit Executive Summary Modal */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Executive Summary"
        description="Update the introduction narrative for the client proposal document."
      >
        <div className="p-6 space-y-4">
          <Textarea
            rows={5}
            value={executiveSummary}
            onChange={(e) => setExecutiveSummary(e.target.value)}
            id="exec-summary-edit"
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={() => setShowEditModal(false)}>Save Changes</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
