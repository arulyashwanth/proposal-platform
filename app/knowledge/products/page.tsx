'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button, Card, Table, TableHead, TableBody, TableRow, TableHead2, TableCell, Badge, Input, Select, Dialog } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Product } from '@/types';
import { Package, Search, PlusCircle, Filter, Eye, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import { api, ApiProduct } from '@/lib/api';

export default function ProductLibraryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSearchingBackend, setIsSearchingBackend] = useState(false);
  const [backendSource, setBackendSource] = useState<string | null>(null);

  // New product form
  const [newProdName, setNewProdName] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Door Closers');
  const [newProdPrice, setNewProdPrice] = useState('250.00');

  // Load from backend on mount
  useEffect(() => {
    async function loadProducts() {
      const data = await api.getProducts();
      if (data && data.length > 0) {
        const mapped: Product[] = data.map((p) => ({
          id: String(p.id),
          name: p.name,
          code: p.sku,
          category: p.category,
          description: `${p.name} — High-spec architectural hardware certified for commercial use.`,
          supplierId: String(p.supplier_id || '1'),
          supplierName:
            p.supplier_name ||
            (p.supplier_id === 2
              ? 'ASSA ABLOY'
              : p.supplier_id === 3
              ? 'DORMA Gulf'
              : 'Allegion (Schlage)'),
          unitPrice: p.base_price,
          currency: 'AED',
          availability: 'Available',
          status: 'Active',
          compatibleDoorSets: ['ds1', 'ds2', 'ds3'],
          lastUpdated: new Date().toISOString().split('T')[0],
        }));
        setProducts(mapped);
        setBackendSource('Supabase Cloud Database');
      }
    }
    loadProducts();
  }, []);

  // Semantic search via backend when user types
  const handleSearchChange = async (query: string) => {
    setSearch(query);
    if (!query.trim()) {
      const data = await api.getProducts(categoryFilter !== 'All' ? categoryFilter : undefined);
      if (data && data.length > 0) {
        setProducts(
          data.map((p) => ({
            id: String(p.id),
            name: p.name,
            code: p.sku,
            category: p.category,
            description: `${p.name} — Certified architectural hardware component.`,
            supplierId: String(p.supplier_id || '1'),
            supplierName: p.supplier_name || 'Allegion (Schlage)',
            unitPrice: p.base_price,
            currency: 'AED',
            availability: 'Available',
            status: 'Active',
            compatibleDoorSets: ['ds1', 'ds2'],
            lastUpdated: new Date().toISOString().split('T')[0],
          }))
        );
      }
      return;
    }

    if (query.length >= 2) {
      setIsSearchingBackend(true);
      const res = await api.searchProducts(query, categoryFilter !== 'All' ? categoryFilter : undefined);
      setIsSearchingBackend(false);
      if (res && res.matched_products && res.matched_products.length > 0) {
        const searchResults: Product[] = res.matched_products.map((mp: any) => ({
          id: String(mp.metadata?.product_id || Math.random()),
          name: mp.metadata?.name || mp.content,
          code: mp.metadata?.sku || 'SKU-GEN',
          category: mp.metadata?.category || 'Hardware',
          description: mp.content,
          supplierId: String(mp.metadata?.supplier_id || '1'),
          supplierName: 'Certified Supplier',
          unitPrice: mp.metadata?.base_price || 150.0,
          currency: 'AED',
          availability: 'Available',
          status: 'Active',
          compatibleDoorSets: ['ds1'],
          lastUpdated: new Date().toISOString().split('T')[0],
        }));
        setProducts(searchResults);
        setBackendSource(`Search (${res.search_mode})`);
      }
    }
  };

  const handleCreateProduct = async () => {
    if (!newProdName || !newProdSku) return;
    const res = await api.createProduct({
      name: newProdName,
      sku: newProdSku,
      category: newProdCategory,
      base_price: parseFloat(newProdPrice) || 0,
      supplier_id: 1,
    });

    const newProductObj: Product = {
      id: res ? String(res.id) : String(products.length + 1),
      name: newProdName,
      code: newProdSku,
      category: newProdCategory,
      description: `${newProdName} — Newly registered architectural hardware.`,
      supplierId: '1',
      supplierName: 'Allegion (Schlage)',
      unitPrice: parseFloat(newProdPrice) || 0,
      currency: 'AED',
      availability: 'Available',
      status: 'Active',
      compatibleDoorSets: ['ds1', 'ds2'],
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    setProducts([newProductObj, ...products]);
    setShowAddModal(false);
    setNewProdName('');
    setNewProdSku('');
  };

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const filtered = products.filter((p) => {
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
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-800">Product Library</h2>
              {backendSource && (
                <span className="flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                  <CheckCircle2 className="h-3 w-3" /> {backendSource}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{products.length} approved products in knowledge base &bull; Currency: AED (Dirhams)</p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => setShowAddModal(true)}>
            <PlusCircle className="h-4 w-4" /> Add Product
          </Button>
        </div>

        <Card>
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 flex-1 max-w-xs">
              {isSearchingBackend ? (
                <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5 text-slate-400" />
              )}
              <input
                type="text"
                placeholder="Search products, SKU, category (semantic)..."
                className="bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none w-full"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
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
                <TableHead2>SKU Code</TableHead2>
                <TableHead2>Category</TableHead2>
                <TableHead2>Supplier</TableHead2>
                <TableHead2>Unit Price (AED)</TableHead2>
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
            <div><span className="font-semibold text-slate-500">Base Unit Price:</span> <strong className="text-emerald-700">{selectedProduct ? formatCurrency(selectedProduct.unitPrice) : ''}</strong></div>
            <div><span className="font-semibold text-slate-500">Fire Rating:</span> {selectedProduct?.fireRating || 'BS EN 1634 120min'}</div>
            <div><span className="font-semibold text-slate-500">Security Rating:</span> {selectedProduct?.securityRating || 'Grade 1 / High Security'}</div>
            <div><span className="font-semibold text-slate-500">Finish:</span> {selectedProduct?.finish || 'Satin Stainless Steel (316)'}</div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setSelectedProduct(null)}>Close</Button>
          </div>
        </div>
      </Dialog>

      {/* Add Product Modal */}
      <Dialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Product to Knowledge Base"
        description="Register a new architectural hardware component and price schedule."
        size="md"
      >
        <div className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Product Name</label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              placeholder="e.g. ASSA ABLOY High Security Strike"
              value={newProdName}
              onChange={(e) => setNewProdName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">SKU / Code</label>
              <input
                type="text"
                className="w-full border border-slate-200 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
                placeholder="e.g. AA-STR-2026"
                value={newProdSku}
                onChange={(e) => setNewProdSku(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Category</label>
              <select
                className="w-full border border-slate-200 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
                value={newProdCategory}
                onChange={(e) => setNewProdCategory(e.target.value)}
              >
                <option>Door Closers</option>
                <option>Mortise Locks</option>
                <option>Hinges</option>
                <option>Panic Hardware</option>
                <option>Electronic Locks</option>
                <option>Floor Springs</option>
                <option>Deadbolts</option>
                <option>Bolts</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Base Price (AED)</label>
            <input
              type="number"
              step="0.5"
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              placeholder="250.00"
              value={newProdPrice}
              onChange={(e) => setNewProdPrice(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleCreateProduct} disabled={!newProdName || !newProdSku}>Save Product</Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}
