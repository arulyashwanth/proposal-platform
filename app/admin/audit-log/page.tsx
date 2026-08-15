'use client';
import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { Badge, Card, Table, TableHead, TableBody, TableRow, TableHead2, TableCell } from '@/components/ui';
import { formatDateTime } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, Search } from 'lucide-react';
import Link from 'next/link';

const CATEGORY_OPTIONS = ['All', 'Project', 'Requirement', 'Recommendation', 'Pricing', 'Proposal', 'Knowledge', 'Admin', 'AI'];

export default function AuditLogPage() {
  const { state } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = state.auditLog.filter(e =>
    (category === 'All' || e.category === category) &&
    (!search || e.action.toLowerCase().includes(search.toLowerCase()) || (e.projectName ?? '').toLowerCase().includes(search.toLowerCase()) || e.userName.toLowerCase().includes(search.toLowerCase()))
  );

  const statusIcon = (s: string) => {
    if (s === 'Success') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (s === 'Warning') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <AppShell breadcrumbs={[{ label: 'Administration', href: '/admin' }, { label: 'Audit Log' }]} title="Audit Log">
      <div className="p-6 max-w-screen-xl">
        <div className="flex items-center justify-between mb-6">
          <div><h2 className="text-lg font-semibold text-slate-800">Audit Log</h2><p className="text-sm text-slate-500 mt-0.5">Complete record of user actions and AI interactions</p></div>
        </div>
        <Card>
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 flex-1 max-w-sm">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input type="text" placeholder="Search actions, projects, users..." className="bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none w-full" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-600 focus:outline-none" value={category} onChange={e => setCategory(e.target.value)} aria-label="Filter by category">
              {CATEGORY_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <Table>
            <TableHead><tr>
              <TableHead2>Timestamp</TableHead2>
              <TableHead2>User</TableHead2>
              <TableHead2>Action</TableHead2>
              <TableHead2>Category</TableHead2>
              <TableHead2>Project</TableHead2>
              <TableHead2>Details</TableHead2>
              <TableHead2>Status</TableHead2>
            </tr></TableHead>
            <TableBody>
              {filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell><span className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(e.timestamp)}</span></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">{e.userName.split(' ').map(n => n[0]).join('')}</div>
                      <div>
                        <div className="text-xs font-medium text-slate-700">{e.userName}</div>
                        <div className="text-xs text-slate-400">{e.userRole}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-sm font-medium text-slate-800">{e.action}</span></TableCell>
                  <TableCell><Badge variant="neutral">{e.category}</Badge></TableCell>
                  <TableCell>
                    {e.projectId ? (
                      <Link href={`/projects/${e.projectId}`} className="text-xs text-blue-600 hover:underline">{e.projectName}</Link>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </TableCell>
                  <TableCell><span className="text-xs text-slate-500 line-clamp-2 max-w-xs">{e.details}</span></TableCell>
                  <TableCell><div className="flex items-center gap-1.5">{statusIcon(e.status)}<span className="text-xs text-slate-500">{e.status}</span></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 rounded-b-lg">
            <p className="text-xs text-slate-400">Showing {filtered.length} of {state.auditLog.length} entries</p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
