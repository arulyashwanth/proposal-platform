'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button, Card, Table, TableHead, TableBody, TableRow, TableHead2, TableCell, Badge, Dialog } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DoorSet } from '@/types';
import { DoorOpen, Search, PlusCircle, Eye, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function DoorSetLibraryPage() {
  const [doorSets, setDoorSets] = useState<DoorSet[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDS, setSelectedDS] = useState<DoorSet | null>(null);
  const [backendSynced, setBackendSynced] = useState(false);

  useEffect(() => {
    async function loadDoorSets() {
      const hwSets = await api.getHardwareSets();
      if (hwSets && hwSets.length > 0) {
        const mapped: DoorSet[] = hwSets.map((hw, idx) => {
          const comps = hw.components || [];
          const compPrice = comps.reduce(
            (sum: number, c: any) => sum + (Number(c.quantity || 1) * Number(c.unit_price || c.unitPrice || 0)),
            0
          );
          return {
            id: `ds-${hw.id}`,
            code: `DS-00${hw.id}`,
            name: hw.name,
            description: hw.specifications || 'Standard architectural commercial door assembly.',
            projectTypes: [hw.category as any || 'Commercial'],
            doorType: (hw.door_type === 'Main Entry' ? 'External' : 'Internal') as any,
            fireRating: idx % 2 === 0 ? '120 min' : '60 min',
            securityLevel: idx === 0 ? 'High' : 'Standard',
            finish: 'Satin Stainless Steel',
            status: 'Approved',
            basePrice: compPrice > 0 ? compPrice : 1250.0 + idx * 300.0,
            currency: 'AED',
            products: comps.length > 0 ? comps.map((c: any) => String(c.product_id || c.productId || '1')) : ['1', '2', '3'],
            supplierId: '1',
            supplierName: hw.category === 'Commercial' ? 'Allegion / ASSA ABLOY' : 'Allegion (Schlage)',
            lastUpdated: new Date().toISOString().split('T')[0],
          };
        });
        setDoorSets(mapped);
        setBackendSynced(true);
      }
    }
    loadDoorSets();
  }, []);

  const filtered = doorSets.filter((ds) => {
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
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-800">Door Set Library</h2>
              {backendSynced && (
                <span className="flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Backend Hardware Library
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{doorSets.length} pre-configured door set assemblies &bull; Currency: AED (Dirhams)</p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => setSelectedDS(doorSets[0])}>
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
                <TableHead2>Assembly Name</TableHead2>
                <TableHead2>Door Type</TableHead2>
                <TableHead2>Fire Rating</TableHead2>
                <TableHead2>Security</TableHead2>
                <TableHead2>Status</TableHead2>
                <TableHead2>Base Price (AED)</TableHead2>
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
        description="Assembly Specification & Included Certified Hardware"
        size="lg"
      >
        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-700 text-sm">{selectedDS?.description}</p>
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
            <div><span className="font-semibold text-slate-500">Fire Rating:</span> {selectedDS?.fireRating}</div>
            <div><span className="font-semibold text-slate-500">Security Level:</span> {selectedDS?.securityLevel}</div>
            <div><span className="font-semibold text-slate-500">Finish:</span> {selectedDS?.finish}</div>
            <div><span className="font-semibold text-slate-500">Assembly Cost:</span> <strong className="text-purple-700">{selectedDS ? formatCurrency(selectedDS.basePrice) : ''}</strong></div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setSelectedDS(null)}>Close</Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}
