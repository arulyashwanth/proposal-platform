import { cn } from '@/lib/utils';
import { ConfidenceLevel } from '@/types';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export function ConfidenceBadge({ level, showLabel = true, className }: { level: ConfidenceLevel; showLabel?: boolean; className?: string }) {
  const configs: Record<ConfidenceLevel, { icon: React.ReactNode; label: string; className: string }> = {
    High: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: 'High',
      className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    Medium: {
      icon: <AlertTriangle className="h-3 w-3" />,
      label: 'Medium',
      className: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    Low: {
      icon: <AlertCircle className="h-3 w-3" />,
      label: 'Low',
      className: 'text-red-700 bg-red-50 border-red-200',
    },
  };
  const { icon, label, className: variantClass } = configs[level];
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', variantClass, className)}>
      {icon}
      {showLabel && <span>{label} confidence</span>}
    </span>
  );
}
