'use client';
import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button, Card, CardHeader, CardTitle, CardContent, Alert } from '@/components/ui';
import { defaultAIConfiguration } from '@/mock';
import { AIConfiguration } from '@/types';
import { Zap, Eye, BookOpen, CheckSquare, Save } from 'lucide-react';

function Toggle({ checked, onChange, id, label }: { checked: boolean; onChange: (v: boolean) => void; id: string; label: string }) {
  return (
    <label htmlFor={id} className="flex items-center justify-between cursor-pointer py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <div
        id={id}
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => onChange(!checked)}
        onKeyDown={e => e.key === ' ' && onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
    </label>
  );
}

export default function AIConfigPage() {
  const [config, setConfig] = useState<AIConfiguration>(defaultAIConfiguration);
  const [saved, setSaved] = useState(false);

  const updateBehaviour = (key: keyof AIConfiguration['behaviour'], value: boolean) =>
    setConfig(c => ({ ...c, behaviour: { ...c.behaviour, [key]: value } }));
  const updateKnowledge = (key: keyof AIConfiguration['knowledgeSources'], value: boolean) =>
    setConfig(c => ({ ...c, knowledgeSources: { ...c.knowledgeSources, [key]: value } }));

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <AppShell breadcrumbs={[{ label: 'Administration', href: '/admin' }, { label: 'AI Configuration' }]} title="AI Configuration">
      <div className="p-6 max-w-2xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">AI Configuration</h2>
          <p className="text-sm text-slate-500 mt-0.5">Configure AI model settings, knowledge sources, and behaviour guardrails</p>
        </div>
        <Alert variant="info">These are UI-level configuration settings. They define how the AI assistant behaves in the platform. Changes are saved to the application configuration and take effect for new sessions.</Alert>
        <Card>
          <CardHeader><CardTitle>Model Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Language Model</label>
              <select className="w-full h-9 rounded border border-slate-300 px-3 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={config.model} onChange={e => setConfig(c => ({ ...c, model: e.target.value }))}>
                <option>Local Model (Ollama — Llama 3.1)</option>
                <option>Local Model (Ollama — Mistral)</option>
                <option>OpenAI GPT-4o (via API)</option>
                <option>Anthropic Claude 3.5 (via API)</option>
                <option>Azure OpenAI (Enterprise)</option>
              </select>
            </div>
            <Toggle id="vision" checked={config.visionEnabled} onChange={v => setConfig(c => ({ ...c, visionEnabled: v }))} label="Enable Vision Analysis (architectural drawings, door schedules)" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Knowledge Sources</CardTitle></CardHeader>
          <CardContent className="divide-y divide-slate-50">
            <Toggle id="ks-products" checked={config.knowledgeSources.products} onChange={v => updateKnowledge('products', v)} label="Products Library" />
            <Toggle id="ks-doorsets" checked={config.knowledgeSources.doorSets} onChange={v => updateKnowledge('doorSets', v)} label="Door Sets Library" />
            <Toggle id="ks-supplier" checked={config.knowledgeSources.supplierPrices} onChange={v => updateKnowledge('supplierPrices', v)} label="Supplier Price Lists" />
            <Toggle id="ks-specs" checked={config.knowledgeSources.specifications} onChange={v => updateKnowledge('specifications', v)} label="Uploaded Specifications" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>AI Behaviour Guardrails</CardTitle></CardHeader>
          <CardContent className="divide-y divide-slate-50">
            <Toggle id="bh-sources" checked={config.behaviour.showSourceReferences} onChange={v => updateBehaviour('showSourceReferences', v)} label="Always show source references for AI findings" />
            <Toggle id="bh-conf" checked={config.behaviour.showConfidence} onChange={v => updateBehaviour('showConfidence', v)} label="Show confidence scores on AI-derived values" />
            <Toggle id="bh-flag" checked={config.behaviour.flagLowConfidence} onChange={v => updateBehaviour('flagLowConfidence', v)} label="Flag low-confidence results for user review" />
            <Toggle id="bh-confirm" checked={config.behaviour.requireHumanConfirmation} onChange={v => updateBehaviour('requireHumanConfirmation', v)} label="Require human confirmation before advancing workflow" />
            <Toggle id="bh-approve" checked={config.behaviour.requireHumanApproval} onChange={v => updateBehaviour('requireHumanApproval', v)} label="Require human approval before proposal submission" />
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button onClick={handleSave} className="gap-2"><Save className="h-4 w-4" />{saved ? 'Saved!' : 'Save Configuration'}</Button>
        </div>
      </div>
    </AppShell>
  );
}
