// ============================================================
// Core Domain Types — AI-Assisted Proposal Preparation Platform
// ============================================================

export type ProjectStage = 'Design / Specification' | 'Tender' | 'Job-in-Hand';

export type ProjectStatus =
  | 'Draft'
  | 'Requirements'
  | 'AI Analysis'
  | 'Requirement Review'
  | 'Product Selection'
  | 'Pricing'
  | 'Proposal Draft'
  | 'Human Review'
  | 'Approval'
  | 'Submitted';

export type ProjectType =
  | 'Commercial'
  | 'Residential'
  | 'Healthcare'
  | 'Education'
  | 'Industrial'
  | 'Mixed Use'
  | 'Government'
  | 'Hospitality';

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export type RequirementStatus = 'Confirmed' | 'Needs Review' | 'Rejected' | 'Pending';

export type DocumentType = 'PDF' | 'DOCX' | 'XLSX' | 'IMAGE' | 'DWG' | 'DXF';

export type DocumentStatus = 'Uploading' | 'Processing' | 'Processed' | 'Error';

export type DoorSetStatus = 'Approved' | 'Under Review' | 'Archived';

export type SupplierStatus = 'Current' | 'Outdated' | 'Processing' | 'Requires Review';

export type ProposalStatus = 'Draft' | 'In Review' | 'Approved' | 'Submitted' | 'Rejected';

export type UserRole = 'Admin' | 'Proposal Manager' | 'Estimator' | 'Reviewer';

// ============================================================
// User
// ============================================================
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department: string;
  status: 'Active' | 'Inactive';
  lastActive: string;
}

// ============================================================
// Supplier
// ============================================================
export interface Supplier {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  contactPhone: string;
  priceListVersion: string;
  lastUpdated: string;
  uploadDate: string;
  status: SupplierStatus;
  productCount: number;
  pendingReviewCount: number;
  daysOutdated?: number;
}

// ============================================================
// Product
// ============================================================
export interface Product {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  currency: string;
  fireRating?: string;
  securityRating?: string;
  finish?: string;
  dimensions?: string;
  availability: 'Available' | 'Low Stock' | 'Out of Stock' | 'Made to Order';
  status: 'Active' | 'Discontinued' | 'Review';
  compatibleDoorSets: string[];
  lastUpdated: string;
  documents?: string[];
}

// ============================================================
// Door Set
// ============================================================
export interface DoorSet {
  id: string;
  code: string;
  name: string;
  description: string;
  projectTypes: ProjectType[];
  doorType: 'Internal' | 'External' | 'Fire Door' | 'Security Door' | 'Acoustic';
  fireRating: string;
  securityLevel: 'Standard' | 'High' | 'Very High';
  finish: string;
  dimensions?: string;
  status: DoorSetStatus;
  basePrice: number;
  currency: string;
  products: string[]; // Product IDs
  supplierId: string;
  supplierName: string;
  lastUpdated: string;
  documents?: string[];
  notes?: string;
}

// ============================================================
// AI Recommendation
// ============================================================
export interface AIRecommendationReason {
  label: string;
  matched: boolean;
}

export interface AIRecommendation {
  id: string;
  doorSetId: string;
  doorSetCode: string;
  doorSetName: string;
  matchScore: number;
  reasons: AIRecommendationReason[];
  isRecommended: boolean; // true = top recommendation, false = alternative
  products: Array<{
    productId: string;
    productCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    supplierId: string;
    supplierName: string;
    availability: string;
  }>;
  aiExplanation: string;
  sources: AISource[];
  status: 'Pending' | 'Accepted' | 'Rejected';
}

// ============================================================
// AI Source / Traceability
// ============================================================
export interface AISource {
  id: string;
  label: string;
  documentId?: string;
  documentName?: string;
  page?: number;
  section?: string;
  type: 'Document' | 'Library' | 'Specification';
}

// ============================================================
// AI Insight
// ============================================================
export interface AIInsight {
  id: string;
  title: string;
  description: string;
  type: 'Warning' | 'Info' | 'Finding' | 'Suggestion';
  confidence?: ConfidenceLevel;
  sources?: AISource[];
  actionLabel?: string;
  actionTarget?: string;
  projectId?: string;
}

// ============================================================
// Project Requirement
// ============================================================
export interface ProjectRequirement {
  id: string;
  label: string;
  key: string;
  value: string;
  unit?: string;
  confidence: ConfidenceLevel;
  source: string;
  sourceDocumentId?: string;
  page?: number;
  status: RequirementStatus;
  isEdited: boolean;
  editedValue?: string;
  notes?: string;
}

// ============================================================
// Project Document
// ============================================================
export interface ProjectDocument {
  id: string;
  filename: string;
  type: DocumentType;
  size: number; // bytes
  uploadDate: string;
  uploadedBy: string;
  status: DocumentStatus;
  processingStatus?: string;
  usedInProject: boolean;
  detectedItemsCount?: number;
  url?: string;
  pageCount?: number;
}

// ============================================================
// Vision AI Detection (future-ready)
// ============================================================
export interface VisionDetection {
  id: string;
  documentId: string;
  page: number;
  label: string;
  type: 'Door' | 'Window' | 'Wall' | 'Room' | 'Annotation';
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
  properties: Record<string, string>;
  requirementId?: string;
}

// ============================================================
// Selected Product (in project context)
// ============================================================
export interface SelectedProduct {
  productId: string;
  productCode: string;
  productName: string;
  description: string;
  quantity: number;
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  currency: string;
  availability: string;
  status: 'Included' | 'Under Review' | 'Removed';
}

// ============================================================
// Pricing
// ============================================================
export interface PricingItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  total: number;
  currency: string;
  priceLastUpdated: string;
  isPriceOutdated: boolean;
}

export interface PricingSummary {
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  otherCosts: number;
  otherCostsDescription: string;
  finalTotal: number;
  currency: string;
  approvedBy?: string;
  approvedAt?: string;
  isApproved: boolean;
}

// ============================================================
// Proposal
// ============================================================
export interface ProposalItem {
  sectionTitle: string;
  content: string;
}

export interface Proposal {
  id: string;
  projectId: string;
  version: number;
  status: ProposalStatus;
  title: string;
  customerName: string;
  projectReference: string;
  preparedBy: string;
  preparedDate: string;
  validUntil: string;
  executiveSummary: string;
  sections: ProposalItem[];
  pricingSnapshot: PricingSummary;
  terms: string;
  notes: string;
  generatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  submittedAt?: string;
}

// ============================================================
// Project
// ============================================================
export interface Project {
  id: string;
  name: string;
  reference: string;
  customer: string;
  customerContact?: string;
  projectType: ProjectType;
  stage: ProjectStage;
  status: ProjectStatus;
  location: string;
  expectedSubmissionDate: string;
  owner: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  estimatedDoorQuantity?: number;
  totalValue?: number;

  // Workflow data
  description?: string;
  requirements: ProjectRequirement[];
  documents: ProjectDocument[];
  recommendations: AIRecommendation[];
  selectedDoorSetId?: string;
  selectedProducts: SelectedProduct[];
  pricing?: PricingSummary;
  proposal?: Proposal;

  // Analysis state
  analysisCompleted: boolean;
  requirementsConfirmed: boolean;
  pricingApproved: boolean;
}

// ============================================================
// Audit Log
// ============================================================
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  category: 'Project' | 'Requirement' | 'Recommendation' | 'Pricing' | 'Proposal' | 'Knowledge' | 'Admin' | 'AI';
  projectId?: string;
  projectName?: string;
  objectType?: string;
  objectId?: string;
  details: string;
  status: 'Success' | 'Warning' | 'Error';
}

// ============================================================
// Notification
// ============================================================
export interface Notification {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type: 'Info' | 'Warning' | 'Success' | 'Error';
  isRead: boolean;
  linkHref?: string;
  projectId?: string;
}

// ============================================================
// AI Assistant Message
// ============================================================
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: AISource[];
  warnings?: string[];
  suggestedActions?: Array<{ label: string; action: string }>;
}

// ============================================================
// Global Search Result
// ============================================================
export interface SearchResult {
  type: 'Project' | 'Product' | 'DoorSet' | 'Document' | 'Proposal' | 'Supplier';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

// ============================================================
// App Settings (AI Config)
// ============================================================
export interface AIConfiguration {
  model: string;
  visionEnabled: boolean;
  knowledgeSources: {
    products: boolean;
    doorSets: boolean;
    supplierPrices: boolean;
    specifications: boolean;
  };
  behaviour: {
    showSourceReferences: boolean;
    showConfidence: boolean;
    flagLowConfidence: boolean;
    requireHumanConfirmation: boolean;
    requireHumanApproval: boolean;
  };
}
