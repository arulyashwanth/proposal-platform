/**
 * lib/api.ts — Unified API client for Mekatron Proposal Platform
 * Connects Next.js Frontend to FastAPI Backend (port 8000)
 * Includes graceful fallbacks for smooth, uninterrupted demo delivery.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:8000'
    : 'http://127.0.0.1:8000');

export interface ApiProduct {
  id: number;
  name: string;
  sku: string;
  category: string;
  supplier_id: number | null;
  supplier_name?: string | null;
  base_price: number;
}

export interface ApiSupplier {
  id: number;
  name: string;
  contact?: string | null;
  product_count?: number;
}

export interface ApiHardwareSet {
  id: number;
  name: string;
  door_type: string;
  category: string;
  specifications: string | null;
}

export interface ApiDoorForm {
  id: number;
  form_type: string;
  door_set_id: number | null;
  specifications: string | null;
  json_config: any;
}

export interface PricingItemInput {
  product_id: number;
  quantity: number;
  supplier_id?: number;
}

export interface OptimizedItem {
  product_id: number;
  product_name: string;
  sku: string;
  category: string;
  quantity: number;
  unit_cost: number;
  volume_discount_pct: number;
  discounted_unit_cost: number;
  material_total: number;
  labor: number;
  overhead: number;
  subtotal: number;
}

export interface PricingOptimizationResult {
  margin_target: number;
  items: OptimizedItem[];
  material_total: number;
  labor_total: number;
  overhead_total: number;
  total_internal_cost: number;
  sell_price: number;
  margin_amount: number;
  actual_margin_pct: number;
  volume_discount_warnings: string[];
  recommendations: string[];
  currency?: string;
}

export interface ValidationRuleResult {
  project_type: string;
  valid: boolean;
  missing_required_fields: string[];
  rule_violations: string[];
  summary: string;
}

export interface QuotationDraftResult {
  quotation_id: number;
  enquiry_id: number;
  draft_status: string;
  quotation_draft: {
    ai_status?: string;
    mode?: string;
    product_selection: Array<{
      product_id: number;
      product_name: string;
      category?: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }>;
    pricing: {
      material_cost?: number;
      material?: number;
      labor_cost?: number;
      labor?: number;
      markup?: number;
      total_price?: number;
      total?: number;
      currency?: string;
    };
    quotation_draft?: string;
  };
  editable_fields: string[];
  next_step: string;
}

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      console.warn(`[API] ${endpoint} returned status ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.warn(`[API] Could not connect to backend at ${API_BASE_URL}${endpoint}:`, err);
    return null;
  }
}

export const api = {
  // Products
  async getProducts(category?: string, supplierId?: number): Promise<ApiProduct[] | null> {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (supplierId) params.append('supplier_id', String(supplierId));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<ApiProduct[]>(`/api/products${qs}`);
  },

  async searchProducts(query: string, projectType?: string) {
    const params = new URLSearchParams({ query });
    if (projectType) params.append('project_type', projectType);
    return fetchJson<{ matched_products: any[]; search_mode: string; status: string }>(
      `/api/products/search?${params.toString()}`
    );
  },

  async createProduct(data: { name: string; sku: string; category: string; base_price: number; supplier_id?: number }) {
    return fetchJson<{ id: number; name: string; sku: string }>('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Suppliers
  async getSuppliers(): Promise<ApiSupplier[] | null> {
    return fetchJson<ApiSupplier[]>('/api/suppliers');
  },

  async createSupplier(name: string, contact?: string) {
    return fetchJson<{ id: number; name: string }>('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify({ name, contact }),
    });
  },

  async updateSupplierPricing(supplierId: number, priceListData: Array<{ product_id: number; price: number; effective_date?: string }>) {
    return fetchJson<{ update_status: string; affected_rows: number }>('/api/libraries/supplier-pricing/update', {
      method: 'POST',
      body: JSON.stringify({ supplier_id: supplierId, price_list_data: priceListData }),
    });
  },

  // Hardware Sets & Door Forms
  async getHardwareSets(category?: string, doorType?: string): Promise<ApiHardwareSet[] | null> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (doorType) params.append('door_type', doorType);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<ApiHardwareSet[]>(`/api/hardware-sets${qs}`);
  },

  async getDoorSets(): Promise<{ door_forms: ApiDoorForm[]; count: number } | null> {
    return fetchJson<{ door_forms: ApiDoorForm[]; count: number }>('/api/libraries/door-sets');
  },

  // Enquiries / Projects
  async createEnquiry(data: { project_type: string; stage: string; requirements?: any; client_name?: string }) {
    return fetchJson<{ project_id: number; enquiry_id: number; project_name: string }>('/api/enquiries/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getEnquiries(status?: string) {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return fetchJson<any[]>(`/api/enquiries${qs}`);
  },

  // Requirements Validation
  async validateRequirements(projectType: string, specifications: Record<string, any>): Promise<ValidationRuleResult | null> {
    return fetchJson<ValidationRuleResult>('/api/requirements/validate', {
      method: 'POST',
      body: JSON.stringify({ project_type: projectType, specifications }),
    });
  },

  // Quotations & Pricing Engine
  async generateQuotation(enquiryId: number, generateType = 'full'): Promise<QuotationDraftResult | null> {
    return fetchJson<QuotationDraftResult>('/api/quotations/generate', {
      method: 'POST',
      body: JSON.stringify({ enquiry_id: enquiryId, generate_type: generateType }),
    });
  },

  async getQuotation(quotationId: number) {
    return fetchJson<any>(`/api/quotations/${quotationId}`);
  },

  async optimizePricing(items: PricingItemInput[], marginTarget = 0.20): Promise<PricingOptimizationResult | null> {
    return fetchJson<PricingOptimizationResult>('/api/quotations/optimize-pricing', {
      method: 'POST',
      body: JSON.stringify({ items, margin_target: marginTarget }),
    });
  },

  // URLs for HTML Preview and PDF Download
  getQuotationPreviewUrl(quotationId: number | string): string {
    return `${API_BASE_URL}/api/quotations/${quotationId}/preview`;
  },

  getQuotationPdfUrl(quotationId: number | string): string {
    return `${API_BASE_URL}/api/quotations/${quotationId}/download-pdf`;
  },
};
