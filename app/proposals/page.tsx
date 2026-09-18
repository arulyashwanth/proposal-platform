'use client';
import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { Badge, Button, Card, Table, TableHead, TableBody, TableRow, TableHead2, TableCell, EmptyState } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils';
import { FileText, Download, Eye, Send, CheckCircle2, Clock, AlertTriangle, X as XIcon } from 'lucide-react';
import Link from 'next/link';

const STATUS_CONFIG = {
  Draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  'In Review': { label: 'In Review', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  Approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Submitted: { label: 'Submitted', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  Rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200' },
};

export default function ProposalsPage() {
  const { state } = useApp();

  const proposals = state.projects.map((p, idx) => {
    let proposalStatus = 'Draft';
    if (p.status === 'Submitted') proposalStatus = 'Submitted';
    else if (p.pricingApproved || p.status === 'Approval') proposalStatus = 'Approved';
    else if (p.status === 'Human Review' || p.status === 'Requirement Review') proposalStatus = 'In Review';
    else proposalStatus = 'Draft';

    const value = p.pricing?.finalTotal || p.totalValue || 0;

    return {
      id: `prop-${p.id}`,
      projectId: p.id,
      title: `${p.name} — Commercial Proposal`,
      reference: p.reference,
      customer: p.customer,
      version: idx === 1 ? 2 : 1,
      status: proposalStatus,
      preparedBy: p.owner,
      preparedDate: p.updatedAt || p.createdAt,
      value: value,
    };
  });

  const totalSubmittedValue = proposals.filter(p => p.status === 'Submitted').reduce((s, p) => s + p.value, 0);

  return (
    <AppShell breadcrumbs={[{ label: 'Proposals' }]} title="Proposals">
      <div className="p-6 max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Proposals</h2>
            <p className="text-sm text-slate-500 mt-0.5">{proposals.length} active project proposals &bull; {formatCurrency(totalSubmittedValue)} submitted</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[['Draft', 'bg-slate-50 border-slate-200 text-slate-700'], ['In Review', 'bg-amber-50 border-amber-200 text-amber-700'], ['Approved', 'bg-emerald-50 border-emerald-200 text-emerald-700'], ['Submitted', 'bg-blue-50 border-blue-200 text-blue-700']].map(([s, cls]) => (
            <div key={s} className={`rounded-lg border px-4 py-3 ${cls}`}>
              <div className="text-lg font-bold">{proposals.filter(p => p.status === s).length}</div>
              <div className="text-xs font-medium">{s}</div>
            </div>
          ))}
        </div>
        <Card>
          <Table>
            <TableHead><tr>
              <TableHead2>Proposal</TableHead2>
              <TableHead2>Customer</TableHead2>
              <TableHead2>Version</TableHead2>
              <TableHead2>Status</TableHead2>
              <TableHead2>Value (AED)</TableHead2>
              <TableHead2>Prepared</TableHead2>
              <TableHead2>By</TableHead2>
              <TableHead2>Actions</TableHead2>
            </tr></TableHead>
            <TableBody>
              {proposals.map(p => {
                const cfg = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.Draft;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-800">{p.title}</div>
                        <div className="text-xs text-slate-400">{p.reference}</div>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm text-slate-600">{p.customer}</span></TableCell>
                    <TableCell><span className="text-xs text-slate-500">v{p.version}</span></TableCell>
                    <TableCell><span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.className}`}>{cfg.label}</span></TableCell>
                    <TableCell><span className="text-sm font-medium">{p.value > 0 ? formatCurrency(p.value) : '—'}</span></TableCell>
                    <TableCell><span className="text-xs text-slate-400">{formatDate(p.preparedDate)}</span></TableCell>
                    <TableCell><span className="text-xs text-slate-500">{p.preparedBy.split(' ')[0]}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={`/projects/${p.projectId}/proposal`}>
                          <Button size="sm" variant="ghost" className="gap-1"><Eye className="h-3 w-3" />View</Button>
                        </Link>
                        <Link href={`/projects/${p.projectId}/proposal`}>
                          <Button size="sm" variant="ghost" className="gap-1"><Download className="h-3 w-3" />PDF</Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppShell>
  );
}
