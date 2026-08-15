import { ProjectStatus } from '@/types';
import { cn } from '@/lib/utils';
import {
  FileEdit, Search, CheckSquare, Package, DollarSign,
  FileText, Eye, ThumbsUp, Send, AlertCircle
} from 'lucide-react';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string; icon: React.ReactNode }> = {
  Draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 border-slate-200', icon: <FileEdit className="h-3 w-3" /> },
  Requirements: { label: 'Requirements', className: 'bg-sky-50 text-sky-700 border-sky-200', icon: <FileText className="h-3 w-3" /> },
  'AI Analysis': { label: 'AI Analysis', className: 'bg-purple-50 text-purple-700 border-purple-200', icon: <Search className="h-3 w-3" /> },
  'Requirement Review': { label: 'Req. Review', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: <AlertCircle className="h-3 w-3" /> },
  'Product Selection': { label: 'Product Selection', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Package className="h-3 w-3" /> },
  Pricing: { label: 'Pricing', className: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: <DollarSign className="h-3 w-3" /> },
  'Proposal Draft': { label: 'Proposal Draft', className: 'bg-violet-50 text-violet-700 border-violet-200', icon: <FileText className="h-3 w-3" /> },
  'Human Review': { label: 'Human Review', className: 'bg-orange-50 text-orange-700 border-orange-200', icon: <Eye className="h-3 w-3" /> },
  Approval: { label: 'Approval', className: 'bg-teal-50 text-teal-700 border-teal-200', icon: <ThumbsUp className="h-3 w-3" /> },
  Submitted: { label: 'Submitted', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <Send className="h-3 w-3" /> },
};

export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.Draft;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border', config.className, className)}>
      {config.icon}
      {config.label}
    </span>
  );
}
