'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp, useProject } from '@/context/AppContext';
import { Button, Card, CardHeader, CardTitle, CardContent, Table, TableHead, TableBody, TableRow, TableHead2, TableCell, Badge, Input, Alert, Dialog } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { mockSuppliers, mockProducts } from '@/mock';
import {
  DollarSign, AlertTriangle, CheckCircle2, RefreshCw, Plus, Trash2,
  FileText, ArrowRight, ShieldAlert, Check
} from 'lucide-react';

export default function PricingWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const project = useProject(projectId);
  const { dispatch, logAudit } = useApp();

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedAddProductId, setSelectedAddProductId] = useState(mockProducts[0].id);

  if (!project) return null;

  const pricing = project.pricing || {
    subtotal: project.selectedProducts.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0),
    discountPercent: 5,
    discountAmount: 0,
    taxPercent: 20,
    taxAmount: 0,
    otherCosts: 3500,
    otherCostsDescription: 'Installation & site survey allowance',
    finalTotal: 0,
    currency: 'GBP',
    isApproved: project.pricingApproved,
  };

  const handleQuantityChange = (productId: string, newQty: number) => {
    if (newQty < 1) return;
    dispatch({
      type: 'UPDATE_PRODUCT_QUANTITY',
      payload: { projectId, productId, quantity: newQty },
    });
    logAudit({
      action: 'Changed Product Quantity',
      category: 'Pricing',
      projectId,
      projectName: project.name,
      objectId: productId,
      details: `Updated quantity for product ${productId} to ${newQty}`,
      status: 'Success',
    });
  };

  const handleRemoveProduct = (productId: string) => {
    dispatch({
      type: 'REMOVE_PRODUCT',
      payload: { projectId, productId },
    });
    logAudit({
      action: 'Removed Product from Pricing',
      category: 'Pricing',
      projectId,
      projectName: project.name,
      objectId: productId,
      details: `Removed product ${productId} from project pricing schedule`,
      status: 'Warning',
    });
  };

  const handleApprovePricing = () => {
    dispatch({ type: 'APPROVE_PRICING', payload: { projectId } });
    logAudit({
      action: 'Approved Project Pricing',
      category: 'Pricing',
      projectId,
      projectName: project.name,
      details: `Approved final pricing schedule of ${formatCurrency(pricing.finalTotal)}`,
      status: 'Success',
    });
    router.push(`/projects/${projectId}/proposal`);
  };

  const handleRecalculate = () => {
    dispatch({ type: 'RECALCULATE_PRICING', payload: { projectId } });
  };

  const handleAddProduct = () => {
    const prod = mockProducts.find((p) => p.id === selectedAddProductId);
    if (!prod) return;

    const newProd = {
      productId: prod.id,
      productCode: prod.code,
      productName: prod.name,
      description: prod.description,
      quantity: 48,
      supplierId: prod.supplierId,
      supplierName: prod.supplierName,
      unitPrice: prod.unitPrice,
      currency: 'GBP',
      availability: prod.availability,
      status: 'Included' as const,
    };

    dispatch({
      type: 'UPDATE_PROJECT',
      payload: {
        id: projectId,
        updates: {
          selectedProducts: [...project.selectedProducts, newProd],
        },
      },
    });
    dispatch({ type: 'RECALCULATE_PRICING', payload: { projectId } });
    setShowAddProductModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Price Outdated Warning Banner */}
      <Alert variant="warning" title="Supplier Price Warning">
        <div className="flex items-center justify-between">
          <span>
            ⚠ <strong>Allegion UK</strong> price list (v2025.Q4) was last updated 45 days ago. Pricing calculations reflect current database rates but require review.
          </span>
          <Button size="sm" variant="outline" className="ml-4 shrink-0 text-xs" onClick={() => router.push('/knowledge/suppliers')}>
            Review Price Source
          </Button>
        </div>
      </Alert>

      {/* Main Pricing Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Pricing Schedule Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Itemized Product Schedule</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculated deterministically from approved supplier price lists.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowAddProductModal(true)} className="gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add Product
                </Button>
                <Button size="sm" variant="outline" onClick={handleRecalculate} className="gap-1.5 text-xs">
                  <RefreshCw className="h-3.5 w-3.5" /> Recalculate
                </Button>
              </div>
            </div>

            <Table>
              <TableHead>
                <tr>
                  <TableHead2>Product & Code</TableHead2>
                  <TableHead2>Supplier</TableHead2>
                  <TableHead2>Qty</TableHead2>
                  <TableHead2>Unit Price</TableHead2>
                  <TableHead2>Total</TableHead2>
                  <TableHead2>Action</TableHead2>
                </tr>
              </TableHead>
              <TableBody>
                {project.selectedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                      No products currently selected. Accept a recommendation or add products.
                    </TableCell>
                  </TableRow>
                ) : (
                  project.selectedProducts.map((item) => {
                    const itemTotal = item.quantity * item.unitPrice;
                    return (
                      <TableRow key={item.productId}>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-slate-800">{item.productName}</p>
                            <p className="text-xs text-slate-400">{item.productCode}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-600">{item.supplierName}</span>
                        </TableCell>
                        <TableCell>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 1)}
                            className="w-16 h-8 text-center border border-slate-300 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                            aria-label={`Quantity for ${item.productName}`}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-medium text-slate-700">{formatCurrency(item.unitPrice)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-bold text-slate-900">{formatCurrency(itemTotal)}</span>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleRemoveProduct(item.productId)}
                            className="text-slate-400 hover:text-red-600 p-1"
                            aria-label={`Remove ${item.productName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Right Col: Financial Summary Card */}
        <div>
          <Card className="sticky top-6">
            <CardHeader className="bg-slate-50">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                Pricing Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Product Subtotal</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(pricing.subtotal)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600">
                  <div className="flex items-center gap-1">
                    <span>Discount</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={pricing.discountPercent}
                      onChange={(e) => dispatch({ type: 'UPDATE_PRICING_FIELD', payload: { projectId, field: 'discountPercent', value: parseFloat(e.target.value) || 0 } })}
                      className="w-12 h-6 border rounded text-center text-xs font-semibold"
                      aria-label="Discount percentage"
                    />
                    <span>%</span>
                  </div>
                  <span className="text-emerald-600 font-semibold">-{formatCurrency(pricing.discountAmount)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Tax (VAT 20%)</span>
                  <span className="font-semibold text-slate-800">+{formatCurrency(pricing.taxAmount)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600 pt-2 border-t border-slate-100">
                  <div>
                    <span className="block text-xs font-semibold text-slate-500">Other Allowances</span>
                    <span className="text-[11px] text-slate-400">{pricing.otherCostsDescription}</span>
                  </div>
                  <span className="font-semibold text-slate-800">+{formatCurrency(pricing.otherCosts)}</span>
                </div>
              </div>

              {/* Total Box */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Final Estimated Price</p>
                <p className="text-3xl font-extrabold text-emerald-900">{formatCurrency(pricing.finalTotal)}</p>
                <p className="text-[11px] text-emerald-700">Includes all components, discounts, VAT & site allowances.</p>
              </div>

              {/* Approval status indicator */}
              {project.pricingApproved ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">Pricing Approved</p>
                    <p className="text-[11px] text-emerald-600">Approved by {pricing.approvedBy || 'Sarah Mitchell'}</p>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleApprovePricing}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                >
                  <Check className="h-4 w-4" /> Approve Pricing & Continue
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Product Modal */}
      <Dialog
        open={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        title="Add Product to Schedule"
        description="Select a product from the company Product Library to append to this project schedule."
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Select Product</label>
            <select
              value={selectedAddProductId}
              onChange={(e) => setSelectedAddProductId(e.target.value)}
              className="w-full h-9 border border-slate-300 rounded px-3 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {mockProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code}) — {formatCurrency(p.unitPrice)} [{p.supplierName}]
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowAddProductModal(false)}>Cancel</Button>
            <Button onClick={handleAddProduct}>Add Product</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
