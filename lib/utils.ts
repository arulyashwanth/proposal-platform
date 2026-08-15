import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
}

export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export function getDaysUntil(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function calculatePricingTotals(
  items: Array<{ quantity: number; unitPrice: number }>,
  discountPercent: number,
  taxPercent: number,
  otherCosts: number
) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = (afterDiscount * taxPercent) / 100;
  const finalTotal = afterDiscount + taxAmount + otherCosts;
  return { subtotal, discountAmount, taxAmount, finalTotal };
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export const WORKFLOW_STAGES = [
  { key: 'Draft', label: 'Draft', step: 1 },
  { key: 'Requirements', label: 'Requirements', step: 2 },
  { key: 'AI Analysis', label: 'AI Analysis', step: 3 },
  { key: 'Requirement Review', label: 'Req. Review', step: 4 },
  { key: 'Product Selection', label: 'Products', step: 5 },
  { key: 'Pricing', label: 'Pricing', step: 6 },
  { key: 'Proposal Draft', label: 'Proposal', step: 7 },
  { key: 'Human Review', label: 'Review', step: 8 },
  { key: 'Approval', label: 'Approval', step: 9 },
  { key: 'Submitted', label: 'Submitted', step: 10 },
] as const;

export function getWorkflowStep(status: string): number {
  return WORKFLOW_STAGES.find((s) => s.key === status)?.step ?? 1;
}
