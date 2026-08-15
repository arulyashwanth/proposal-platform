'use client';
import { ProjectStatus } from '@/types';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const STEPS: { key: ProjectStatus; label: string; short: string }[] = [
  { key: 'Requirements', label: 'Requirements', short: 'Req.' },
  { key: 'AI Analysis', label: 'AI Analysis', short: 'AI' },
  { key: 'Requirement Review', label: 'Review Requirements', short: 'Review' },
  { key: 'Product Selection', label: 'Product Selection', short: 'Products' },
  { key: 'Pricing', label: 'Pricing', short: 'Pricing' },
  { key: 'Proposal Draft', label: 'Proposal', short: 'Proposal' },
  { key: 'Human Review', label: 'Human Review', short: 'H.Review' },
  { key: 'Approval', label: 'Approval', short: 'Approve' },
  { key: 'Submitted', label: 'Submitted', short: 'Done' },
];

const STATUS_ORDER: ProjectStatus[] = [
  'Draft', 'Requirements', 'AI Analysis', 'Requirement Review',
  'Product Selection', 'Pricing', 'Proposal Draft', 'Human Review',
  'Approval', 'Submitted'
];

function getStepIndex(status: ProjectStatus) {
  return STATUS_ORDER.indexOf(status);
}

export function WorkflowStepper({ currentStatus, className }: { currentStatus: ProjectStatus; className?: string }) {
  const currentIdx = getStepIndex(currentStatus);
  return (
    <div className={cn('flex items-center gap-0 overflow-x-auto', className)}>
      {STEPS.map((step, i) => {
        const stepIdx = getStepIndex(step.key);
        const isCompleted = stepIdx < currentIdx;
        const isCurrent = stepIdx === currentIdx;
        const isPending = stepIdx > currentIdx;
        return (
          <div key={step.key} className="flex items-center">
            {i > 0 && (
              <div className={cn('h-px w-6 shrink-0', isCompleted || isCurrent ? 'bg-blue-500' : 'bg-slate-200')} />
            )}
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium whitespace-nowrap',
              isCompleted && 'text-emerald-600',
              isCurrent && 'text-blue-700 bg-blue-50',
              isPending && 'text-slate-400',
            )}>
              <span className={cn(
                'flex items-center justify-center h-4 w-4 rounded-full text-xs shrink-0',
                isCompleted && 'bg-emerald-500 text-white',
                isCurrent && 'bg-blue-600 text-white',
                isPending && 'bg-slate-200 text-slate-400',
              )}>
                {isCompleted ? <Check className="h-2.5 w-2.5" /> : <span>{i + 1}</span>}
              </span>
              <span>{step.short}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
