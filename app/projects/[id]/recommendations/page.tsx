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

interface ProjectHardwareSet {
  id: string | number;
  name: string;
  doorType: string;
  category: string;
  doorCount: number; // The total set count for this hardware set
  components: HardwareComponentItem[];
  isCustomized?: boolean;
  matchScore?: number;
  isExactMatch?: boolean;
  savedLibraryId?: number | null;
}

export default function RecommendationsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const project = useProject(projectId);
  const { dispatch, logAudit } = useApp();

  // Hardware Matching & Products State
  const [matchResult, setMatchResult] = useState<HardwareMatchResult | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<ApiProduct[]>([]);
  const [allLibrarySets, setAllLibrarySets] = useState<HardwareMatchedSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Multiple Hardware Sets in this Project Schedule
  const [projectHardwareSets, setProjectHardwareSets] = useState<ProjectHardwareSet[]>([]);
  const [activeSetIndex, setActiveSetIndex] = useState<number>(0);

  // Modals State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetDoorType, setNewSetDoorType] = useState('Main Entry');
  const [newSetCategory, setNewSetCategory] = useState('Commercial');
  const [newSetNotes, setNewSetNotes] = useState('');
  const [isSavingSet, setIsSavingSet] = useState(false);

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const [showAddSetModal, setShowAddSetModal] = useState(false);
  const [setSearchQuery, setSetSearchQuery] = useState('');

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
        const [matchRes, prods, libSets] = await Promise.all([
          api.matchHardwareSets(project.projectType || 'Commercial', specs),
          api.getProducts(),
          api.getHardwareSets(),
        ]);

        if (prods) setCatalogProducts(prods);
        if (libSets) {
          setAllLibrarySets(
            libSets.map((s: any) => ({
              id: s.id,
              name: s.name,
              door_type: s.door_type,
              category: s.category,
              specifications: s.specifications || '',
              components: s.components || [],
              score: 80,
              match_pct: 80,
              is_exact_match: true,
              reasons: ['Available in hardware library'],
              component_hits: [],
            }))
          );
        }

        if (matchRes) {
          setMatchResult(matchRes);

          const initialSets: ProjectHardwareSet[] = [];
          const mainDoorCount = project.estimatedDoorQuantity || 48;

          // If exact matches exist, populate them
          if (matchRes.exact_matches && matchRes.exact_matches.length > 0) {
            matchRes.exact_matches.forEach((em, idx) => {
              initialSets.push({
                id: em.id,
                name: em.name,
                doorType: em.door_type,
                category: em.category,
                doorCount: idx === 0 ? mainDoorCount : 24,
                components: em.components || matchRes.proposed_components || [],
                isCustomized: false,
                matchScore: em.match_pct,
                isExactMatch: true,
              });
            });
          } else if (matchRes.closest_match) {
            // No exact match -> pick closest match and adapt
            const closest = matchRes.closest_match;
            initialSets.push({
              id: closest.id,
              name: `${closest.name} (Custom Variant)`,
              doorType: closest.door_type || 'Main Entry',
              category: closest.category || project.projectType || 'Commercial',
              doorCount: mainDoorCount,
              components: matchRes.proposed_components || closest.components || [],
              isCustomized: true,
              matchScore: closest.match_pct,
              isExactMatch: false,
            });
          }

          setProjectHardwareSets(initialSets);
          setActiveSetIndex(0);
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

  const activeSet = projectHardwareSets[activeSetIndex] || projectHardwareSets[0];

  // Component Quantity Handlers for the active hardware set
  const handleComponentQuantityChange = (compIndex: number, delta: number) => {
    setProjectHardwareSets((prev) => {
      const next = [...prev];
      const targetSet = { ...next[activeSetIndex] };
      const nextComps = [...targetSet.components];
      const newQty = (nextComps[compIndex].quantity || 1) + delta;
      if (newQty >= 1) {
        nextComps[compIndex] = { ...nextComps[compIndex], quantity: newQty };
        targetSet.components = nextComps;
        targetSet.isCustomized = true;
        next[activeSetIndex] = targetSet;
      }
      return next;
    });
  };

  const handleRemoveComponent = (compIndex: number) => {
    setProjectHardwareSets((prev) => {
      const next = [...prev];
      const targetSet = { ...next[activeSetIndex] };
      targetSet.components = targetSet.components.filter((_, i) => i !== compIndex);
      targetSet.isCustomized = true;
      next[activeSetIndex] = targetSet;
      return next;
    });
  };

  const handleAddProduct = (prod: ApiProduct) => {
    if (!activeSet) return;
    setProjectHardwareSets((prev) => {
      const next = [...prev];
      const targetSet = { ...next[activeSetIndex] };
      const comps = [...targetSet.components];

      const existingIdx = comps.findIndex(
        (c) => String(c.product_id || c.productId) === String(prod.id)
      );

      if (existingIdx >= 0) {
        comps[existingIdx] = {
          ...comps[existingIdx],
          quantity: (comps[existingIdx].quantity || 1) + 1,
        };
      } else {
        comps.push({
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
        });
      }

      targetSet.components = comps;
      targetSet.isCustomized = true;
      next[activeSetIndex] = targetSet;
      return next;
    });
    setShowAddProductModal(false);
  };

  // Set Count update handlers for individual hardware sets
  const updateSetCount = (setIdx: number, delta: number) => {
    setProjectHardwareSets((prev) => {
      const next = [...prev];
      const newCount = Math.max(1, (next[setIdx].doorCount || 1) + delta);
      next[setIdx] = { ...next[setIdx], doorCount: newCount };
      return next;
    });
  };

  const setDirectSetCount = (setIdx: number, val: number) => {
    setProjectHardwareSets((prev) => {
      const next = [...prev];
      next[setIdx] = { ...next[setIdx], doorCount: Math.max(1, val || 1) };
      return next;
    });
  };

  const removeHardwareSet = (setIdx: number) => {
    if (projectHardwareSets.length <= 1) return;
    setProjectHardwareSets((prev) => prev.filter((_, i) => i !== setIdx));
    if (activeSetIndex >= setIdx && activeSetIndex > 0) {
      setActiveSetIndex(activeSetIndex - 1);
    }
  };

  // Add another Hardware Set to project schedule
  const handleAddHardwareSetToProject = (hw: HardwareMatchedSet) => {
    const newProjectSet: ProjectHardwareSet = {
      id: `hs-${Date.now()}-${hw.id}`,
      name: hw.name,
      doorType: hw.door_type,
      category: hw.category,
      doorCount: 12,
      components: hw.components && hw.components.length > 0
        ? hw.components
        : [
            {
              product_id: 2,
              product_name: 'Schlage ND Series Commercial Lever',
              sku: 'SCH-ND80-619',
              category: 'Levers',
              quantity: 1,
              unit_price: 145,
            },
            {
              product_id: 6,
              product_name: 'ASSA ABLOY Cam Motion Concealed Hinge',
              sku: 'AA-HG-BB1279',
              category: 'Hinges',
              quantity: 2,
              unit_price: 24.5,
            },
          ],
      isCustomized: false,
      matchScore: hw.match_pct || 80,
      isExactMatch: hw.is_exact_match,
    };

    setProjectHardwareSets((prev) => [...prev, newProjectSet]);
    setActiveSetIndex(projectHardwareSets.length);
    setShowAddSetModal(false);
  };

  // Save active set as New Reusable Hardware Set in Library
  const handleOpenSaveModal = () => {
    if (!activeSet) return;
    setNewSetName(activeSet.name);
    setNewSetDoorType(activeSet.doorType);
    setNewSetCategory(activeSet.category);
    setNewSetNotes(`Customized hardware set for ${project.name} requirements.`);
    setShowSaveModal(true);
  };

  const handleSaveToLibrary = async () => {
    if (!newSetName.trim() || !activeSet) return;
    setIsSavingSet(true);

    try {
      const payload = {
        name: newSetName.trim(),
        door_type: newSetDoorType || activeSet.doorType || 'Main Entry',
        category: newSetCategory || activeSet.category || 'Commercial',
        specifications: newSetNotes || `Customized hardware set for ${project.name} requirements.`,
        components: activeSet.components.map((c) => ({
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
        setProjectHardwareSets((prev) => {
          const next = [...prev];
          next[activeSetIndex] = {
            ...next[activeSetIndex],
            name: newSetName.trim(),
            savedLibraryId: res.id,
            isCustomized: false,
          };
          return next;
        });
        setShowSaveModal(false);
        logAudit({
          action: 'Created Reusable Hardware Set',
          category: 'Knowledge',
          projectId,
          projectName: project.name,
          objectId: String(res.id),
          details: `Saved new reusable hardware set "${newSetName}" with ${activeSet.components.length} components to the library.`,
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

  // Calculate Overall Totals Across All Hardware Sets
  const totalAllDoors = projectHardwareSets.reduce((sum, s) => sum + (s.doorCount || 0), 0);

  const totalAllItems = projectHardwareSets.reduce(
    (sum, s) =>
      sum + s.components.reduce((cSum, c) => cSum + (c.quantity || 1) * s.doorCount, 0),
    0
  );

  const totalAllMaterialCost = projectHardwareSets.reduce((sum, s) => {
    const sCost = s.components.reduce(
      (cSum, c) => cSum + (c.quantity || 1) * Number(c.unit_price ?? c.unitPrice ?? 0),
      0
    );
    return sum + sCost * s.doorCount;
  }, 0);

  const activeSetCost = activeSet
    ? activeSet.components.reduce(
        (sum, c) => sum + (c.quantity || 1) * Number(c.unit_price ?? c.unitPrice ?? 0),
        0
      )
    : 0;

  // Complete Verification & Advance to Pricing
  const handleProceedToPricing = () => {
    dispatch({
      type: 'SET_VERIFIED_HARDWARE_SELECTION',
      payload: {
        projectId,
        hardwareSets: projectHardwareSets.map((s) => ({
          id: s.savedLibraryId || s.id,
          name: s.name,
          doorType: s.doorType,
          doorCount: s.doorCount,
          components: s.components,
        })),
      },
    });

    logAudit({
      action: 'Verified Hardware Sets & Schedule',
      category: 'Recommendation',
      projectId,
      projectName: project.name,
      details: `Verified ${projectHardwareSets.length} hardware sets across ${totalAllDoors} total openings. Total proposal material value: AED ${totalAllMaterialCost.toLocaleString()}.`,
      status: 'Success',
    });

    router.push(`/projects/${projectId}/pricing`);
  };

  // Filter products in catalog modal
  const filteredCatalog = catalogProducts.filter((p) => {
    const q = productSearch.toLowerCase();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  // Filter available hardware sets for Add Set modal
  const availableSetsToAdd = (matchResult?.all_scored || allLibrarySets).filter((hs) => {
    const alreadyInProject = projectHardwareSets.some(
      (ps) => ps.name.toLowerCase() === hs.name.toLowerCase()
    );
    const q = setSearchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      hs.name.toLowerCase().includes(q) ||
      hs.door_type.toLowerCase().includes(q) ||
      hs.category.toLowerCase().includes(q);
    return !alreadyInProject && matchesQuery;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h3 className="text-xl font-bold text-slate-900">
              Hardware Sets Selection &amp; Component Verification
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
          {activeSet?.savedLibraryId ? (
            <Badge variant="success" className="px-3 py-1.5 text-xs gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Saved to Library (#{activeSet.savedLibraryId})
            </Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-blue-700 border-blue-200 hover:bg-blue-50"
              onClick={handleOpenSaveModal}
            >
              <BookmarkPlus className="h-4 w-4" /> Save Active Set to Library
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
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 bg-white/70 px-2 py-0.5 rounded border border-emerald-200 text-[11px]"
                    >
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
                    <p className="text-slate-700 leading-relaxed">
                      {matchResult.customisation_plan.rationale}
                    </p>
                    {matchResult.customisation_plan.added_products &&
                      matchResult.customisation_plan.added_products.length > 0 && (
                        <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-700 font-medium">
                          <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                            Added:
                          </span>
                          {matchResult.customisation_plan.added_products.join(', ')}
                        </div>
                      )}
                    {matchResult.customisation_plan.removed_products &&
                      matchResult.customisation_plan.removed_products.length > 0 && (
                        <div className="flex items-center gap-2 pt-0.5 text-[11px] text-red-700 font-medium">
                          <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                            Removed:
                          </span>
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

      {/* Hardware Sets Selector Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Configured Hardware Sets in Project Schedule ({projectHardwareSets.length})
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Click a hardware set below to inspect, verify, and customize its individual component list.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddSetModal(true)}
            className="gap-1.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" /> Add Another Hardware Set
          </Button>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-3">
          {projectHardwareSets.map((hwSet, sIdx) => {
            const isSelected = activeSetIndex === sIdx;
            const setCost = hwSet.components.reduce(
              (sum, c) => sum + (c.quantity || 1) * Number(c.unit_price ?? c.unitPrice ?? 0),
              0
            );

            return (
              <button
                key={hwSet.id}
                type="button"
                onClick={() => setActiveSetIndex(sIdx)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className={`p-1.5 rounded-md ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <DoorOpen className="h-4 w-4" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                      {hwSet.name}
                    </span>
                    <Badge variant={isSelected ? 'info' : 'neutral'} className="text-[10px] px-1.5 py-0">
                      {hwSet.doorCount} Sets
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{hwSet.doorType}</span>
                    <span>&bull;</span>
                    <span className="font-semibold text-slate-700">{formatCurrency(setCost)} / set</span>
                  </div>
                </div>

                {projectHardwareSets.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeHardwareSet(sIdx);
                    }}
                    className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors ml-1"
                    title="Remove set from schedule"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Verification Card for Active Set */}
      {activeSet && (
        <Card className="border border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-800">
                  Component Verification Table &mdash; {activeSet.name}
                </CardTitle>
                {activeSet.isCustomized && (
                  <Badge variant="neutral" className="text-[11px] bg-purple-100 text-purple-700 border-purple-200">
                    Customized
                  </Badge>
                )}
                <Badge variant="info" className="text-[11px]">
                  Scheduled for {activeSet.doorCount} Openings
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Door Type: <strong>{activeSet.doorType}</strong> &bull; Category: <strong>{activeSet.category}</strong> &bull; Single Door Set Value: <strong>{formatCurrency(activeSetCost)}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => setShowAddProductModal(true)}
              >
                <Plus className="h-3.5 w-3.5 text-blue-600" /> Add Component to This Set
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
                {activeSet.components.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                      No components currently in this hardware set. Click &quot;Add Component to This Set&quot; to begin.
                    </TableCell>
                  </TableRow>
                ) : (
                  activeSet.components.map((comp, idx) => {
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
                              onClick={() => handleComponentQuantityChange(idx, -1)}
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
                              onClick={() => handleComponentQuantityChange(idx, 1)}
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
      )}

      {/* Total Set Count For Each Hardware Set & Scaled Summary */}
      <Card className="border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5 text-blue-600" />
              <h4 className="text-base font-bold text-slate-900">
                Total Hardware Sets Count
              </h4>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify the total set count / quantity of openings for each hardware set in the project schedule.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddSetModal(true)}
            className="gap-1.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" /> Add Another Hardware Set
          </Button>
        </div>

        {/* Schedule List: Each Hardware Set with its Individual Set Count */}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          {projectHardwareSets.map((hwSet, sIdx) => {
            const setCost = hwSet.components.reduce(
              (sum, c) => sum + (c.quantity || 1) * Number(c.unit_price ?? c.unitPrice ?? 0),
              0
            );
            const setSubtotal = setCost * hwSet.doorCount;
            const isActive = activeSetIndex === sIdx;

            return (
              <div
                key={hwSet.id}
                className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  isActive ? 'bg-blue-50/40 border-l-4 border-l-blue-600' : 'hover:bg-slate-50/50'
                }`}
              >
                {/* Hardware Set Details */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{hwSet.name}</span>
                    <Badge variant="neutral" className="text-[11px]">{hwSet.doorType}</Badge>
                    {isActive && (
                      <Badge variant="purple" className="text-[10px]">Editing Components</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                    <span>{hwSet.components.length} components included</span>
                    <span>&bull;</span>
                    <span>Set Unit Cost: <strong className="text-slate-700">{formatCurrency(setCost)} / set</strong></span>
                    <span>&bull;</span>
                    <button
                      type="button"
                      onClick={() => setActiveSetIndex(sIdx)}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      {isActive ? 'Currently In Component View' : 'Inspect Components'}
                    </button>
                  </div>
                </div>

                {/* Set Count Controller & Total Cost for this Hardware Set */}
                <div className="flex items-center gap-6 self-end md:self-center">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
                      Hardware Set Subtotal
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatCurrency(setSubtotal)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center border border-slate-300 rounded-lg bg-white shadow-xs overflow-hidden">
                      <button
                        type="button"
                        onClick={() => updateSetCount(sIdx, -1)}
                        disabled={hwSet.doorCount <= 1}
                        className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={hwSet.doorCount}
                        onChange={(e) => setDirectSetCount(sIdx, parseInt(e.target.value, 10) || 1)}
                        className="w-16 text-center font-bold text-slate-900 border-x border-slate-200 py-1 text-sm focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateSetCount(sIdx, 1)}
                        className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-xs font-semibold text-slate-600">sets</span>
                  </div>

                  {projectHardwareSets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeHardwareSet(sIdx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                      title="Remove this hardware set from proposal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Combined Grand Total Summary Bar */}
        <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-8 text-sm">
            <div>
              <span className="text-xs text-slate-500 block font-medium">Combined Total Hardware Sets</span>
              <span className="text-xl font-bold text-blue-700">{totalAllDoors} Sets</span>
            </div>
            <div className="h-8 w-px bg-slate-300" />
            <div>
              <span className="text-xs text-slate-500 block font-medium">Total Line Item Units (BOQ)</span>
              <span className="text-xl font-bold text-slate-800">{totalAllItems.toLocaleString()} units</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500 block font-medium">Combined Material Proposal Value</span>
            <span className="text-2xl font-black text-emerald-700">{formatCurrency(totalAllMaterialCost)}</span>
          </div>
        </div>
      </Card>

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
            <span>Confirm All Hardware Sets ({totalAllDoors} Sets) &amp; Proceed to Pricing</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Modal: Save Active Set as Reusable Hardware Set */}
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
              Included Components ({activeSet?.components.length || 0}):
            </p>
            <ul className="list-disc pl-4 space-y-0.5">
              {activeSet?.components.map((c, i) => (
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
        description={`Select an architectural hardware item from the catalog dataset to add to "${activeSet?.name || 'this hardware set'}".`}
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
                      <Plus className="h-3.5 w-3.5" /> Add to Set
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

      {/* Modal: Add Another Hardware Set to Project Schedule */}
      <Dialog
        open={showAddSetModal}
        onClose={() => setShowAddSetModal(false)}
        title="Add Hardware Set to Project Schedule"
        description="Select an additional hardware set configuration from the library to include in this proposal."
        size="lg"
      >
        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search hardware set name, door type, or category..."
              value={setSearchQuery}
              onChange={(e) => setSetSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {availableSetsToAdd.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                All available hardware sets have already been added to this project schedule.
              </div>
            ) : (
              availableSetsToAdd.map((hs) => (
                <div
                  key={hs.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{hs.name}</span>
                      <Badge variant="neutral" className="text-[11px]">{hs.door_type}</Badge>
                      <Badge variant="info" className="text-[10px]">{hs.category}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-lg line-clamp-1">
                      {hs.specifications || 'Standard architectural commercial door assembly.'}
                    </p>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      {hs.components?.length || 0} component items defined
                    </span>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleAddHardwareSetToProject(hs)}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add to Schedule
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setShowAddSetModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
