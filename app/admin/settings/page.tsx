'use client';
import React, { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button, Card, CardHeader, CardTitle, CardContent, Input } from '@/components/ui';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  return (
    <AppShell breadcrumbs={[{ label: 'Administration', href: '/admin' }, { label: 'Settings' }]} title="Settings">
      <div className="p-6 max-w-2xl space-y-6">
        <div><h2 className="text-lg font-semibold text-slate-800">Application Settings</h2><p className="text-sm text-slate-500 mt-0.5">General configuration for the platform</p></div>
        <Card>
          <CardHeader><CardTitle>Company Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input label="Company Name" defaultValue="VaultSpec Ltd" id="company-name" />
            <Input label="Company Address" defaultValue="12 Innovation Quarter, Birmingham, B1 2AA" id="company-address" />
            <Input label="Contact Email" defaultValue="proposals@vaultspec.com" id="contact-email" />
            <Input label="Contact Phone" defaultValue="+44 121 555 0100" id="contact-phone" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Proposal Defaults</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input label="Default VAT Rate (%)" defaultValue="20" type="number" id="vat-rate" />
            <Input label="Default Discount (%)" defaultValue="5" type="number" id="discount" />
            <Input label="Proposal Validity (days)" defaultValue="30" type="number" id="validity" />
            <Input label="Default Terms & Conditions" defaultValue="Standard terms apply. Subject to survey." id="terms" />
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            {saved ? 'Saved!' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
