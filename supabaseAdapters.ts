import { Buyer, Document, DocumentType, Lot, RiskLevel, RouteTemplate, Shipment, ShipmentStatus } from './types';

// -------------------------
// NOTE
// The UI models in types.ts predate the Supabase schema.
// This file maps DB rows (snake_case, UUID) <-> UI models.
// We also store "extra" shipment fields in shipments.notes as JSON.
// -------------------------

export type DbBuyer = {
  id: string;
  name: string;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  risk_notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type DbShipment = {
  id: string;
  reference?: string | null;
  buyer_id: string;
  route_id?: string | null;
  contract_id?: string | null;
  status: string;
  origin?: string | null;
  destination?: string | null;
  incoterm?: string | null;
  currency?: string | null;
  notes?: string | null;
  buyer_summary?: string | null;
  created_at?: string;
  updated_at?: string;
  buyers?: { id?: string | null; name?: string | null; country?: string | null } | null;
};

export type DbDocument = {
  id: string;
  shipment_id: string;
  buyer_id: string;
  title: string;
  doc_type?: string | null;
  status: string;
  buyer_visible: boolean;
  storage_path?: string | null;
  extracted_json?: any;
  created_at?: string;
  updated_at?: string;
};

export type DbRoute = {
  id: string;
  name: string;
  inland_days: number;
  port_days: number;
  sea_days: number;
  risk_level?: string | null;
  delay_reasons?: string | null; // JSON string { origin, port, destination, commonDelayReasons }
  created_at?: string;
  updated_at?: string;
};

export type DbLot = {
  id: string;
  lot_code?: string | null;
  warehouse?: string | null;
  coffee_type?: string | null;
  origin?: string | null;
  grade?: string | null;
  processing_type?: string | null;
  crop_year?: string | null;
  total_qty_kg: number;
  cupping_score?: number | null;
  moisture_pct?: number | null;
  screen_size?: number | null;
  defect_count?: number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

const safeParseJson = (s?: string | null): any => {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

// --- Enum mapping ---
export function uiShipmentStatusToDb(status: ShipmentStatus): string {
  // map UI workflow to DB enum
  if (status === ShipmentStatus.READY_TO_SHIP) return 'ready_to_ship';
  if (status === ShipmentStatus.IN_TRANSIT) return 'shipped';
  if (status === ShipmentStatus.DELIVERED) return 'arrived';
  if (status === ShipmentStatus.SHIPMENT_CLOSED) return 'closed';
  return 'in_progress';
}

export function dbShipmentStatusToUi(status: string | null | undefined): ShipmentStatus {
  switch ((status ?? '').toLowerCase()) {
    case 'ready_to_ship':
      return ShipmentStatus.READY_TO_SHIP;
    case 'shipped':
      return ShipmentStatus.IN_TRANSIT;
    case 'arrived':
      return ShipmentStatus.DELIVERED;
    case 'closed':
      return ShipmentStatus.SHIPMENT_CLOSED;
    default:
      return ShipmentStatus.PROCESSING;
  }
}

export function dbRiskLevelToUi(risk?: string | null): RiskLevel {
  const v = (risk ?? '').toLowerCase();
  if (v.includes('high')) return RiskLevel.HIGH;
  if (v.includes('low')) return RiskLevel.LOW;
  return RiskLevel.MEDIUM;
}

export function uiRiskLevelToDb(risk: RiskLevel): string {
  return risk;
}

export function uiDocTypeToDb(t: DocumentType): string {
  return t
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export function dbDocTypeToUi(t?: string | null): DocumentType {
  const norm = (t ?? '').toLowerCase();
  const byNorm: Record<string, DocumentType> = {
    sales_contract: 'Sales Contract',
    proforma_invoice: 'Proforma Invoice',
    commercial_invoice: 'Commercial Invoice',
    packing_list: 'Packing List',
    air_waybill: 'Air Waybill',
    bank_permit: 'Bank Permit',
    certificate_of_origin: 'Certificate of Origin',
    declaration: 'Declaration',
    bank_receipt: 'Bank Receipt',
    phytosanitary_certificate: 'Phytosanitary Certificate',
    external_attachment: 'External Attachment',
  };
  return byNorm[norm] ?? 'External Attachment';
}

export function uiDocStatusToDb(s: Document['status']): string {
  switch (s) {
    case 'Draft':
      return 'draft';
    case 'Approved':
      return 'approved';
    case 'Final':
      return 'uploaded';
    case 'Pending Approval':
    default:
      return 'under_review';
  }
}

export function dbDocStatusToUi(s: string | null | undefined): Document['status'] {
  const v = (s ?? '').toLowerCase();
  if (v === 'draft') return 'Draft';
  if (v === 'approved') return 'Approved';
  if (v === 'uploaded') return 'Final';
  return 'Pending Approval';
}

// --- Buyer ---
export function dbBuyerToUi(b: any): Buyer {
  return {
    id: String(b.id),
    name: b.name ?? 'Unnamed Buyer',
    country: b.country ?? 'Unknown',
    totalRevenue: Number(b.totalRevenue ?? b.total_revenue ?? 0),
    shipmentCount: Number(b.shipmentCount ?? b.shipment_count ?? 0),
    riskScore: Number(b.riskScore ?? b.risk_score ?? 0),
    lastContact: (b.lastContact ?? b.last_contact ?? b.updated_at ?? b.created_at ?? new Date().toISOString()).slice(0, 10),
    portalCode: b.portal_code ?? b.portalCode ?? undefined,
  };
}

export function uiBuyerToDb(b: Buyer): any {
  // Works with the current normalized schema. Extra UI fields are intentionally not required.
  return {
    id: b.id || undefined,
    name: b.name,
    country: b.country,
  };
}

// --- Shipment ---
export function dbShipmentToUi(s: any): Shipment {
  // Supports both schemas:
  // 1) normalized: buyer_id, incoterm, notes JSON
  // 2) older/camelCase: buyerName, coffeeType, riskLevel, paymentTerms, etc.
  const extra = safeParseJson(s.notes) ?? {};
  const buyerName = s.buyers?.name ?? s.buyerName ?? s.buyer_name ?? extra.buyerName ?? 'Unknown Buyer';
  const createdDate = (s.date ?? s.created_at ?? new Date().toISOString()).slice(0, 10);

  return {
    id: String(s.id),
    buyerId: s.buyer_id ?? s.buyerId ?? s.buyers?.id ?? extra.buyerId ?? undefined,
    buyerName,
    destination: s.destination ?? extra.destination ?? '',
    value: Number(s.value ?? extra.value ?? 0),
    currency: s.currency ?? extra.currency ?? 'USD',
    status: s.status && Object.values(ShipmentStatus).includes(s.status) ? s.status : (extra.uiStatus ? (extra.uiStatus as ShipmentStatus) : dbShipmentStatusToUi(s.status)),
    riskLevel: (s.riskLevel ?? s.risk_level ?? extra.riskLevel ?? RiskLevel.MEDIUM) as RiskLevel,
    coffeeType: s.coffeeType ?? s.coffee_type ?? extra.coffeeType ?? 'Coffee',
    weight: Number(s.weight ?? extra.weight ?? 0),
    date: createdDate,
    margin: Number(s.margin ?? extra.margin ?? 0),
    incoterms: s.incoterms ?? s.incoterm ?? extra.incoterms ?? 'FOB',
    paymentTerms: s.paymentTerms ?? s.payment_terms ?? extra.paymentTerms,
    routeId: s.route_id ?? s.routeId ?? extra.routeId,
    lotIds: extra.lotIds ?? s.lotIds ?? [],
    qualitySpec: extra.qualitySpec ?? s.qualitySpec,
    milestones: extra.milestones ?? s.milestones,
    complianceChecklist: extra.complianceChecklist ?? s.complianceChecklist,
    tasks: undefined,
  };
}

export function uiShipmentToDb(s: Shipment, buyerId?: string, routeId?: string | null): any {
  const resolvedBuyerId = buyerId ?? s.buyerId;
  if (!resolvedBuyerId) throw new Error('buyerId is required for shipments');

  const extra = {
    buyerName: s.buyerName,
    buyerId: resolvedBuyerId,
    destination: s.destination,
    value: s.value,
    currency: s.currency,
    uiStatus: s.status,
    riskLevel: s.riskLevel,
    coffeeType: s.coffeeType,
    weight: s.weight,
    margin: s.margin,
    paymentTerms: s.paymentTerms,
    incoterms: s.incoterms,
    routeId: s.routeId,
    lotIds: s.lotIds ?? [],
    qualitySpec: s.qualitySpec ?? null,
    milestones: s.milestones ?? [],
    complianceChecklist: s.complianceChecklist ?? [],
  };

  return {
    id: s.id || undefined,
    reference: s.id,
    buyer_id: resolvedBuyerId,
    route_id: routeId ?? s.routeId ?? null,
    status: uiShipmentStatusToDb(s.status),
    origin: 'Ethiopia',
    destination: s.destination,
    incoterm: s.incoterms ?? 'FOB',
    currency: s.currency ?? 'USD',
    notes: JSON.stringify(extra),
  };
}

// --- Document ---
export function dbDocumentToUi(d: any): Document {
  return {
    id: String(d.id),
    shipmentId: d.shipment_id ?? d.shipmentId ?? undefined,
    buyerId: d.buyer_id ?? d.buyerId ?? undefined,
    name: d.title ?? d.name ?? 'Untitled Document',
    type: d.doc_type ? dbDocTypeToUi(d.doc_type) : (d.type ?? 'External Attachment'),
    status: d.status && ['Draft', 'Approved', 'Pending Approval', 'Final'].includes(d.status) ? d.status : dbDocStatusToUi(d.status),
    date: (d.date ?? d.created_at ?? new Date().toISOString()).slice(0, 10),
    fileSize: d.fileSize ?? d.file_size ?? undefined,
    isExternal: d.isExternal ?? d.is_external ?? false,
    content: d.extracted_json ?? d.content ?? null,
    buyerVisible: !!(d.buyer_visible ?? d.buyerVisible),
    storagePath: d.storage_path ?? d.storagePath ?? undefined,
  };
}

export function uiDocumentToDb(doc: Document): any {
  if (!doc.shipmentId) throw new Error('shipmentId is required for documents');
  return {
    id: doc.id || undefined,
    shipment_id: doc.shipmentId,
    buyer_id: doc.buyerId ?? null,
    title: doc.name,
    doc_type: uiDocTypeToDb(doc.type),
    status: uiDocStatusToDb(doc.status),
    buyer_visible: !!doc.buyerVisible,
    storage_path: doc.storagePath ?? null,
    extracted_json: doc.content ?? null,
  };
}

// --- Route ---
export function dbRouteToUi(r: DbRoute): RouteTemplate {
  const meta = safeParseJson(r.delay_reasons) ?? {};
  return {
    id: r.id,
    name: r.name,
    origin: meta.origin ?? 'Origin',
    port: meta.port ?? 'Port',
    destination: meta.destination ?? 'Destination',
    inlandLeadDays: Number(r.inland_days ?? 0),
    portHandlingDays: Number(r.port_days ?? 0),
    seaTransitDays: Number(r.sea_days ?? 0),
    riskLevel: dbRiskLevelToUi(r.risk_level),
    commonDelayReasons: meta.commonDelayReasons ?? [],
  };
}

export function uiRouteToDb(r: RouteTemplate): Partial<DbRoute> {
  const meta = {
    origin: r.origin,
    port: r.port,
    destination: r.destination,
    commonDelayReasons: r.commonDelayReasons ?? [],
  };
  return {
    id: r.id || undefined,
    name: r.name,
    inland_days: r.inlandLeadDays,
    port_days: r.portHandlingDays,
    sea_days: r.seaTransitDays,
    risk_level: uiRiskLevelToDb(r.riskLevel),
    delay_reasons: JSON.stringify(meta),
  };
}

// --- Lot ---
export function dbLotToUi(l: DbLot): Lot {
  return {
    id: l.id,
    code: l.lot_code ?? l.id.slice(0, 8).toUpperCase(),
    origin: l.origin ?? 'Unknown',
    grade: l.grade ?? 'N/A',
    processingType: l.processing_type ?? 'N/A',
    warehouse: l.warehouse ?? 'Warehouse',
    quantityKg: Number(l.total_qty_kg ?? 0),
    cuppingScore: l.cupping_score ?? undefined,
    moisturePercent: l.moisture_pct ?? undefined,
    screenSize: l.screen_size ?? undefined,
    defectCount: l.defect_count ?? undefined,
    notes: l.notes ?? undefined,
  };
}

export function uiLotToDb(l: Lot): Partial<DbLot> {
  return {
    id: l.id || undefined,
    lot_code: l.code,
    origin: l.origin,
    grade: l.grade,
    processing_type: l.processingType,
    warehouse: l.warehouse,
    total_qty_kg: Number(l.quantityKg ?? 0),
    cupping_score: l.cuppingScore ?? null,
    moisture_pct: l.moisturePercent ?? null,
    screen_size: l.screenSize ?? null,
    defect_count: l.defectCount ?? null,
    notes: l.notes ?? null,
  };
}
