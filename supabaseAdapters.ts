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
export function dbBuyerToUi(b: DbBuyer): Buyer {
  return {
    id: b.id,
    name: b.name,
    country: b.country ?? 'Unknown',
    totalRevenue: 0,
    shipmentCount: 0,
    riskScore: 0,
    lastContact: b.updated_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  };
}

export function uiBuyerToDb(b: Buyer): Partial<DbBuyer> {
  return {
    id: b.id || undefined,
    name: b.name,
    country: b.country,
  };
}

// --- Shipment ---
export function dbShipmentToUi(s: DbShipment): Shipment {
  const extra = safeParseJson(s.notes) ?? {};
  const buyerName = s.buyers?.name ?? extra.buyerName ?? 'Unknown Buyer';
  return {
    id: s.id,
    buyerId: s.buyer_id ?? s.buyers?.id ?? undefined,
    buyerName,
    destination: s.destination ?? extra.destination ?? '',
    value: Number(extra.value ?? 0),
    currency: s.currency ?? extra.currency ?? 'USD',
    status: extra.uiStatus ? (extra.uiStatus as ShipmentStatus) : dbShipmentStatusToUi(s.status),
    riskLevel: extra.riskLevel ? (extra.riskLevel as RiskLevel) : RiskLevel.MEDIUM,
    coffeeType: extra.coffeeType ?? 'Coffee',
    weight: Number(extra.weight ?? 0),
    date: (s.created_at ?? new Date().toISOString()).slice(0, 10),
    margin: Number(extra.margin ?? 0),
    incoterms: s.incoterm ?? extra.incoterms,
    paymentTerms: extra.paymentTerms,
    routeId: s.route_id ?? extra.routeId,
    lotIds: extra.lotIds ?? [],
    qualitySpec: extra.qualitySpec,
    milestones: extra.milestones,
    complianceChecklist: extra.complianceChecklist,
    tasks: undefined,
  };
}

export function uiShipmentToDb(s: Shipment, buyerId?: string, routeId?: string | null): Partial<DbShipment> {
  const resolvedBuyerId = buyerId ?? s.buyerId;
  if (!resolvedBuyerId) throw new Error('buyerId is required for shipments');
  const extra = {
    buyerName: s.buyerName,
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
    reference: s.id, // keep UI id visible
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
export function dbDocumentToUi(d: DbDocument): Document {
  return {
    id: d.id,
    shipmentId: d.shipment_id,
    buyerId: d.buyer_id,
    name: d.title,
    type: dbDocTypeToUi(d.doc_type),
    status: dbDocStatusToUi(d.status),
    date: (d.created_at ?? new Date().toISOString()).slice(0, 10),
    content: d.extracted_json ?? null,
    buyerVisible: !!d.buyer_visible,
    storagePath: d.storage_path ?? undefined,
  };
}

export function uiDocumentToDb(doc: Document): Partial<DbDocument> {
  if (!doc.shipmentId) throw new Error('shipmentId is required for documents');
  return {
    id: doc.id || undefined,
    shipment_id: doc.shipmentId,
    buyer_id: doc.buyerId as any, // DB trigger will enforce buyer_id from shipment_id
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
