
// Internal users are Admin-only for this deployment.
// Other roles are kept for backwards compatibility with earlier UI components.
export type Role = 'Admin' | 'Sales' | 'Ops' | 'Finance' | 'Management';
export type CurrencyCode = 'USD' | 'ETB' | 'EUR' | 'GBP';

export enum ShipmentStatus {
  BUYER_REQUEST = 'Buyer Request',
  ORDER_CONFIRMED = 'Order Confirmed',
  CONTRACT_SIGNED = 'Contract Signed',
  DOCUMENTATION_PENDING = 'Documentation Pending',
  QUALITY_CHECK = 'Quality Check',
  LAB_TESTING = 'Lab Testing',
  WAREHOUSE_RECEIPT = 'Warehouse Receipt',
  EXPORT_PERMIT_ISSUED = 'Export Permit Issued',
  READY_TO_SHIP = 'Ready to Ship',
  VESSEL_BOOKED = 'Vessel Booked',
  PROCESSING = 'Processing',
  IN_TRANSIT = 'In Transit',
  CUSTOMS_CLEARANCE = 'Customs Clearance',
  DELIVERED = 'Delivered',
  PAYMENT_RECEIVED = 'Payment Received',
  SHIPMENT_CLOSED = 'Shipment Closed'
}

export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export interface Shipment {
  id: string;
  buyerId?: string;
  buyerName: string;
  destination: string;
  value: number; // Stored in USD base
  currency: string;
  status: ShipmentStatus;
  riskLevel: RiskLevel;
  coffeeType: string;
  weight: number; // in KG
  date: string;
  margin: number;
  incoterms?: string;
  paymentTerms?: string;

  // v3: routing + quality
  routeId?: string;
  lotIds?: string[];
  qualitySpec?: QualitySpec;

  // v2: operational intelligence
  milestones?: ShipmentMilestone[];
  complianceChecklist?: ComplianceChecklistItem[];

  // v4: shipment task board (admin)
  tasks?: ShipmentTask[];
}

export type TaskStatus = 'Open' | 'In Progress' | 'Done';

export interface ShipmentTask {
  id: string;
  title: string;
  owner?: string;
  dueDate?: string; // ISO YYYY-MM-DD
  status: TaskStatus;
  createdAt: string;
 }

export interface QualitySpec {
  minCuppingScore?: number; // e.g., 84
  maxMoisturePercent?: number; // e.g., 12.5
  minScreenSize?: number; // e.g., 15
}

export interface Buyer {
  id: string;
  name: string;
  country: string;
  totalRevenue: number;
  shipmentCount: number;
  riskScore: number;
  lastContact: string;

  // v2: buyer portal access (local/demo mode)
  portalCode?: string;
}

export type DocumentType = 
  | 'Sales Contract' 
  | 'Proforma Invoice' 
  | 'Commercial Invoice' 
  | 'Packing List' 
  | 'Air Waybill' 
  | 'Bank Permit' 
  | 'Certificate of Origin' 
  | 'Declaration' 
  | 'Bank Receipt' 
  | 'Phytosanitary Certificate'
  | 'External Attachment';

export interface Document {
  id: string;
  shipmentId?: string;
  buyerId?: string;
  name: string;
  type: DocumentType;
  status: 'Draft' | 'Approved' | 'Pending Approval' | 'Final';
  date: string;
  fileSize?: string;
  isExternal?: boolean;
  content?: any;

  // v2: if true, document is visible in buyer portal
  buyerVisible?: boolean;
  storagePath?: string;
}


export type MilestoneStatus = 'Pending' | 'Done';

export interface ShipmentMilestone {
  id: string;
  name: string;
  expectedDate?: string;
  actualDate?: string;
  status: MilestoneStatus;
}

export type ChecklistStatus = 'Missing' | 'Uploaded' | 'Approved';

export interface ComplianceChecklistItem {
  id: string;
  name: string;
  critical: boolean;
  docType?: DocumentType;
  status: ChecklistStatus;
}

export type AlertSeverity = 'Info' | 'Warning' | 'Critical';

export interface Alert {
  id: string;
  createdAt: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  shipmentId?: string;
  buyerId?: string;
}

export interface ExchangeRates {
  [key: string]: number;
}

export interface RouteTemplate {
  id: string;
  name: string;
  origin: string;
  port: string;
  destination: string;
  inlandLeadDays: number;
  portHandlingDays: number;
  seaTransitDays: number;
  riskLevel: RiskLevel;
  commonDelayReasons: string[];
}

export interface Lot {
  id: string;
  code: string;
  origin: string;
  grade: string;
  processingType: string;
  warehouse: string;
  quantityKg: number;

  // quality metrics
  cuppingScore?: number;
  moisturePercent?: number;
  screenSize?: number;
  defectCount?: number;
  notes?: string;
}

export interface AppState {
  role: Role;
  shipments: Shipment[];
  buyers: Buyer[];
  documents: Document[];
  routes?: RouteTemplate[];
  lots?: Lot[];
  baseCurrency: CurrencyCode;
  displayCurrency: CurrencyCode;
  exchangeRates: ExchangeRates;
}
