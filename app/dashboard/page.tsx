'use client';

import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { StatusBadge } from '@/components/projects/StatusBadge';
import { Badge, Button, Card, CardContent, EmptyState, Table, TableHead, TableBody, TableRow, TableHead2, TableCell } from '@/components/ui';
import { formatDate, formatCurrency, formatRelativeTime, getDaysUntil } from '@/lib/utils';
import { Project, ProjectType } from '@/types';
import Link from 'next/link';
import {
  PlusCircle, FolderOpen, Clock, CheckCircle2, Send, TrendingUp,
  Search, Filter, ArrowRight, Calendar, AlertTriangle,
} from 'lucide-react';

// ============================================================
// Summary Cards
// ============================================================
function SummaryCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string; color: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color.replace('text-', 'bg-').replace('700', '100')}`}>
          <div className={color}>{icon}</div>
        </div>
      </div>
    </Card>
  );
}

// ============================================================
// Projects Table
// ============================================================
const STATUS_FILTER_OPTIONS = [
  'All', 'Draft', 'Requirements', 'AI Analysis', 'Requirement Review',
  'Product Selection', 'Pricing', 'Proposal Draft', 'Human Review', 'Approval', 'Submitted',
];
const TYPE_FILTER_OPTIONS: ('All' | ProjectType)[] = [
  'All', 'Commercial', 'Residential', 'Healthcare', 'Education', 'Industrial', 'Mixed Use', 'Government', 'Hospitality',
];
const STAGE_FILTER_OPTIONS = ['All', 'Design / Specification', 'Tender', 'Job-in-Hand'];
const OWNER_FILTER_OPTIONS = ['All', 'Sarah Mitchell', 'James Thornton', 'Emma Fitzgerald'];

function ProjectsTable({ projects }: { projects: Project[] }) {
  const getDueBadge = (dateStr: string) => {
    const days = getDaysUntil(dateStr);
    if (days < 0) return <span className="text-xs text-red-600 font-medium">Overdue</span>;
    if (days <= 7) return <span className="text-xs text-amber-600 font-medium">{days}d left</span>;
    if (days <= 30) return <span className="text-xs text-slate-500">{days}d left</span>;
    return <span className="text-xs text-slate-400">{formatDate(dateStr)}</span>;
  };

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={<FolderOpen className="h-12 w-12" />}
        title="No projects found"
        description="Try adjusting your filters or create a new project to get started."
        action={
          <Link href="/projects/new">
            <Button size="sm"><PlusCircle className="h-4 w-4" />New Project</Button>
          </Link>
        }
      />
    );
  }

  return (
    <Table>
      <TableHead>
        <tr>
          <TableHead2>Project</TableHead2>
          <TableHead2>Customer</TableHead2>
          <TableHead2>Type</TableHead2>
          <TableHead2>Stage</TableHead2>
          <TableHead2>Status</TableHead2>
          <TableHead2>Submission</TableHead2>
          <TableHead2>Owner</TableHead2>
          <TableHead2>Action</TableHead2>
        </tr>
      </TableHead>
      <TableBody>
        {projects.map((project) => (
          <TableRow key={project.id}>
            <TableCell>
              <div>
                <Link
                  href={`/projects/${project.id}`}
                  className="font-medium text-slate-800 hover:text-blue-600 transition-colors"
                >
                  {project.name}
                </Link>
                <div className="text-xs text-slate-400 mt-0.5">{project.reference}</div>
              </div>
            </TableCell>
            <TableCell>
              <div className="text-sm text-slate-600">{project.customer}</div>
            </TableCell>
            <TableCell>
              <Badge variant="neutral">{project.projectType}</Badge>
            </TableCell>
            <TableCell>
              <span className="text-xs text-slate-500">{project.stage}</span>
            </TableCell>
            <TableCell>
              <StatusBadge status={project.status} />
            </TableCell>
            <TableCell>
              {getDueBadge(project.expectedSubmissionDate)}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
                  {project.owner.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <span className="text-xs text-slate-500">{project.owner.split(' ')[0]}</span>
              </div>
            </TableCell>
            <TableCell>
              {project.status !== 'Submitted' ? (
                <Link href={`/projects/${project.id}`}>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    Continue <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              ) : (
                <Link href={`/projects/${project.id}/proposal`}>
                  <Button size="sm" variant="ghost">View</Button>
                </Link>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ============================================================
// Dashboard Page
// ============================================================
export default function DashboardPage() {
  const { state } = useApp();
  const { projects } = state;
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('All');
  const [typeFilter, setTypeFilter] = React.useState('All');
  const [stageFilter, setStageFilter] = React.useState('All');
  const [ownerFilter, setOwnerFilter] = React.useState('All');

  // Summary stats
  const activeCount = projects.filter((p) => !['Draft', 'Submitted'].includes(p.status)).length;
  const awaitingReviewCount = projects.filter((p) => ['Human Review', 'Requirement Review'].includes(p.status)).length;
  const readyCount = projects.filter((p) => ['Approval', 'Proposal Draft'].includes(p.status)).length;
  const completedCount = projects.filter((p) => p.status === 'Submitted').length;

  // Filter projects
  const filtered = projects.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.customer.toLowerCase().includes(search.toLowerCase()) ||
      p.reference.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    const matchesType = typeFilter === 'All' || p.projectType === typeFilter;
    const matchesStage = stageFilter === 'All' || p.stage === stageFilter;
    const matchesOwner = ownerFilter === 'All' || p.owner === ownerFilter;
    return matchesSearch && matchesStatus && matchesType && matchesStage && matchesOwner;
  });

  // Hour of day for greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <AppShell
      breadcrumbs={[{ label: 'Dashboard' }]}
      title="Dashboard"
    >
      <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              {greeting}, {state.projects[0]?.owner.split(' ')[0] ?? 'Sarah'}.
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              You have {activeCount} active project{activeCount !== 1 ? 's' : ''}
              {awaitingReviewCount > 0 && ` and ${awaitingReviewCount} awaiting your review`}.
            </p>
          </div>
          <Link href="/projects/new">
            <Button size="lg" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Active Projects"
            value={activeCount}
            sub="Across all stages"
            color="text-blue-700"
          />
          <SummaryCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Awaiting Review"
            value={awaitingReviewCount}
            sub="Require your attention"
            color="text-amber-700"
          />
          <SummaryCard
            icon={<Clock className="h-5 w-5" />}
            label="Ready for Submission"
            value={readyCount}
            sub="Approved and staged"
            color="text-violet-700"
          />
          <SummaryCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Completed This Month"
            value={completedCount}
            sub="Successfully submitted"
            color="text-emerald-700"
          />
        </div>

        {/* Projects table */}
        <Card>
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Recent Projects</h3>
              <Link href="/projects" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Filters row */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 flex-1 max-w-xs">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  className="bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                >
                  {STATUS_FILTER_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
                <select
                  className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  aria-label="Filter by project type"
                >
                  {TYPE_FILTER_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
                <select
                  className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  aria-label="Filter by stage"
                >
                  {STAGE_FILTER_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
                <select
                  className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  aria-label="Filter by owner"
                >
                  {OWNER_FILTER_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              {(search || statusFilter !== 'All' || typeFilter !== 'All' || stageFilter !== 'All' || ownerFilter !== 'All') && (
                <button
                  onClick={() => { setSearch(''); setStatusFilter('All'); setTypeFilter('All'); setStageFilter('All'); setOwnerFilter('All'); }}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Clear filters
                </button>
              )}
            </div>
          </div>
          <ProjectsTable projects={filtered} />
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 rounded-b-lg">
            <p className="text-xs text-slate-400">
              Showing {filtered.length} of {projects.length} projects
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
