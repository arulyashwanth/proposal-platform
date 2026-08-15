import { cn } from '@/lib/utils';
import { AISource } from '@/types';
import { FileText, BookOpen, ExternalLink } from 'lucide-react';

export function SourceReference({ source, onClick, className }: { source: AISource; onClick?: () => void; className?: string }) {
  const icons: Record<AISource['type'], React.ReactNode> = {
    Document: <FileText className="h-3 w-3" />,
    Library: <BookOpen className="h-3 w-3" />,
    Specification: <FileText className="h-3 w-3" />,
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors group',
        className
      )}
      aria-label={`View source: ${source.label}`}
    >
      {icons[source.type]}
      <span className="group-hover:underline">{source.label}</span>
      {onClick && <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
    </button>
  );
}

export function SourcesList({ sources }: { sources: AISource[] }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-500">Sources</span>
      {sources.map((s) => (
        <SourceReference key={s.id} source={s} />
      ))}
    </div>
  );
}
