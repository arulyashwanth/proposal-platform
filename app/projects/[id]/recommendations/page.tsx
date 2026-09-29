'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp, useProject } from '@/context/AppContext';
import {
  Button, Card, CardHeader, CardTitle, CardContent, Badge,
  Table, TableHead, TableBody, TableRow, TableHead2, TableCell,
  Dialog, Alert, Input, Textarea
} from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import {
  Sparkles, CheckCircle2, Check, X, Layers, ArrowRight,
  Eye, RefreshCw, Plus, Minus, Trash2, BookmarkPlus,
  AlertTriangle, Package, ShieldCheck, Search, SlidersHorizontal, DoorOpen
} from 'lucide-react';
import {
  api, HardwareMatchResult, HardwareMatchedSet,
  HardwareComponentItem, ApiProduct
} from '@/lib/api';

export default function RecommendationsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const project = useProject(projectId);
  const { dispatch, logAudit } = useApp();

  // Hardware Matching & Products State
  const [matchResult, setMatchResult] = useState<HardwareMatchResult | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<ApiProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Hardware Set & Editable Components
  const [selectedSet, setSelectedSet] = useState<HardwareMatchedSet | null>(null);
  const [verifiedComponents, setVerifiedComponents] = useState<HardwareComponentItem[]>([]);
  const [doorCount, setDoorCount] = useState<number>(project?.estimatedDoorQuantity || 48);
  const [isCustomized, setIsCustomized] = useState(false);
  const [savedLibraryId, setSavedLibraryId] = useState<number | null>(null);

  // Modals State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetDoorType, setNewSetDoorType] = useState('Main Entry');
  const [newSetCategory, setNewSetCategory] = useState('Commercial');
  const [newSetNotes, setNewSetNotes] = useState('');
  const [isSavingSet, setIsSavingSet] = useState(false);

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // 1. Fetch matching hardware sets & product catalog on mount
  useEffect(() => {
    async function loadData() {
      if (!project) return;
      setIsLoading(true);

      // Extract specifications dict from requirements
      const specs: Record<string, any> = {};
      project.requirements.forEach((r) => {
        specs[r.key || r.label.toLowerCase().replace(/\s+/g, '_')] = r.value;
      });
      specs.door_count = project.estimatedDoorQuantity || 48;

      try {
        const [matchRes, prods] = await Promise.all([
          api.matchHardwareSets(project.projectType || 'Commercial', specs),
          api.getProducts(),
        ]);

        if (prods) setCatalogProducts(prods);

        if (matchRes) {
          setMatchResult(matchRes);

          // If exact matches exist, select the top exact match
          if (matchRes.exact_matches && matchRes.exact_matches.length > 0) {
            const topExact = matchRes.exact_matches[0];
            setSelectedSet(topExact);
            setVerifiedComponents(topExact.components || matchRes.proposed_components || []);
            setIsCustomized(false);
            setNewSetName(`${topExact.name} (Custom Variant)`);
            setNewSetDoorType(topExact.door_type);
            setNewSetCategory(topExact.category);
          } else if (matchRes.closest_match) {
            // No exact match -> pick closest match and adapt
            const closest = matchRes.closest_match;
            setSelectedSet(closest);
            setVerifiedComponents(matchRes.proposed_components || closest.components || []);
            setIsCustomized(true);
            setNewSetName(`${closest.name} - Adapted for ${project.name}`);
            setNewSetDoorType(closest.door_type || 'Main Entry');
            setNewSetCategory(closest.category || project.projectType || 'Commercial');
            setNewSetNotes(matchRes.customisation_plan?.rationale || '');
          }
        }
      } catch (err) {
        console.error('Failed to load matching data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [project]);

  if (!project) return null;

  // Component Quantity Handlers
  const handleQuantityChange = (index: number, delta: number) => {
    setVerifiedComponents((prev) => {
      const next = [...prev];
      const newQty = (next[index].quantity || 1) + delta;
      if (newQty >= 1) {
        next[index] = { ...next[index], quantity: newQty };
        setIsCustomized(true);
      }
      return next;
    });
  };

  const handleRemoveComponent = (index: number) => {
    setVerifiedComponents((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setIsCustomized(true);
      return next;
    });
  };

  const handleAddProduct = (prod: ApiProduct) => {
    // Check if already in verifiedComponents
    const existingIdx = verifiedComponents.findIndex(
      (c) => String(c.product_id || c.productId) === String(prod.id)
    );

    if (existingIdx >= 0) {
      handleQuantityChange(existingIdx, 1);
    } else {
      const newComp: HardwareComponentItem = {
        product_id: prod.id,
        productId: String(prod.id),
        product_name: prod.name,
        productName: prod.name,
        sku: prod.sku,
        productCode: prod.sku,
        category: prod.category,
        quantity: 1,
        unit_price: prod.base_price,
        unitPrice: prod.base_price,
        supplier_id: prod.supplier_id || 1,
        supplier_name: prod.supplier_name || 'Allegion (Schlage)',
        action: 'added',
      };
      setVerifiedComponents((prev) => [...prev, newComp]);
      setIsCustomized(true);
    }
    setShowAddProductModal(false);
  };

  // Save as New Reusable Hardware Set
  const handleSaveToLibrary = async () => {
    if (!newSetName.trim()) return;
    setIsSavingSet(true);

    try {
      const payload = {
        name: newSetName.trim(),
        door_type: newSetDoorType || selectedSet?.door_type || 'Main Entry',
        category: newSetCategory || selectedSet?.category || 'Commercial',
        specifications: newSetNotes || `Customized hardware set for ${project.name} requirements.`,
        components: verifiedComponents.map((c) => ({
          product_id: c.product_id || c.productId,
          product_name: c.product_name || c.productName,
          sku: c.sku || c.productCode,
          category: c.category || 'Hardware',
          quantity: c.quantity || 1,
          unit_price: c.unit_price ?? c.unitPrice ?? 0,
        })),
      };

      const res = await api.createHardwareSet(payload);
      if (res && res.id) {
        setSavedLibraryId(res.id);
        setShowSaveModal(false);
        logAudit({
          action: 'Created Reusable Hardware Set',
          category: 'Knowledge',
          projectId,
          projectName: project.name,
          objectId: String(res.id),
          details: `Saved new reusable hardware set "${newSetName}" with ${verifiedComponents.length} components to the library.`,
          status: 'Success',
        });
      }
    } catch (err) {
      console.error('Failed to save hardware set to library:', err);
      alert('Could not save hardware set. Please ensure backend is running.');
    } finally {
      setIsSavingSet(false);
    }
  };

  // Calculate Single Set Cost & Total Scaled BOQ
  const singleSetCost = verifiedComponents.reduce(
    (sum, c) => sum + (c.quantity || 1) * Number(c.unit_price ?? c.unitPrice ?? 0),
    0
  );
  const totalHardwareItems = verifiedComponents.reduce(
    (sum, c) => sum + (c.quantity || 1) * doorCount,
    0
  );
  const totalMaterialCost = singleSetCost * doorCount;

  // Complete Verification & Advance to Pricing
  const handleProceedToPricing = () => {
    dispatch({
      type: 'SET_VERIFIED_HARDWARE_SELECTION',
      payload: {
        projectId,
        hardwareSetId: savedLibraryId || selectedSet?.id || 'hs-custom',
        hardwareSetName: newSetName || selectedSet?.name || 'Verified Hardware Set',
        doorCount,
        components: verifiedComponents,
      },
    });

    logAudit({
      action: 'Verified Hardware Set & Openings',
      category: 'Recommendation',
      projectId,
      projectName: project.name,
      objectId: String(selectedSet?.id || 'hs-custom'),
      details: `Verified ${verifiedComponents.length} components across ${doorCount} door openings. Total proposal material value: AED ${totalMaterialCost.toLocaleString()}.`,
      status: 'Success',
    });

    router.push(`/projects/${projectId}/pricing`);
  };

  // Filter products in catalog modal
  const filteredCatalog = catalogProducts.filter((p) => {
    const q = productSearch.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h3 className="text-xl font-bold text-slate-900">
              Hardware Set Selection & Component Verification
            </h3>
            {matchResult?.exact_matches && matchResult.exact_matches.length > 0 ? (
              <Badge variant="success" className="gap-1">
                <Check className="h-3 w-3" /> Exact Match Found
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1">
                <SlidersHorizontal className="h-3 w-3" /> Closest Match (Adapted)
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Matching engine evaluated project requirements against the Hardware Library &bull; Currency: AED (Dirhams)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedLibraryId ? (
            <Badge variant="success" className="px-3 py-1.5 text-xs gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved to Library (#{savedLibraryId})
            </Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-blue-700 border-blue-200 hover:bg-blue-50"
              onClick={() => setShowSaveModal(true)}
            >
              <BookmarkPlus className="h-4 w-4" /> Save as Reusable Set
            </Button>
          )}
        </div>
      </div>

      {/* Matching Diagnosis Banner */}
      {matchResult && (
        <>
          {matchResult.exact_matches && matchResult.exact_matches.length > 0 ? (
            <Alert variant="success" title="Exact Library Match Found">
              <div className="text-xs space-y-1 mt-1 text-emerald-900">
                <p>
                  Found <strong>{matchResult.exact_matches[0].name}</strong> with a match score of{' '}
                  <strong>{matchResult.exact_matches[0].match_pct}%</strong>. This pre-defined set fully satisfies your extracted fire rating, door type, and ironmongery specifications.
                </p>
                <div className="flex flex-wrap gap-2 pt-1 text-slate-600">
                  {matchResult.exact_matches[0].reasons?.map((r, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-white/70 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                      <Check className="h-3 w-3 text-emerald-600" /> {r}
                    </span>
                  ))}
                </div>
              </div>
            </Alert>
          ) : matchResult.closest_match ? (
            <Alert variant="warning" title="No Exact Match — Automated Adaptation Applied">
              <div className="text-xs space-y-2 mt-1 text-amber-950">
                <p>
                  No exact 100% match exists in the library. Selected closest baseline:{' '}
                  <strong>{matchResult.closest_match.name}</strong> ({matchResult.closest_match.match_pct}% match).
                </p>
                {matchResult.customisation_plan && (
                  <div className="bg-white/80 p-3 rounded-lg border border-amber-200 space-y-1.5">
                    <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-amber-600" /> Adaptation Rationale:
                    </p>
                    <p className="text-slate-700 leading-relaxed">{matchResult.customisation_plan.rationale}</p>
                    {matchResult.customisation_plan.added_products && matchResult.customisation_plan.added_products.length > 0 && (
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-700 font-medium">
                        <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Added:</span>
                        {matchResult.customisation_plan.added_products.join(', ')}
                      </div>
                    )}
                    {matchResult.customisation_plan.removed_products && matchResult.customisation_plan.removed_products.length > 0 && (
                      <div className="flex items-center gap-2 pt-0.5 text-[11px] text-red-700 font-medium">
                        <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded">Removed:</span>
                        {matchResult.customisation_plan.removed_products.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Alert>
          ) : null}
        </>
      )}

      {/* Main Verification Card */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-800">
                {selectedSet?.name || 'Hardware Set Assembly'}
              </CardTitle>
              {isCustomized && (
                <Badge variant="neutral" className="text-[11px] bg-purple-100 text-purple-700 border-purple-200">
                  Customized
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Door Type: <strong>{selectedSet?.door_type || 'Main Entry'}</strong> &bull; Category: <strong>{selectedSet?.category || 'Commercial'}</strong> &bull; Single Door Set Value: <strong>{formatCurrency(singleSetCost)}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => setShowAddProductModal(true)}
            >
              <Plus className="h-3.5 w-3.5 text-blue-600" /> Add Component from Catalog
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHead>
              <tr>
                <TableHead2 className="w-12 text-center">#</TableHead2>
                <TableHead2>Component / Product</TableHead2>
                <TableHead2>SKU / Code</TableHead2>
                <TableHead2>Category</TableHead2>
                <TableHead2 className="text-right">Unit Price (AED)</TableHead2>
                <TableHead2 className="text-center w-32">Qty per Door</TableHead2>
                <TableHead2 className="text-right">Subtotal / Door</TableHead2>
                <TableHead2 className="text-center w-28">Status</TableHead2>
                <TableHead2 className="text-center w-16">Action</TableHead2>
              </tr>
            </TableHead>
            <TableBody>
              {verifiedComponents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                    No components currently in this hardware set. Click &quot;Add Component from Catalog&quot; to begin.
                  </TableCell>
                </TableRow>
              ) : (
                verifiedComponents.map((comp, idx) => {
                  const unitPrice = Number(comp.unit_price ?? comp.unitPrice ?? 0);
                  const qty = comp.quantity || 1;
                  const lineSubtotal = unitPrice * qty;

                  return (
                    <TableRow key={idx} className="hover:bg-slate-50/50">
                      <TableCell className="text-center text-xs text-slate-400 font-mono">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-slate-800 text-sm block">
                          {comp.product_name || comp.productName}
                        </span>
                        {comp.supplier_name && (
                          <span className="text-[11px] text-slate-400">
                            Supplier: {comp.supplier_name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-600">
                        {comp.sku || comp.productCode || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral" className="text-xs font-normal">
                          {comp.category || 'Hardware'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-slate-700">
                        {formatCurrency(unitPrice)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center border border-slate-200 rounded bg-white shadow-xs">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(idx, -1)}
                            disabled={qty <= 1}
                            className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 transition-colors"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="px-2.5 text-xs font-bold text-slate-800 min-w-[24px] text-center">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(idx, 1)}
                            className="p-1 text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm font-bold text-slate-900">
                        {formatCurrency(lineSubtotal)}
                      </TableCell>
                      <TableCell className="text-center">
                        {comp.action === 'added' ? (
                          <Badge variant="purple" className="text-[11px] gap-1">
                            <Plus className="h-2.5 w-2.5" /> Added
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[11px] gap-1">
                            <Check className="h-2.5 w-2.5" /> Verified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveComponent(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                          title="Remove component"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Total Count of Hardware Sets (Door Openings) & Scale Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Total Openings Input */}
        <Card className="p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5 text-blue-600" />
              <h4 className="text-base font-bold text-slate-800">
                Total Hardware Sets Count
              </h4>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Specify the total quantity of doors/openings requiring this hardware set configuration.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">
              Total Door Openings:
            </label>
            <div className="inline-flex items-center border border-slate-300 rounded-lg bg-white shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => setDoorCount((c) => Math.max(1, c - 1))}
                className="px-3 py-2 text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                min="1"
                value={doorCount}
                onChange={(e) => setDoorCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 text-center font-bold text-slate-900 border-x border-slate-200 py-1.5 text-base focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setDoorCount((c) => c + 1)}
                className="px-3 py-2 text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>

        {/* Right: Scaled BOQ Metrics */}
        <Card className="lg:col-span-2 p-6 border border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-white flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Scaled Bill of Quantities (BOQ) Summary
            </h4>
            <span className="text-xs text-slate-500 font-mono">
              Formula: (Set Components &times; {doorCount} Openings)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 my-4">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Single Set Value</span>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {formatCurrency(singleSetCost)}
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Total Hardware Items</span>
              <p className="text-lg font-bold text-blue-700 mt-1">
                {totalHardwareItems.toLocaleString()} <span className="text-xs font-normal text-slate-500">units</span>
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Estimated Material Subtotal</span>
              <p className="text-lg font-bold text-emerald-700 mt-1">
                {formatCurrency(totalMaterialCost)}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            All {totalHardwareItems} items will be transferred to the Pricing Workspace where volume discount tiers (up to 12%), labor allowances (AED 15/unit), and margin optimization will be calculated automatically.
          </p>
        </Card>
      </div>

      {/* Bottom Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <Button
          variant="outline"
          onClick={() => router.push(`/projects/${projectId}/requirements`)}
          className="text-slate-600"
        >
          &larr; Back to Requirements
        </Button>

        <div className="flex items-center gap-3">
          <Button
            size="lg"
            onClick={handleProceedToPricing}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md gap-2 px-6"
          >
            <span>Confirm Hardware Set &amp; Proceed to Pricing</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Modal: Save as Reusable Hardware Set */}
      <Dialog
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Save as Reusable Hardware Set"
        description="Persist this verified hardware configuration to the central Hardware Library so it can be matched and reused across future projects."
        size="md"
      >
        <div className="p-6 space-y-4">
          <Input
            label="Hardware Set Name"
            value={newSetName}
            onChange={(e) => setNewSetName(e.target.value)}
            placeholder="e.g. HS-Commercial-MainEntry-120min-MattBlack"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Door Type"
              value={newSetDoorType}
              onChange={(e) => setNewSetDoorType(e.target.value)}
              placeholder="e.g. Main Entry, Fire Exit"
            />
            <Input
              label="Category"
              value={newSetCategory}
              onChange={(e) => setNewSetCategory(e.target.value)}
              placeholder="e.g. Commercial, Healthcare"
            />
          </div>

          <Textarea
            label="Technical Specifications &amp; Notes"
            value={newSetNotes}
            onChange={(e) => setNewSetNotes(e.target.value)}
            rows={3}
            placeholder="Detailed description of compliance, fire rating, lock grade, finish, and recommended doors..."
          />

          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-200">
            <p className="font-semibold text-slate-700 mb-1">
              Included Components ({verifiedComponents.length}):
            </p>
            <ul className="list-disc pl-4 space-y-0.5">
              {verifiedComponents.map((c, i) => (
                <li key={i}>
                  {c.quantity}&times; {c.product_name || c.productName} ({c.sku || c.productCode})
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowSaveModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveToLibrary}
              isLoading={isSavingSet}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save to Library
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal: Add Component from Catalog */}
      <Dialog
        open={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        title="Add Hardware Component from Catalog"
        description="Select an architectural hardware item from the catalog dataset to add to this hardware set assembly."
        size="lg"
      >
        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search product name, SKU, or category (e.g. Deadbolt, Closer, Hinge)..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {filteredCatalog.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                No matching products found in the catalog.
              </div>
            ) : (
              filteredCatalog.map((prod) => (
                <div
                  key={prod.id}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-sm">
                        {prod.name}
                      </span>
                      <Badge variant="neutral" className="text-[10px]">
                        {prod.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      SKU: <span className="font-mono">{prod.sku}</span> &bull; Supplier: {prod.supplier_name || 'Allegion (Schlage)'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800 text-sm">
                      {formatCurrency(prod.base_price)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleAddProduct(prod)}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setShowAddProductModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
