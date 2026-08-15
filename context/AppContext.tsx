'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import {
  Project,
  ProjectRequirement,
  SelectedProduct,
  AIRecommendation,
  Notification,
  AuditLogEntry,
  PricingSummary,
  RequirementStatus,
} from '@/types';
import {
  mockProjects,
  mockNotifications,
  mockAuditLog,
  currentUser,
} from '@/mock';
import { calculatePricingTotals, generateId } from '@/lib/utils';

// ============================================================
// State Shape
// ============================================================
interface AppState {
  projects: Project[];
  notifications: Notification[];
  auditLog: AuditLogEntry[];
  sidebarCollapsed: boolean;
  aiAssistantOpen: boolean;
}

// ============================================================
// Actions
// ============================================================
type Action =
  | { type: 'CREATE_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: { id: string; updates: Partial<Project> } }
  | { type: 'CONFIRM_REQUIREMENT'; payload: { projectId: string; requirementId: string } }
  | { type: 'EDIT_REQUIREMENT'; payload: { projectId: string; requirementId: string; value: string; status: RequirementStatus } }
  | { type: 'CONFIRM_ALL_REQUIREMENTS'; payload: { projectId: string } }
  | { type: 'COMPLETE_ANALYSIS'; payload: { projectId: string } }
  | { type: 'SELECT_DOOR_SET'; payload: { projectId: string; doorSetId: string; recommendationId: string } }
  | { type: 'UPDATE_PRODUCT_QUANTITY'; payload: { projectId: string; productId: string; quantity: number } }
  | { type: 'REMOVE_PRODUCT'; payload: { projectId: string; productId: string } }
  | { type: 'APPROVE_PRICING'; payload: { projectId: string } }
  | { type: 'RECALCULATE_PRICING'; payload: { projectId: string } }
  | { type: 'UPDATE_PRICING_FIELD'; payload: { projectId: string; field: keyof PricingSummary; value: number } }
  | { type: 'ADVANCE_STATUS'; payload: { projectId: string; status: Project['status'] } }
  | { type: 'MARK_NOTIFICATION_READ'; payload: { id: string } }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
  | { type: 'ADD_AUDIT_ENTRY'; payload: AuditLogEntry }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_AI_ASSISTANT' }
  | { type: 'SET_AI_ASSISTANT_OPEN'; payload: boolean };

// ============================================================
// Reducer
// ============================================================
function recalcPricing(project: Project): PricingSummary {
  const existing = project.pricing ?? {
    discountPercent: 5,
    taxPercent: 20,
    otherCosts: 3500,
    otherCostsDescription: 'Installation & site survey allowance',
    currency: 'GBP',
    isApproved: false,
  };
  const { subtotal, discountAmount, taxAmount, finalTotal } = calculatePricingTotals(
    project.selectedProducts.map((p) => ({ quantity: p.quantity, unitPrice: p.unitPrice })),
    existing.discountPercent,
    existing.taxPercent,
    existing.otherCosts
  );
  return { ...existing, subtotal, discountAmount, taxAmount, finalTotal };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'CREATE_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };

    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload.updates, updatedAt: new Date().toISOString() } : p
        ),
      };

    case 'CONFIRM_REQUIREMENT':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.projectId
            ? {
                ...p,
                requirements: p.requirements.map((r) =>
                  r.id === action.payload.requirementId ? { ...r, status: 'Confirmed' as RequirementStatus } : r
                ),
                updatedAt: new Date().toISOString(),
              }
            : p
        ),
      };

    case 'EDIT_REQUIREMENT':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.projectId
            ? {
                ...p,
                requirements: p.requirements.map((r) =>
                  r.id === action.payload.requirementId
                    ? { ...r, value: action.payload.value, status: action.payload.status, isEdited: true }
                    : r
                ),
                updatedAt: new Date().toISOString(),
              }
            : p
        ),
      };

    case 'CONFIRM_ALL_REQUIREMENTS':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.projectId
            ? {
                ...p,
                requirements: p.requirements.map((r) => ({ ...r, status: 'Confirmed' as RequirementStatus })),
                requirementsConfirmed: true,
                status: 'Product Selection' as Project['status'],
                updatedAt: new Date().toISOString(),
              }
            : p
        ),
      };

    case 'COMPLETE_ANALYSIS':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.projectId
            ? { ...p, analysisCompleted: true, status: 'Requirement Review', updatedAt: new Date().toISOString() }
            : p
        ),
      };

    case 'SELECT_DOOR_SET': {
      return {
        ...state,
        projects: state.projects.map((p) => {
          if (p.id !== action.payload.projectId) return p;
          const rec = p.recommendations.find((r) => r.id === action.payload.recommendationId);
          if (!rec) return p;
          const newProducts: SelectedProduct[] = rec.products.map((rp) => ({
            productId: rp.productId,
            productCode: rp.productCode,
            productName: rp.productName,
            description: '',
            quantity: rp.quantity,
            supplierId: rp.supplierId,
            supplierName: rp.supplierName,
            unitPrice: rp.unitPrice,
            currency: 'GBP',
            availability: rp.availability,
            status: 'Included',
          }));
          const updatedRecs: AIRecommendation[] = p.recommendations.map((r) => ({
            ...r,
            status: r.id === action.payload.recommendationId ? 'Accepted' : r.status === 'Accepted' ? 'Pending' : r.status,
          }));
          const updatedProject = { ...p, selectedDoorSetId: action.payload.doorSetId, selectedProducts: newProducts, recommendations: updatedRecs };
          return { ...updatedProject, pricing: recalcPricing(updatedProject), status: 'Pricing' as Project['status'], updatedAt: new Date().toISOString() };
        }),
      };
    }

    case 'UPDATE_PRODUCT_QUANTITY': {
      return {
        ...state,
        projects: state.projects.map((p) => {
          if (p.id !== action.payload.projectId) return p;
          const updatedProducts = p.selectedProducts.map((prod) =>
            prod.productId === action.payload.productId ? { ...prod, quantity: action.payload.quantity } : prod
          );
          const updatedProject = { ...p, selectedProducts: updatedProducts };
          return { ...updatedProject, pricing: recalcPricing(updatedProject), updatedAt: new Date().toISOString() };
        }),
      };
    }

    case 'REMOVE_PRODUCT': {
      return {
        ...state,
        projects: state.projects.map((p) => {
          if (p.id !== action.payload.projectId) return p;
          const updatedProducts = p.selectedProducts.filter((prod) => prod.productId !== action.payload.productId);
          const updatedProject = { ...p, selectedProducts: updatedProducts };
          return { ...updatedProject, pricing: recalcPricing(updatedProject), updatedAt: new Date().toISOString() };
        }),
      };
    }

    case 'RECALCULATE_PRICING':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.projectId ? { ...p, pricing: recalcPricing(p) } : p
        ),
      };

    case 'UPDATE_PRICING_FIELD': {
      return {
        ...state,
        projects: state.projects.map((p) => {
          if (p.id !== action.payload.projectId) return p;
          const updatedPricing = { ...(p.pricing ?? recalcPricing(p)), [action.payload.field]: action.payload.value };
          const { subtotal, discountAmount, taxAmount, finalTotal } = calculatePricingTotals(
            p.selectedProducts.map((prod) => ({ quantity: prod.quantity, unitPrice: prod.unitPrice })),
            updatedPricing.discountPercent,
            updatedPricing.taxPercent,
            updatedPricing.otherCosts
          );
          return { ...p, pricing: { ...updatedPricing, subtotal, discountAmount, taxAmount, finalTotal } };
        }),
      };
    }

    case 'APPROVE_PRICING':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.projectId
            ? {
                ...p,
                pricingApproved: true,
                pricing: p.pricing ? { ...p.pricing, isApproved: true, approvedBy: currentUser.name, approvedAt: new Date().toISOString() } : undefined,
                status: 'Proposal Draft',
                updatedAt: new Date().toISOString(),
              }
            : p
        ),
      };

    case 'ADVANCE_STATUS':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.payload.projectId ? { ...p, status: action.payload.status, updatedAt: new Date().toISOString() } : p
        ),
      };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload.id ? { ...n, isRead: true } : n
        ),
      };

    case 'MARK_ALL_NOTIFICATIONS_READ':
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, isRead: true })) };

    case 'ADD_AUDIT_ENTRY':
      return { ...state, auditLog: [action.payload, ...state.auditLog] };

    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };

    case 'TOGGLE_AI_ASSISTANT':
      return { ...state, aiAssistantOpen: !state.aiAssistantOpen };

    case 'SET_AI_ASSISTANT_OPEN':
      return { ...state, aiAssistantOpen: action.payload };

    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Convenience helpers
  getProject: (id: string) => Project | undefined;
  logAudit: (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const initialState: AppState = {
  projects: mockProjects,
  notifications: mockNotifications,
  auditLog: mockAuditLog,
  sidebarCollapsed: false,
  aiAssistantOpen: false,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const getProject = useCallback(
    (id: string) => state.projects.find((p) => p.id === id),
    [state.projects]
  );

  const logAudit = useCallback(
    (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => {
      dispatch({
        type: 'ADD_AUDIT_ENTRY',
        payload: {
          ...entry,
          id: generateId(),
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
        },
      });
    },
    []
  );

  return (
    <AppContext.Provider value={{ state, dispatch, getProject, logAudit }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function useProject(id: string) {
  const { getProject } = useApp();
  return getProject(id);
}
