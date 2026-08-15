'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button, Card, Table, TableHead, TableBody, TableRow, TableHead2, TableCell, Badge, Input, Select, Dialog } from '@/components/ui';
import { mockProducts } from '@/mock';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Product } from '@/types';
import { Package, Search, PlusCircle, Filter, Eye, Edit2 } from 'lucide-react';

export default function ProductLibraryPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const categories = ['All', ...Array.from(new Set(mockProducts.map((p) => p.category)))];

  const filtered = mockProducts.filter((p) => {
    const q = search.toLowerCase();
    return (
      (!search || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q)) &&
      (categoryFilter === 'All' || p.category === categoryFilter)
    );
  });

  return (
    <AppShell
      breadcrumbs={[{ label: 'Knowledge', href: '/knowledge' }, { label: 'Product Library' }]}
      title="Product Library"
    >
      <div className="p-6 max-w-screen-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Product Library</h2>
            <p className="text-sm text-slate-500 mt-0.5">{mockProducts.length} approved products in knowledge base</p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => alert('Add Product dialog')}>
            <PlusCircle className="h-4 w-4" /> Add Product
          </Button>
        </div>

        <Card>
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 flex-1 max-w-xs">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search product code, name, supplier..."
                className="bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-600 focus:outline-none"
            >
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <Table>
            <TableHead>
              <tr>
                <TableHead2>Product Name</TableHead2>
                <TableHead2>Code</TableHead2>
                <TableHead2>Category</TableHead2>
                <TableHead2>Supplier</TableHead2>
                <TableHead2>Unit Price</TableHead2>
                <TableHead2>Availability</TableHead2>
                <TableHead2>Last Updated</TableHead2>
                <TableHead2>Actions</TableHead2>
              </tr>
            </TableHead>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <span className="font-medium text-slate-800">{p.name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{p.code}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{p.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-600">{p.supplierName}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(p.unitPrice)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.availability === 'Available' ? 'success' : 'warning'}>{p.availability}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-400">{formatDate(p.lastUpdated)}</span>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedProduct(p)} className="gap-1 text-xs">
                      <Eye className="h-3 w-3" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Product Details Modal */}
      <Dialog
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.name || 'Product Details'}
        description={`Product Code: ${selectedProduct?.code}`}
        size="lg"
      >
        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-700 text-sm">{selectedProduct?.description}</p>
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
            <div><span className="font-semibold text-slate-500">Category:</span> {selectedProduct?.category}</div>
            <div><span className="font-semibold text-slate-500">Supplier:</span> {selectedProduct?.supplierName}</div>
            <div><span className="font-semibold text-slate-500">Unit Price:</span> {selectedProduct ? formatCurrency(selectedProduct.unitPrice) : ''}</div>
            <div><span className="font-semibold text-slate-500">Fire Rating:</span> {selectedProduct?.fireRating || 'N/A'}</div>
            <div><span className="font-semibold text-slate-500">Security Rating:</span> {selectedProduct?.securityRating || 'Standard'}</div>
            <div><span className="font-semibold text-slate-500">Finish:</span> {selectedProduct?.finish || 'Standard'}</div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setSelectedProduct(null)}>Close</Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}
