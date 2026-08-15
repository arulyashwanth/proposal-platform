'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button, Card, Table, TableHead, TableBody, TableRow, TableHead2, TableCell, Badge, Dialog, Alert, ProgressBar } from '@/components/ui';
import { mockSuppliers } from '@/mock';
import { formatDate } from '@/lib/utils';
import { Supplier } from '@/types';
import {
  TruckIcon, UploadCloud, AlertTriangle, CheckCircle2,
  FileSpreadsheet, Sparkles, RefreshCw, Eye
} from 'lucide-react';

export default function SupplierPricesPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(mockSuppliers);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload modal state
  const [selectedSupplier, setSelectedSupplier] = useState(mockSuppliers[0].id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(0);

  const handleUploadSubmit = () => {
    setIsProcessing(true);
    setProcessStep(1); // Uploaded
    setTimeout(() => setProcessStep(2), 600); // Products identified
    setTimeout(() => setProcessStep(3), 1200); // Prices matched
    setTimeout(() => {
      setIsProcessing(false);
      setProcessStep(4);
      // Update supplier status
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === selectedSupplier
            ? { ...s, status: 'Current', priceListVersion: 'v2026.Q3', lastUpdated: new Date().toISOString().split('T')[0], pendingReviewCount: 45, daysOutdated: 0 }
            : s
        )
      );
    }, 2000);
  };

  return (
    <AppShell
      breadcrumbs={[{ label: 'Knowledge', href: '/knowledge' }, { label: 'Supplier Price Lists' }]}
      title="Supplier Price Lists"
    >
      <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Supplier Price Lists</h2>
            <p className="text-sm text-slate-500 mt-0.5">Manage trade supplier pricing catalogues and versions</p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => { setShowUploadModal(true); setProcessStep(0); }}>
            <UploadCloud className="h-4 w-4" /> Upload Price List
          </Button>
        </div>

        {suppliers.some((s) => s.status === 'Outdated') && (
          <Alert variant="warning" title="Outdated Price Lists Detected">
            Allegion UK price list is 45 days outdated. Proposals generated with outdated price lists will show pricing warnings.
          </Alert>
        )}

        <Card>
          <Table>
            <TableHead>
              <tr>
                <TableHead2>Supplier</TableHead2>
                <TableHead2>Version</TableHead2>
                <TableHead2>Upload Date</TableHead2>
                <TableHead2>Last Updated</TableHead2>
                <TableHead2>Products</TableHead2>
                <TableHead2>Status</TableHead2>
                <TableHead2>Actions</TableHead2>
              </tr>
            </TableHead>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div>
                      <span className="font-semibold text-slate-800">{s.name}</span>
                      <span className="text-xs text-slate-400 block">{s.code}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded font-semibold">{s.priceListVersion}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-500">{formatDate(s.uploadDate)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-500">{formatDate(s.lastUpdated)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-slate-700">{s.productCount.toLocaleString()} items</span>
                  </TableCell>
                  <TableCell>
                    {s.status === 'Current' && <Badge variant="success">Current</Badge>}
                    {s.status === 'Outdated' && <Badge variant="warning">Outdated ({s.daysOutdated}d)</Badge>}
                    {s.status === 'Requires Review' && <Badge variant="error">Requires Review</Badge>}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedSupplier(s.id); setShowUploadModal(true); setProcessStep(0); }} className="gap-1 text-xs">
                      <RefreshCw className="h-3 w-3" /> Update
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Upload Price List Modal */}
      <Dialog
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Supplier Price List"
        description="Upload a new XLSX or CSV price list file to update supplier rates."
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Select Supplier</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full h-9 border border-slate-300 rounded px-3 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 bg-slate-50">
            <FileSpreadsheet className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">Drop XLSX price schedule here</p>
            <p className="text-xs text-slate-400 mt-1">Accepts .xlsx, .csv formatted files up to 25MB</p>
          </div>

          {/* Processing progress */}
          {processStep > 0 && (
            <div className="p-4 bg-slate-100 border border-slate-200 rounded-lg space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {processStep >= 1 && '✓ File uploaded'}
              </div>
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                {processStep >= 2 ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <div className="h-4 w-4 rounded-full border-2 border-slate-300" />}
                1,203 products identified
              </div>
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                {processStep >= 3 ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <div className="h-4 w-4 rounded-full border-2 border-slate-300" />}
                1,158 prices matched cleanly
              </div>
              {processStep >= 4 && (
                <div className="flex items-center gap-2 text-amber-800 font-semibold pt-1 border-t border-slate-200">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  ⚠ 45 items requiring manual review
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              {processStep === 4 ? 'Close' : 'Cancel'}
            </Button>
            {processStep < 4 && (
              <Button onClick={handleUploadSubmit} isLoading={isProcessing}>
                Process File
              </Button>
            )}
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}
