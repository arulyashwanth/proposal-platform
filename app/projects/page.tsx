'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { StatusBadge } from '@/components/projects/StatusBadge';
import { Badge, Button, Card, Table, TableHead, TableBody, TableRow, TableHead2, TableCell, EmptyState } from '@/components/ui';
import { formatDate, getDaysUntil } from '@/lib/utils';
import { PlusCircle, FolderOpen, Search, Filter, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { Project, ProjectType } from '@/types';

const STATUS_OPTIONS = ['All', 'Draft', 'Requirements', 'AI Analysis', 'Requirement Review', 'Product Selection', 'Pricing', 'Proposal Draft', 'Human Review', 'Approval', 'Submitted'];
const TYPE_OPTIONS: ('All' | ProjectType)[] = ['All', 'Commercial', 'Residential', 'Healthcare', 'Education', 'Industrial', 'Mixed Use', 'Government', 'Hospitality'];
const STAGE_OPTIONS = ['All', 'Design / Specification', 'Tender', 'Job-in-Hand'];

export default function ProjectsPage() {
  const { state } = useApp();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [type, setType] = useState('All');
  const [stage, setStage] = useState('All');

  const filtered = state.projects.filter((p) => {
    const q = search.toLowerCase();
    return (
      (!search || p.name.toLowerCase().includes(q) || p.customer.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q)) &&
      (status === 'All' || p.status === status) &&
      (type === 'All' || p.projectType === type) &&
      (stage === 'All' || p.stage === stage)
    );
  });

  const getDue = (date: string) => {
    const d = getDaysUntil(date);
    if (d < 0) return <span className="text-xs text-red-600 font-medium">Overdue</span>;
    if (d <= 7) return <span className="text-xs text-amber-600 font-medium">{d}d left</span>;
    return <span className="text-xs text-slate-400">{formatDate(date)}</span>;
  };

  return (
    <AppShell breadcrumbs={[{ label: 'Projects' }]} title="Projects">
      <div className="p-6 max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Projects</h2>
            <p className="text-sm text-slate-500 mt-0.5">{state.projects.length} total projects</p>
          </div>
          <Link href="/projects/new">
            <Button size="lg" className="gap-2"><PlusCircle className="h-4 w-4" />New Project</Button>
          </Link>
        </div>

        <Card>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 flex-1 max-w-xs">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input type="text" placeholder="Search projects, customers, references..." className="bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none w-full" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
              {[{ label: 'Status', value: status, set: setStatus, options: STATUS_OPTIONS }, { label: 'Type', value: type, set: setType, options: TYPE_OPTIONS }, { label: 'Stage', value: stage, set: setStage, options: STAGE_OPTIONS }].map(f => (
                <select key={f.label} aria-label={f.label} className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-600 focus:outline-none" value={f.value} onChange={e => f.set(e.target.value)}>
                  {f.options.map(o => <option key={o}>{o}</option>)}
                </select>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={<FolderOpen className="h-10 w-10" />} title="No projects match your filters" description="Try adjusting the search or filter criteria." />
          ) : (
            <Table>
              <TableHead><tr>
                <TableHead2>Project</TableHead2>
                <TableHead2>Customer</TableHead2>
                <TableHead2>Type / Stage</TableHead2>
                <TableHead2>Status</TableHead2>
                <TableHead2>Est. Quantity</TableHead2>
                <TableHead2>Value</TableHead2>
                <TableHead2>Submission</TableHead2>
                <TableHead2>Owner</TableHead2>
                <TableHead2></TableHead2>
              </tr></TableHead>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <Link href={`/projects/${p.id}`} className="font-medium text-slate-800 hover:text-blue-600 transition-colors">{p.name}</Link>
                        <div className="text-xs text-slate-400">{p.reference}</div>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm text-slate-600">{p.customer}</span></TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="neutral">{p.projectType}</Badge>
                        <span className="text-xs text-slate-400">{p.stage}</span>
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell><span className="text-sm">{p.estimatedDoorQuantity ?? '—'} doors</span></TableCell>
                    <TableCell><span className="text-sm">{p.totalValue ? `£${(p.totalValue / 1000).toFixed(0)}k` : '—'}</span></TableCell>
                    <TableCell>{getDue(p.expectedSubmissionDate)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">{p.owner.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                        <span className="text-xs text-slate-500">{p.owner.split(' ')[0]}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/projects/${p.id}`}><Button size="sm" variant="outline" className="gap-1">Open <ArrowRight className="h-3 w-3" /></Button></Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 rounded-b-lg">
            <p className="text-xs text-slate-400">Showing {filtered.length} of {state.projects.length} projects</p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
