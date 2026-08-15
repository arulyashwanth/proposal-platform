'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button, Card, Table, TableHead, TableBody, TableRow, TableHead2, TableCell, Badge } from '@/components/ui';
import { formatFileSize, formatDate } from '@/lib/utils';
import { FileText, Search, UploadCloud, Download, Trash2, Eye } from 'lucide-react';

const MOCK_KNOWLEDGE_DOCS = [
  { id: 'kdoc1', filename: 'Architecture_A102.pdf', type: 'Architectural Drawing', category: 'Architectural Drawings', size: 4200000, uploadDate: '2026-07-28', uploadedBy: 'Sarah Mitchell', status: 'Processed', usedIn: 'Project Alpha' },
  { id: 'kdoc2', filename: 'Door_Schedule.pdf', type: 'Door Schedule', category: 'Door Schedules', size: 1800000, uploadDate: '2026-07-28', uploadedBy: 'Sarah Mitchell', status: 'Processed', usedIn: 'Project Alpha' },
  { id: 'kdoc3', filename: 'Project_Specification.pdf', type: 'Specification', category: 'Specifications', size: 3100000, uploadDate: '2026-07-28', uploadedBy: 'Sarah Mitchell', status: 'Processed', usedIn: 'Project Alpha' },
  { id: 'kdoc4', filename: 'Dorma_Kaba_Price_List_2026.xlsx', type: 'Supplier Prices', category: 'Supplier Documents', size: 8400000, uploadDate: '2026-03-16', uploadedBy: 'David Chen', status: 'Processed', usedIn: 'Global Knowledge' },
  { id: 'kdoc5', filename: 'BS476_Fire_Door_Standard.pdf', type: 'Standard Spec', category: 'Specifications', size: 2100000, uploadDate: '2026-01-10', uploadedBy: 'David Chen', status: 'Processed', usedIn: 'Global Knowledge' },
];

export default function DocumentLibraryPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const categories = ['All', 'Architectural Drawings', 'Door Schedules', 'Specifications', 'Supplier Documents'];

  const filtered = MOCK_KNOWLEDGE_DOCS.filter((d) => {
    const q = search.toLowerCase();
    return (
      (!search || d.filename.toLowerCase().includes(q) || d.uploadedBy.toLowerCase().includes(q) || d.usedIn.toLowerCase().includes(q)) &&
      (category === 'All' || d.category === category)
    );
  });

  return (
    <AppShell
      breadcrumbs={[{ label: 'Knowledge', href: '/knowledge' }, { label: 'Document Library' }]}
      title="Document Library"
    >
      <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Document Library</h2>
            <p className="text-sm text-slate-500 mt-0.5">{MOCK_KNOWLEDGE_DOCS.length} indexed project & knowledge documents</p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => alert('Upload Document dialog')}>
            <UploadCloud className="h-4 w-4" /> Upload Document
          </Button>
        </div>

        <Card>
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 flex-1 max-w-xs">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search document name, user, project..."
                className="bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-600 focus:outline-none"
            >
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <Table>
            <TableHead>
              <tr>
                <TableHead2>Document Name</TableHead2>
                <TableHead2>Category</TableHead2>
                <TableHead2>Size</TableHead2>
                <TableHead2>Uploaded Date</TableHead2>
                <TableHead2>Uploaded By</TableHead2>
                <TableHead2>Used By</TableHead2>
                <TableHead2>Status</TableHead2>
                <TableHead2>Actions</TableHead2>
              </tr>
            </TableHead>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="font-semibold text-slate-800">{d.filename}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{d.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-500">{formatFileSize(d.size)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-500">{formatDate(d.uploadDate)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-600">{d.uploadedBy}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-slate-700">{d.usedIn}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="success">{d.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => alert(`Preview ${d.filename}`)} className="gap-1 text-xs">
                        <Eye className="h-3 w-3" /> Preview
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => alert(`Download ${d.filename}`)} className="gap-1 text-xs">
                        <Download className="h-3 w-3" />
                      </Button>
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
