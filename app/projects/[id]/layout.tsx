'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useProject } from '@/context/AppContext';
import { WorkflowStepper } from '@/components/projects/WorkflowStepper';
import { StatusBadge } from '@/components/projects/StatusBadge';
import { Badge, TabsList, TabsTrigger, Button } from '@/components/ui';
import { FileText, FolderOpen, Layers, DollarSign, FileCheck, Eye, Calendar, Building, Sparkles } from 'lucide-react';

export default function ProjectWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const projectId = params.id as string;
  const project = useProject(projectId);
  const pathname = usePathname();

  if (!project) {
    return (
      <AppShell breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'Project Workspace' }]}>
        <div className="p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-800">Project Not Found</h2>
          <p className="text-sm text-slate-500 mt-1">The requested project reference &quot;{projectId}&quot; does not exist.</p>
          <Link href="/projects" className="inline-block mt-4">
            <Button size="sm">Return to Projects</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const tabs = [
    { label: 'Requirements', href: `/projects/${projectId}/requirements`, icon: FileText, badge: project.requirements.length },
    { label: 'Documents', href: `/projects/${projectId}/documents`, icon: FolderOpen, badge: project.documents.length },
    { label: 'Recommendations', href: `/projects/${projectId}/recommendations`, icon: Layers, badge: project.recommendations.length },
    { label: 'Pricing Workspace', href: `/projects/${projectId}/pricing`, icon: DollarSign, isApproved: project.pricingApproved },
    { label: 'Proposal & Review', href: `/projects/${projectId}/proposal`, icon: FileCheck },
  ];

  return (
    <AppShell
      breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: project.name }]}
      title={project.name}
      projectName={project.name}
      showAIAssistant={true}
    >
      <div className="flex flex-col h-[calc(100vh-3.5rem)]">
        {/* Workspace Top Header Bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-800">{project.name}</h2>
              <StatusBadge status={project.status} />
              <Badge variant="neutral">{project.projectType}</Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Building className="h-3.5 w-3.5" />{project.customer}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Due: {project.expectedSubmissionDate}</span>
            </div>
          </div>

          {/* Stepper */}
          <WorkflowStepper currentStatus={project.status} />

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 pt-2 -mb-4">
            {tabs.map((tab) => {
              const active = pathname.startsWith(tab.href);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    active
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge != null && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-semibold">{tab.badge}</span>
                  )}
                  {tab.isApproved && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">Approved</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Dynamic Workspace Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </AppShell>
  );
}
