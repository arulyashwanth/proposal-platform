'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useApp } from '@/context/AppContext';
import { currentUser } from '@/mock';
import {
  LayoutDashboard, FolderOpen, FileText, BookOpen, Package, DoorOpen,
  TruckIcon, Library, Users, Settings, Cpu, ClipboardList,
  ChevronLeft, ChevronRight, Bell, Search, User as UserIcon,
  LogOut, HelpCircle, Menu, X, AlertTriangle, CheckCircle2, Info, XCircle,
  Zap, Building2,
} from 'lucide-react';
import { cn as cnAlias } from '@/lib/utils';
import { Badge } from '@/components/ui';

// ============================================================
// Navigation structure
// ============================================================
const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderOpen },
  { label: 'Proposals', href: '/proposals', icon: FileText },
  {
    label: 'Knowledge',
    icon: BookOpen,
    children: [
      { label: 'Products', href: '/knowledge/products', icon: Package },
      { label: 'Door Sets', href: '/knowledge/door-sets', icon: DoorOpen },
      { label: 'Supplier Prices', href: '/knowledge/suppliers', icon: TruckIcon },
      { label: 'Documents', href: '/knowledge/documents', icon: Library },
    ],
  },
];

const ADMIN_ITEMS = [
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
  { label: 'AI Configuration', href: '/admin/ai', icon: Cpu },
  { label: 'Audit Log', href: '/admin/audit-log', icon: ClipboardList },
];

// ============================================================
// Sidebar Link
// ============================================================
function NavLink({
  href, icon: Icon, label, active, collapsed, badge,
}: {
  href: string; icon: React.ElementType; label: string; active?: boolean;
  collapsed?: boolean; badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors group relative',
        active
          ? 'bg-blue-50 text-blue-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-700')} />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {!collapsed && badge != null && badge > 0 && (
        <span className="ml-auto text-xs bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 font-semibold">{badge}</span>
      )}
      {collapsed && badge != null && badge > 0 && (
        <span className="absolute top-0.5 right-0.5 h-2 w-2 bg-amber-400 rounded-full" />
      )}
    </Link>
  );
}

// ============================================================
// Sidebar
// ============================================================
function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-full bg-white border-r border-slate-200 flex flex-col z-30 transition-all duration-200',
        collapsed ? 'w-14' : 'w-60'
      )}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className={cn('flex items-center h-14 px-3 border-b border-slate-100 shrink-0', collapsed ? 'justify-center' : 'gap-2.5')}>
        <div className="h-7 w-7 bg-blue-600 rounded flex items-center justify-center shrink-0">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-sm font-bold text-slate-800 truncate">VaultSpec</div>
            <div className="text-xs text-slate-400 truncate">Proposal Platform</div>
          </div>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          if ('children' in item && item.children) {
            const childrenList = item.children;
            const groupActive = childrenList.some((c) => isActive(c.href));
            return (
              <div key={item.label}>
                {!collapsed && (
                  <div className={cn('px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide mt-2 mb-0.5', groupActive && 'text-slate-500')}>
                    {item.label}
                  </div>
                )}
                {collapsed && <div className="h-px bg-slate-100 mx-1 my-2" />}
                {childrenList.map((child) => (
                  <NavLink
                    key={child.href}
                    href={child.href}
                    icon={child.icon}
                    label={child.label}
                    active={isActive(child.href)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            );
          }
          return (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={isActive(item.href)}
              collapsed={collapsed}
            />
          );
        })}

        {/* Admin section */}
        <div className="h-px bg-slate-100 mx-1 my-3" />
        {!collapsed && (
          <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
            Administration
          </div>
        )}
        {ADMIN_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={isActive(item.href)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* User profile */}
      <div className={cn('px-2 py-3 border-t border-slate-100 shrink-0')}>
        <div className={cn('flex items-center gap-2.5 px-2 py-2 rounded hover:bg-slate-50 cursor-pointer', collapsed && 'justify-center px-1')}>
          <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-blue-700">
              {currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden min-w-0">
              <div className="text-xs font-semibold text-slate-700 truncate">{currentUser.name}</div>
              <div className="text-xs text-slate-400 truncate">{currentUser.role}</div>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-16 h-6 w-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 shadow-sm transition-colors z-10"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}

// ============================================================
// Notifications Panel
// ============================================================
function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useApp();
  const { notifications } = state;

  const typeIcon = (type: string) => {
    switch (type) {
      case 'Warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'Success': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'Error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-xl z-50 animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' })}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            Mark all read
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">No notifications</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                'flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer',
                !n.isRead && 'bg-blue-50/40'
              )}
              onClick={() => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: { id: n.id } })}
            >
              <div className="shrink-0 mt-0.5">{typeIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-sm', n.isRead ? 'text-slate-600 font-normal' : 'text-slate-800 font-medium')}>{n.title}</p>
                  {!n.isRead && <div className="h-2 w-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.description}</p>
                <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(n.timestamp)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// Global Search
// ============================================================
function GlobalSearch({ onClose }: { onClose: () => void }) {
  const { state } = useApp();
  const [query, setQuery] = useState('');

  const results = query.length > 1 ? [
    ...state.projects.filter((p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.customer.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 3).map((p) => ({
      type: 'Project', title: p.name, subtitle: p.customer, href: `/projects/${p.id}`,
    })),
  ] : [];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-lg shadow-xl w-full max-w-xl mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            autoFocus
            type="text"
            placeholder="Search projects, products, door sets, documents..."
            className="flex-1 text-sm bg-transparent focus:outline-none text-slate-800 placeholder:text-slate-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Esc</kbd>
        </div>
        {results.length > 0 && (
          <div className="py-2 divide-y divide-slate-50">
            <div className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Projects</div>
            {results.map((r, i) => (
              <Link
                key={i}
                href={r.href}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
              >
                <FolderOpen className="h-4 w-4 text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-800">{r.title}</div>
                  <div className="text-xs text-slate-500">{r.subtitle}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
        {query.length > 1 && results.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-400">No results for &quot;{query}&quot;</div>
        )}
        {query.length === 0 && (
          <div className="px-4 py-3 text-xs text-slate-400">
            Type to search across projects, products, door sets, and documents
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Top Header
// ============================================================
function TopHeader({
  sidebarCollapsed,
  breadcrumbs,
  title,
}: {
  sidebarCollapsed: boolean;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  title?: string;
}) {
  const { state, dispatch } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const unreadCount = state.notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <header
        className={cn(
          'fixed top-0 right-0 h-14 bg-white border-b border-slate-200 flex items-center gap-4 px-4 z-20 transition-all duration-200',
          sidebarCollapsed ? 'left-14' : 'left-60'
        )}
      >
        {/* Breadcrumbs / Title */}
        <div className="flex-1 min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
              {breadcrumbs.map((b, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight className="h-3 w-3" />}
                  {b.href ? (
                    <Link href={b.href} className="hover:text-slate-600 transition-colors">{b.label}</Link>
                  ) : (
                    <span>{b.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}
          {title && <h1 className="text-sm font-semibold text-slate-800 truncate">{title}</h1>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Search */}
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 h-8 px-3 rounded border border-slate-200 bg-slate-50 text-sm text-slate-400 hover:border-slate-300 hover:text-slate-600 transition-colors"
            aria-label="Search"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="text-xs hidden md:inline">Search</span>
            <kbd className="hidden md:inline text-xs bg-slate-200 text-slate-500 px-1 rounded ml-1">⌘K</kbd>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="relative h-8 w-8 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </button>
            {showNotifications && (
              <NotificationsPanel onClose={() => setShowNotifications(false)} />
            )}
          </div>

          {/* AI Assistant toggle */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_AI_ASSISTANT' })}
            className={cn(
              'h-8 px-2.5 flex items-center gap-1.5 rounded text-xs font-medium transition-colors',
              state.aiAssistantOpen
                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            )}
            aria-label="Toggle AI Assistant"
          >
            <Zap className="h-3.5 w-3.5" />
            <span className="hidden md:inline">AI Assistant</span>
          </button>

          {/* User avatar */}
          <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center cursor-pointer" title={currentUser.name}>
            <span className="text-xs font-semibold text-blue-700">
              {currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </span>
          </div>
        </div>
      </header>

      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}
    </>
  );
}

// ============================================================
// AI Assistant Panel
// ============================================================
export function AIAssistantPanel({ projectName }: { projectName?: string }) {
  const { state } = useApp();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>>([
    {
      role: 'assistant',
      content: projectName
        ? `I am ready to assist with **${projectName}**. I have reviewed the project requirements, documents, and recommendations. What would you like to explore?`
        : 'Welcome to the AI Assistant. Select a project to get contextual assistance.',
      timestamp: new Date().toISOString(),
    },
  ]);

  const SUGGESTED_ACTIONS = [
    'Explain recommendation',
    'Find alternative',
    'Check compatibility',
    'Review pricing',
    'Summarise project',
    'Identify missing information',
  ];

  const MOCK_RESPONSES: Record<string, string> = {
    'explain recommendation': 'Door Set **DS-004** was recommended because it satisfies all confirmed project requirements:\n\n• **120-minute fire rating** — confirmed in Specification.pdf p.12\n• **High security level** — specified in Specification.pdf p.18\n• **Stainless steel finish** — identified in Drawing A-102 p.6\n• **Commercial project type** compatibility — verified against Door Set Library\n\nDS-004 is supplied by Dorma Kaba Group with current pricing (v2026.Q1).',
    'find alternative': 'The next best alternative is **DS-006** (88% match).\n\nDS-006 also meets the 120-minute fire rating but uses **standard security ironmongery** instead of high-security, and the finish is chrome-plated rather than stainless steel.\n\nIf the fire rating is the primary requirement and security/finish can be revised, DS-006 offers a lower base price.\n\n**Source:** Door Set Library — DS-006',
    'check compatibility': 'Based on confirmed requirements, DS-004 is **fully compatible** with this project:\n\n✓ Fire Rating: 120 min ✓\n✓ Security Level: High ✓\n✓ Finish: Stainless Steel ✓\n✓ Project Type: Commercial ✓\n\n⚠ **Note:** Supplier price list for Allegion UK (lockset component) is 45 days outdated. Verify pricing before submission.',
    'review pricing': '⚠ **Pricing Notice:** The Allegion UK price list (v2025.Q4) used for the High Security Lockset (HSL-G7-CP) is **45 days outdated**.\n\nThe current subtotal of **£134,880** may change when the price list is updated.\n\nRecommended action: Request updated price list from Allegion UK before approving pricing.',
    'summarise project': `**Project Alpha Summary**\n\nCustomer: Northbridge Commercial Developments\nType: Commercial Tender\nLocation: Manchester, UK\n\n**Scope:** 48 internal fire-rated doors\n**Key requirements:** 120-min fire rating, high security, stainless steel finish\n**Selected Door Set:** DS-004 (94% match)\n**Pricing estimate:** £157,263 (pending approval)\n**Submission deadline:** 15 September 2026`,
    'identify missing information': 'I have identified the following items that may require attention:\n\n1. **Access Control specification** — Requirement flagged as "RFID Card Reader Required" with Medium confidence. Please verify with client.\n\n2. **Allegion UK price list** — 45 days outdated. Pricing may be affected.\n\n3. **Installation allowance** — £3,500 is included as an estimate. Consider requesting an actual site survey quote.',
  };

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    const userMsg = { role: 'user' as const, content: input, timestamp: new Date().toISOString() };
    const key = input.toLowerCase().trim();
    const responseContent = Object.entries(MOCK_RESPONSES).find(([k]) => key.includes(k))?.[1]
      ?? `Thank you for your question about "${input}". In the production system, this would be processed by the connected LLM with access to the project's requirements, documents, and knowledge base. This is a demonstration of the AI Assistant UI.`;
    const aiMsg = { role: 'assistant' as const, content: responseContent, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput('');
  }, [input]);

  if (!state.aiAssistantOpen) return null;

  return (
    <aside className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-purple-100 flex items-center justify-center">
            <Zap className="h-3 w-3 text-purple-600" />
          </div>
          <span className="text-sm font-semibold text-slate-800">AI Assistant</span>
          <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full px-1.5 py-0.5">Ready</span>
        </div>
      </div>

      {/* Context */}
      {projectName && (
        <div className="px-4 py-2 bg-purple-50/50 border-b border-purple-100 shrink-0">
          <p className="text-xs text-purple-600 font-medium">Context: {projectName}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-2', msg.role === 'user' && 'flex-row-reverse')}>
            {msg.role === 'assistant' && (
              <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="h-3 w-3 text-purple-600" />
              </div>
            )}
            <div className={cn(
              'rounded-lg px-3 py-2 text-xs max-w-[85%]',
              msg.role === 'assistant'
                ? 'bg-slate-100 text-slate-700'
                : 'bg-blue-600 text-white ml-auto'
            )}>
              {msg.content.split('\n').map((line, li) => {
                const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                return line.startsWith('•') || line.startsWith('✓') || line.startsWith('⚠')
                  ? <p key={li} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: boldLine }} />
                  : <p key={li} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: boldLine }} />;
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Suggested actions */}
      <div className="px-4 py-2 border-t border-slate-100 shrink-0">
        <p className="text-xs text-slate-400 mb-2">Suggested</p>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => { setInput(action); }}
              className="text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about this project..."
            className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400 text-slate-700"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="h-8 w-8 bg-purple-600 text-white rounded flex items-center justify-center hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">AI assistant is contextual. Responses are based on project data only.</p>
      </div>
    </aside>
  );
}

// ============================================================
// App Shell
// ============================================================
export function AppShell({
  children,
  breadcrumbs,
  title,
  projectName,
  showAIAssistant = false,
}: {
  children: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  title?: string;
  projectName?: string;
  showAIAssistant?: boolean;
}) {
  const { state, dispatch } = useApp();
  const { sidebarCollapsed } = state;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
      />
      <TopHeader
        sidebarCollapsed={sidebarCollapsed}
        breadcrumbs={breadcrumbs}
        title={title}
      />

      {/* Main area */}
      <div
        className={cn(
          'flex min-h-screen pt-14 transition-all duration-200',
          sidebarCollapsed ? 'ml-14' : 'ml-60'
        )}
      >
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
        {showAIAssistant && <AIAssistantPanel projectName={projectName} />}
      </div>
    </div>
  );
}
