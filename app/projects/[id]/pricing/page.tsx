'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp, useProject } from '@/context/AppContext';
import { Button, Card, CardHeader, CardTitle, CardContent, Table, TableHead, TableBody, TableRow, TableHead2, TableCell, Badge, Input, Alert, Dialog } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  DollarSign, AlertTriangle, CheckCircle2, RefreshCw, Plus, Trash2,
  FileText, ArrowRight, ShieldAlert, Check, TrendingUp, Sparkles
} from 'lucide-react';
import { api, PricingOptimizationResult } from '@/lib/api';

// Dataset product catalog for Add-Product modal
const CATALOG_PRODUCTS = [
  { id: '1',  name: 'Schlage B60N Heavy Duty Deadbolt',                   code: 'SCH-B60N-619',   supplierId: '1', supplierName: 'Allegion (Schlage)', unitPrice: 89.5,  description: 'ANSI Grade 1 single cylinder heavy duty commercial deadbolt.', availability: 'Available' },
  { id: '2',  name: 'Schlage ND Series Commercial Lever',                  code: 'SCH-ND80-619',   supplierId: '1', supplierName: 'Allegion (Schlage)', unitPrice: 130,   description: 'Vandlgard cylindrical lever lockset for high-traffic facilities.', availability: 'Available' },
  { id: '3',  name: 'Schlage L Series High Security Mortise Lock',         code: 'SCH-L9453-619',  supplierId: '1', supplierName: 'Allegion (Schlage)', unitPrice: 360,   description: 'Extra heavy-duty commercial mortise lockset.', availability: 'Available' },
  { id: '4',  name: 'Schlage AD300 Networked Electronic Lock',             code: 'SCH-AD300-ACC',  supplierId: '1', supplierName: 'Allegion (Schlage)', unitPrice: 695,   description: 'Access Control RFID electronic lock for access-controlled doors.', availability: 'Available' },
  { id: '5',  name: 'ASSA ABLOY DC400 Overhead Door Closer',               code: 'AA-DC400-BC',    supplierId: '2', supplierName: 'ASSA ABLOY',         unitPrice: 195,   description: 'Rack and pinion overhead door closer with backcheck.', availability: 'Available' },
  { id: '6',  name: 'ASSA ABLOY Cam Motion Concealed Hinge',               code: 'AA-HG-BB1279',   supplierId: '2', supplierName: 'ASSA ABLOY',         unitPrice: 22,    description: 'Heavy duty ball bearing architectural stainless steel hinge.', availability: 'Available' },
  { id: '7',  name: 'ASSA ABLOY FS700 Intumescent Fire Seal',              code: 'AA-FS-700',      supplierId: '2', supplierName: 'ASSA ABLOY',         unitPrice: 28,    description: 'Intumescent fire seal for 120-minute rated door frames.', availability: 'Available' },
  { id: '8',  name: 'ASSA ABLOY Touch-Bar Panic Exit Device (36")',        code: 'AA-PB3600',      supplierId: '2', supplierName: 'ASSA ABLOY',         unitPrice: 275,   description: 'Architectural rim exit touch-bar panic device EN 1125.', availability: 'Available' },
  { id: '9',  name: 'Generic Ball Bearing Butt Hinge 4"',                  code: 'GEN-BBH-4X4',    supplierId: '1', supplierName: 'Allegion (Schlage)', unitPrice: 18,    description: 'Grade 304 stainless steel ball bearing hinge.', availability: 'Available' },
  { id: '10', name: 'Heavy Duty Architectural Surface Bolt 8"',            code: 'GEN-SB-HVY',     supplierId: '1', supplierName: 'Allegion (Schlage)', unitPrice: 16,    description: 'Satin chrome heavy duty flush bolt.', availability: 'Available' },
  { id: '11', name: 'DORMA TS93 Premium Overhead Door Closer',             code: 'DOR-TS93-SIL',   supplierId: '3', supplierName: 'DORMA Gulf',          unitPrice: 220,   description: 'Premium overhead cam door closer with silver finish.', availability: 'Available' },
  { id: '12', name: 'DORMA PHA 2000 Concealed Door Hinge',                 code: 'DOR-PHA-2000',   supplierId: '3', supplierName: 'DORMA Gulf',          unitPrice: 35,    description: 'Concealed architectural hinge for flush door installations.', availability: 'Available' },
];

export default function PricingWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const project = useProject(projectId);
  const { dispatch, logAudit } = useApp();

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedAddProductId, setSelectedAddProductId] = useState(CATALOG_PRODUCTS[0].id);
  const [optimizerResult, setOptimizerResult] = useState<PricingOptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Sync with backend pricing optimizer
  useEffect(() => {
    async function runPricingOptimizer() {
      if (!project || project.selectedProducts.length === 0) return;
      setIsOptimizing(true);
      const items = project.selectedProducts.map((p, idx) => ({
        product_id: parseInt(p.productId.replace(/\D/g, ''), 10) || (idx + 1),
        quantity: p.quantity,
      }));
      const res = await api.optimizePricing(items, 0.20);
      setIsOptimizing(false);
      if (res) {
        setOptimizerResult(res);
      }
    }
    runPricingOptimizer();
  }, [project?.selectedProducts]);

  if (!project) return null;

  const pricing = project.pricing || {
    subtotal: project.selectedProducts.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0),
    discountPercent: 5,
    discountAmount: 0,
    taxPercent: 5,
    taxAmount: 0,
    otherCosts: 3500,
    otherCostsDescription: 'Installation & site survey allowance',
    finalTotal: 0,
    currency: 'AED',
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

  const handleRecalculate = async () => {
    dispatch({ type: 'RECALCULATE_PRICING', payload: { projectId } });
    if (project.selectedProducts.length > 0) {
      setIsOptimizing(true);
      const items = project.selectedProducts.map((p, idx) => ({
        product_id: parseInt(p.productId.replace(/\D/g, ''), 10) || (idx + 1),
        quantity: p.quantity,
      }));
      const res = await api.optimizePricing(items, 0.20);
      setIsOptimizing(false);
      if (res) {
        setOptimizerResult(res);
      }
    }
  };

  const handleAddProduct = () => {
    const prod = CATALOG_PRODUCTS.find((p) => p.id === selectedAddProductId);
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
      currency: 'AED',
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
      <Alert variant="warning" title="Trade Supplier Price Notice">
        <div className="flex items-center justify-between">
          <span>
            ⚠ <strong>Allegion UAE</strong> price list (v2026.Q3-AED) was last updated 45 days ago. Margin optimizer actively uses current catalog rates.
          </span>
          <Button size="sm" variant="outline" className="ml-4 shrink-0 text-xs" onClick={() => router.push('/knowledge/suppliers')}>
            Review Price Source
          </Button>
        </div>
      </Alert>

      {optimizerResult && optimizerResult.recommendations && optimizerResult.recommendations.length > 0 && (
        <Alert variant="info" title="FastAPI Margin & Volume Discount Intelligence">
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold text-blue-900">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span>Target Margin: {(optimizerResult.margin_target * 100).toFixed(0)}% &bull; Computed Internal Cost: {formatCurrency(optimizerResult.total_internal_cost)}</span>
            </div>
            <ul className="list-disc list-inside text-slate-700 space-y-0.5 pt-1">
              {optimizerResult.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        </Alert>
      )}

      {/* Main Pricing Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Pricing Schedule Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Itemized Product Schedule</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculated deterministically from approved supplier price lists in AED.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowAddProductModal(true)} className="gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add Product
                </Button>
                <Button size="sm" variant="outline" onClick={handleRecalculate} isLoading={isOptimizing} className="gap-1.5 text-xs">
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
                  <TableHead2>Unit Price (AED)</TableHead2>
                  <TableHead2>Total (AED)</TableHead2>
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
                            className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
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
                Pricing Summary (AED)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Product Material Subtotal</span>
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
                  <span>UAE VAT (5%)</span>
                  <span className="font-semibold text-slate-800">+{formatCurrency(pricing.taxAmount)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-600 pt-2 border-t border-slate-100">
                  <div>
                    <span className="block text-xs font-semibold text-slate-500">Installation & Survey</span>
                    <span className="text-[11px] text-slate-400">{pricing.otherCostsDescription}</span>
                  </div>
                  <span className="font-semibold text-slate-800">+{formatCurrency(pricing.otherCosts)}</span>
                </div>
              </div>

              {/* Total Box */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Final Estimated Proposal Value</p>
                <p className="text-3xl font-extrabold text-emerald-900">{formatCurrency(pricing.finalTotal)}</p>
                <p className="text-[11px] text-emerald-700">Includes all hardware line items, labor allowances, discounts & UAE VAT.</p>
              </div>

              {/* Approval status indicator */}
              {project.pricingApproved ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">Pricing Approved</p>
                    <p className="text-[11px] text-emerald-600">Approved by {pricing.approvedBy || 'Proposal Estimator'}</p>
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
              {CATALOG_PRODUCTS.map((p) => (
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
