'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button, Card, Table, TableHead, TableBody, TableRow, TableHead2, TableCell, Badge, Dialog } from '@/components/ui';
import { mockDoorSets } from '@/mock';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DoorSet } from '@/types';
import { DoorOpen, Search, PlusCircle, Eye, CheckCircle2 } from 'lucide-react';

export default function DoorSetLibraryPage() {
  const [search, setSearch] = useState('');
  const [selectedDS, setSelectedDS] = useState<DoorSet | null>(null);

  const filtered = mockDoorSets.filter((ds) => {
    const q = search.toLowerCase();
    return !search || ds.name.toLowerCase().includes(q) || ds.code.toLowerCase().includes(q) || ds.fireRating.toLowerCase().includes(q);
  });

  return (
    <AppShell
      breadcrumbs={[{ label: 'Knowledge', href: '/knowledge' }, { label: 'Door Set Library' }]}
      title="Door Set Library"
    >
      <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Door Set Library</h2>
            <p className="text-sm text-slate-500 mt-0.5">{mockDoorSets.length} pre-configured door set assemblies</p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => alert('Add Door Set dialog')}>
            <PlusCircle className="h-4 w-4" /> Add Door Set
          </Button>
        </div>

        <Card>
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 flex-1 max-w-xs">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search door set code, name, fire rating..."
                className="bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHead>
              <tr>
                <TableHead2>Door Set Code</TableHead2>
                <TableHead2>Name</TableHead2>
                <TableHead2>Door Type</TableHead2>
                <TableHead2>Fire Rating</TableHead2>
                <TableHead2>Security</TableHead2>
                <TableHead2>Status</TableHead2>
                <TableHead2>Base Price</TableHead2>
                <TableHead2>Actions</TableHead2>
              </tr>
            </TableHead>
            <TableBody>
              {filtered.map((ds) => (
                <TableRow key={ds.id}>
                  <TableCell>
                    <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">{ds.code}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-slate-800">{ds.name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-600">{ds.doorType}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="purple">{ds.fireRating}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ds.securityLevel === 'High' ? 'success' : 'neutral'}>{ds.securityLevel}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ds.status === 'Approved' ? 'success' : 'warning'}>{ds.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(ds.basePrice)}</span>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedDS(ds)} className="gap-1 text-xs">
                      <Eye className="h-3 w-3" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Door Set Details Modal */}
      <Dialog
        open={!!selectedDS}
        onClose={() => setSelectedDS(null)}
        title={`${selectedDS?.code} — ${selectedDS?.name}`}
        description="Assembly Specification & Included Components"
        size="lg"
      >
        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-700 text-sm">{selectedDS?.description}</p>
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
            <div><span className="font-semibold text-slate-500">Fire Rating:</span> {selectedDS?.fireRating}</div>
            <div><span className="font-semibold text-slate-500">Security Level:</span> {selectedDS?.securityLevel}</div>
            <div><span className="font-semibold text-slate-500">Finish:</span> {selectedDS?.finish}</div>
            <div><span className="font-semibold text-slate-500">Base Unit Price:</span> {selectedDS ? formatCurrency(selectedDS.basePrice) : ''}</div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setSelectedDS(null)}>Close</Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}
