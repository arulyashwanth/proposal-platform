'use client';
import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, Table, TableHead, TableBody, TableRow, TableHead2, TableCell } from '@/components/ui';
import { mockUsers } from '@/mock';
import { formatRelativeTime } from '@/lib/utils';
import { PlusCircle, Edit2, MoreHorizontal } from 'lucide-react';

const ROLE_CONFIG = {
  Admin: 'bg-red-50 text-red-700 border-red-200',
  'Proposal Manager': 'bg-blue-50 text-blue-700 border-blue-200',
  Estimator: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Reviewer: 'bg-teal-50 text-teal-700 border-teal-200',
};

export default function UsersPage() {
  return (
    <AppShell breadcrumbs={[{ label: 'Administration', href: '/admin' }, { label: 'Users' }]} title="User Management">
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Users</h2>
            <p className="text-sm text-slate-500 mt-0.5">{mockUsers.length} users · {mockUsers.filter(u => u.status === 'Active').length} active</p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => alert('Add user dialog would open here')}><PlusCircle className="h-4 w-4" />Add User</Button>
        </div>
        <Card>
          <Table>
            <TableHead><tr>
              <TableHead2>User</TableHead2>
              <TableHead2>Role</TableHead2>
              <TableHead2>Department</TableHead2>
              <TableHead2>Status</TableHead2>
              <TableHead2>Last Active</TableHead2>
              <TableHead2>Actions</TableHead2>
            </tr></TableHead>
            <TableBody>
              {mockUsers.map(u => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">{u.name.split(' ').map(n => n[0]).join('')}</div>
                      <div>
                        <div className="font-medium text-slate-800">{u.name}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${ROLE_CONFIG[u.role]}`}>{u.role}</span></TableCell>
                  <TableCell><span className="text-sm text-slate-500">{u.department}</span></TableCell>
                  <TableCell><span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${u.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{u.status}</span></TableCell>
                  <TableCell><span className="text-xs text-slate-500">{formatRelativeTime(u.lastActive)}</span></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => alert('Edit user')}><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => alert('More options')}><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AppShell>
  );
}
