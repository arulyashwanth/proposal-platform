'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Textarea, Select, Alert, ProgressBar } from '@/components/ui';
import { ProjectType, ProjectStage, DocumentType, ProjectDocument } from '@/types';
import { generateId, formatFileSize } from '@/lib/utils';
import {
  FileText, UploadCloud, CheckCircle2, ArrowRight, ArrowLeft,
  X, File, Sparkles, Building2, HelpCircle
} from 'lucide-react';

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'Commercial', label: 'Commercial Building' },
  { value: 'Residential', label: 'Residential Development' },
  { value: 'Healthcare', label: 'Healthcare / Hospital' },
  { value: 'Education', label: 'Educational Facility' },
  { value: 'Industrial', label: 'Industrial / Warehouse' },
  { value: 'Mixed Use', label: 'Mixed Use Development' },
  { value: 'Government', label: 'Government / Public Sector' },
  { value: 'Hospitality', label: 'Hotel / Hospitality' },
];

const STAGE_OPTIONS: { value: ProjectStage; label: string }[] = [
  { value: 'Design / Specification', label: 'Design / Specification' },
  { value: 'Tender', label: 'Tender' },
  { value: 'Job-in-Hand', label: 'Job-in-Hand' },
];

export default function NewProjectPage() {
  const router = useRouter();
  const { dispatch, logAudit } = useApp();

  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    customer: '',
    reference: `VSP-2026-0${Math.floor(1000 + Math.random() * 9000)}`,
    projectType: 'Commercial' as ProjectType,
    stage: 'Tender' as ProjectStage,
    location: '',
    expectedSubmissionDate: '2026-10-15',
    owner: 'Sarah Mitchell',
    description: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<ProjectDocument[]>([
    {
      id: 'doc-init-1',
      filename: 'Architecture_A102.pdf',
      type: 'PDF',
      size: 4200000,
      uploadDate: new Date().toISOString().split('T')[0],
      uploadedBy: 'Sarah Mitchell',
      status: 'Processed',
      usedInProject: true,
      detectedItemsCount: 12,
      pageCount: 24,
    },
    {
      id: 'doc-init-2',
      filename: 'Door_Schedule.pdf',
      type: 'PDF',
      size: 1800000,
      uploadDate: new Date().toISOString().split('T')[0],
      uploadedBy: 'Sarah Mitchell',
      status: 'Processed',
      usedInProject: true,
      detectedItemsCount: 48,
      pageCount: 8,
    },
  ]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    const newDocs: ProjectDocument[] = files.map((file) => {
      const ext = file.name.split('.').pop()?.toUpperCase() as DocumentType || 'PDF';
      return {
        id: generateId(),
        filename: file.name,
        type: ext,
        size: file.size,
        uploadDate: new Date().toISOString().split('T')[0],
        uploadedBy: 'Sarah Mitchell',
        status: 'Processed',
        usedInProject: true,
        detectedItemsCount: Math.floor(Math.random() * 20) + 5,
        pageCount: Math.floor(Math.random() * 30) + 1,
      };
    });
    setUploadedFiles((prev) => [...prev, ...newDocs]);
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((d) => d.id !== id));
  };

  const handleAnalyse = () => {
    setIsAnalyzing(true);
    setAnalysisProgress(10);
    setAnalysisLogs(['Analysing project information...']);

    setTimeout(() => {
      setAnalysisProgress(35);
      setAnalysisLogs((prev) => [...prev, '✓ Project information processed']);
    }, 600);

    setTimeout(() => {
      setAnalysisProgress(65);
      setAnalysisLogs((prev) => [...prev, '✓ Documents processed']);
    }, 1200);

    setTimeout(() => {
      setAnalysisProgress(85);
      setAnalysisLogs((prev) => [...prev, '✓ Requirements extracted']);
    }, 1800);

    setTimeout(() => {
      setAnalysisProgress(100);
      setAnalysisLogs((prev) => [
        ...prev,
        '✓ Door requirements identified',
        '✓ Relevant knowledge sources searched',
      ]);

      // Create Project and redirect
      const newProjectId = `proj-${generateId()}`;
      const newProj = {
        id: newProjectId,
        name: formData.name || 'New Commercial Project',
        reference: formData.reference,
        customer: formData.customer || 'Commercial Client Ltd',
        projectType: formData.projectType,
        stage: formData.stage,
        status: 'Requirement Review' as const,
        location: formData.location || 'London, UK',
        expectedSubmissionDate: formData.expectedSubmissionDate,
        owner: formData.owner,
        ownerId: 'u1',
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        estimatedDoorQuantity: 48,
        totalValue: 134880,
        description: formData.description,
        requirements: [
          { id: 'nreq1', label: 'Fire Rating', key: 'fireRating', value: '120 minutes', confidence: 'High' as const, source: 'Specification.pdf', page: 12, status: 'Needs Review' as const, isEdited: false },
          { id: 'nreq2', label: 'Door Type', key: 'doorType', value: 'Internal', confidence: 'High' as const, source: 'Door Schedule.pdf', page: 4, status: 'Needs Review' as const, isEdited: false },
          { id: 'nreq3', label: 'Security Level', key: 'securityLevel', value: 'High', confidence: 'Medium' as const, source: 'Specification.pdf', page: 18, status: 'Needs Review' as const, isEdited: false },
          { id: 'nreq4', label: 'Finish', key: 'finish', value: 'Stainless Steel', confidence: 'Medium' as const, source: 'Drawing.pdf', page: 6, status: 'Needs Review' as const, isEdited: false },
          { id: 'nreq5', label: 'Estimated Door Quantity', key: 'doorQuantity', value: '48 doors', confidence: 'High' as const, source: 'Door Schedule.pdf', page: 4, status: 'Confirmed' as const, isEdited: false },
        ],
        documents: uploadedFiles,
        recommendations: [
          {
            id: 'nrec1',
            doorSetId: 'ds1',
            doorSetCode: 'DS-004',
            doorSetName: 'Commercial Fire Door Set — 120min High Security',
            matchScore: 94,
            isRecommended: true,
            reasons: [
              { label: 'Matches project type', matched: true },
              { label: 'Meets 120-minute fire rating requirement', matched: true },
              { label: 'Available in approved library', matched: true },
              { label: 'Supplier pricing available', matched: true },
            ],
            aiExplanation: 'Recommended based on 120-minute fire rating and high security specification.',
            sources: [{ id: 's1', label: 'Specification.pdf — Page 12', type: 'Document' as const }],
            products: [
              { productId: 'prod1', productCode: 'FDL-120-SS', productName: 'Fire Door Leaf — 120 min', quantity: 48, unitPrice: 1200, supplierId: 'sup1', supplierName: 'Dorma Kaba Group', availability: 'Available' },
              { productId: 'prod2', productCode: 'DFR-COM-SS', productName: 'Door Frame — Commercial Grade', quantity: 48, unitPrice: 850, supplierId: 'sup1', supplierName: 'Dorma Kaba Group', availability: 'Available' },
            ],
            status: 'Pending' as const,
          },
        ],
        selectedProducts: [],
        analysisCompleted: true,
        requirementsConfirmed: false,
        pricingApproved: false,
      };

      dispatch({ type: 'CREATE_PROJECT', payload: newProj });
      logAudit({
        action: 'Created New Project & Analyzed Requirements',
        category: 'Project',
        projectId: newProjectId,
        projectName: newProj.name,
        details: `Created project ${newProj.name} (${newProj.reference}) and completed AI requirement extraction.`,
        status: 'Success',
      });

      router.push(`/projects/${newProjectId}/requirements`);
    }, 2400);
  };

  return (
    <AppShell
      breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'New Project' }]}
      title="Create New Project"
    >
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Step indicator */}
        <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-slate-200">
          <div className={`flex items-center gap-2 text-sm font-semibold ${step === 1 ? 'text-blue-600' : 'text-slate-500'}`}>
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>1</span>
            Step 1: Project Information
          </div>
          <div className="h-px bg-slate-200 flex-1" />
          <div className={`flex items-center gap-2 text-sm font-semibold ${step === 2 ? 'text-blue-600' : 'text-slate-400'}`}>
            <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${step === 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2</span>
            Step 2: Project Requirements & Documents
          </div>
        </div>

        {step === 1 ? (
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Project Name *"
                  placeholder="e.g. Metro Office Refurbishment"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  id="project-name"
                />
                <Input
                  label="Customer / Client *"
                  placeholder="e.g. Apex Developments Ltd"
                  value={formData.customer}
                  onChange={(e) => handleInputChange('customer', e.target.value)}
                  id="customer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Project Reference"
                  value={formData.reference}
                  onChange={(e) => handleInputChange('reference', e.target.value)}
                  id="reference"
                />
                <Select
                  label="Project Type *"
                  options={PROJECT_TYPES}
                  value={formData.projectType}
                  onChange={(e) => handleInputChange('projectType', e.target.value)}
                  id="project-type"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Select
                  label="Project Stage *"
                  options={STAGE_OPTIONS}
                  value={formData.stage}
                  onChange={(e) => handleInputChange('stage', e.target.value)}
                  id="project-stage"
                />
                <Input
                  label="Project Location"
                  placeholder="e.g. Manchester, UK"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  id="location"
                />
                <Input
                  label="Expected Submission Date"
                  type="date"
                  value={formData.expectedSubmissionDate}
                  onChange={(e) => handleInputChange('expectedSubmissionDate', e.target.value)}
                  id="submission-date"
                />
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <Button variant="outline" onClick={() => router.push('/projects')}>Cancel</Button>
                <Button onClick={() => setStep(2)} className="gap-2">
                  Continue to Requirements <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">
                    Natural-language Project Description / Specification Notes
                  </label>
                  <Textarea
                    rows={4}
                    placeholder="Describe the project requirements, fire rating expectations, door leaf finishes, acoustic goals, or security standards..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    id="description"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    The AI will extract structured requirements (fire rating, quantity, finishes) from this text and uploaded documents.
                  </p>
                </div>

                {/* Upload Zone */}
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">
                    Upload Documents (Architectural Drawings, Door Schedules, Specifications)
                  </label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                    <UploadCloud className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700">Drag & drop project files here, or browse</p>
                    <p className="text-xs text-slate-400 mt-1">Supported formats: PDF, DOCX, XLSX, DWG, PNG/JPEG</p>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      id="file-upload"
                      onChange={handleFileUpload}
                    />
                    <label htmlFor="file-upload" className="inline-block mt-3">
                      <Button size="sm" variant="outline" type="button">Select Files</Button>
                    </label>
                  </div>
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Attached Documents ({uploadedFiles.length})</p>
                    <div className="space-y-2">
                      {uploadedFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center">
                              <File className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{file.filename}</p>
                              <p className="text-xs text-slate-400">{file.type} • {formatFileSize(file.size)} • {file.status}</p>
                            </div>
                          </div>
                          <button onClick={() => removeFile(file.id)} className="text-slate-400 hover:text-red-600 p-1">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Processing Modal / Progress overlay */}
                {isAnalyzing && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-600 animate-spin" />
                        <span className="text-sm font-semibold text-purple-900">Analysing Project Requirements...</span>
                      </div>
                      <span className="text-xs font-medium text-purple-700">{analysisProgress}%</span>
                    </div>
                    <ProgressBar value={analysisProgress} />
                    <div className="text-xs text-purple-800 space-y-1 font-mono">
                      {analysisLogs.map((log, i) => (
                        <p key={i}>{log}</p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <Button variant="outline" onClick={() => setStep(1)} disabled={isAnalyzing}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button onClick={handleAnalyse} isLoading={isAnalyzing} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
                    <Sparkles className="h-4 w-4" /> Analyse Requirements
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
