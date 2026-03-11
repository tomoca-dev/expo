import {
  Alert,
  AlertSeverity,
  Buyer,
  ComplianceChecklistItem,
  Document,
  DocumentType,
  RiskLevel,
  Shipment,
  ShipmentMilestone,
  ShipmentStatus,
  Lot,
  RouteTemplate,
} from './types';

export const DEFAULT_MILESTONES: Omit<ShipmentMilestone, 'id'>[] = [
  { name: 'Contract Signed', status: 'Pending' },
  { name: 'Coffee Collected / Sourced', status: 'Pending' },
  { name: 'Quality Graded', status: 'Pending' },
  { name: 'Processing Completed', status: 'Pending' },
  { name: 'Export/Bank Permit Approved', status: 'Pending' },
  { name: 'Container Stuffed', status: 'Pending' },
  { name: 'Loaded at Port', status: 'Pending' },
  { name: 'Vessel Departed', status: 'Pending' },
  { name: 'Arrived at Destination', status: 'Pending' },
  { name: 'Payment Cleared', status: 'Pending' },
];

export const DEFAULT_CHECKLIST: Omit<ComplianceChecklistItem, 'id'>[] = [
  { name: 'Sales Contract', critical: true, docType: 'Sales Contract', status: 'Missing' },
  { name: 'Proforma Invoice', critical: true, docType: 'Proforma Invoice', status: 'Missing' },
  { name: 'Commercial Invoice', critical: true, docType: 'Commercial Invoice', status: 'Missing' },
  { name: 'Packing List', critical: true, docType: 'Packing List', status: 'Missing' },
  { name: 'Bank Permit', critical: true, docType: 'Bank Permit', status: 'Missing' },
  { name: 'Certificate of Origin', critical: false, docType: 'Certificate of Origin', status: 'Missing' },
  { name: 'Phytosanitary Certificate', critical: true, docType: 'Phytosanitary Certificate', status: 'Missing' },
  { name: 'Air Waybill / Bill of Lading', critical: false, docType: 'Air Waybill', status: 'Missing' },
  { name: 'Bank Receipt', critical: false, docType: 'Bank Receipt', status: 'Missing' },
];

export function ensureShipmentIntelligence(shipment: Shipment): Shipment {
  const milestones = shipment.milestones?.length
    ? shipment.milestones
    : DEFAULT_MILESTONES.map((m, idx) => ({ ...m, id: `${shipment.id}-MS-${idx + 1}` }));

  const checklist = shipment.complianceChecklist?.length
    ? shipment.complianceChecklist
    : DEFAULT_CHECKLIST.map((c, idx) => ({ ...c, id: `${shipment.id}-CL-${idx + 1}` }));

  return { ...shipment, milestones, complianceChecklist: checklist };
}

export function computeCompliance(shipment: Shipment, docsForShipment: Document[]) {
  const enriched = ensureShipmentIntelligence(shipment);
  const checklist = enriched.complianceChecklist ?? [];

  // Heuristic: if an approved/final doc of that type exists, mark Approved; if exists but pending/draft mark Uploaded.
  const updatedChecklist = checklist.map((item) => {
    if (!item.docType) return item;
    const matches = docsForShipment.filter((d) => d.type === item.docType);
    if (!matches.length) return { ...item, status: 'Missing' as const };
    const anyApproved = matches.some((d) => d.status === 'Approved' || d.status === 'Final');
    if (anyApproved) return { ...item, status: 'Approved' as const };
    return { ...item, status: 'Uploaded' as const };
  });

  const total = updatedChecklist.length || 1;
  const approved = updatedChecklist.filter((i) => i.status === 'Approved').length;
  const completeness = Math.round((approved / total) * 100);
  const missingCritical = updatedChecklist.filter((i) => i.critical && i.status !== 'Approved');
  return { updatedChecklist, completeness, missingCritical };
}

export function computeRisk(
  shipment: Shipment,
  buyer?: Buyer,
  docsForShipment: Document[] = [],
  lots: Lot[] = [],
  routes: RouteTemplate[] = []
) {
  const { completeness, missingCritical } = computeCompliance(shipment, docsForShipment);
  let score = 0;
  const reasons: string[] = [];

  // Missing critical docs is the biggest risk
  if (missingCritical.length) {
    score += Math.min(60, missingCritical.length * 15);
    reasons.push(`Missing critical documents: ${missingCritical.map((m) => m.name).join(', ')}`);
  }

  // Late milestones
  const ms = ensureShipmentIntelligence(shipment).milestones ?? [];
  const today = new Date().toISOString().split('T')[0];
  const late = ms.filter((m) => m.status !== 'Done' && m.expectedDate && m.expectedDate < today);
  if (late.length) {
    score += Math.min(25, late.length * 8);
    reasons.push(`Milestones past expected date: ${late.map((l) => l.name).join(', ')}`);
  }

  // Route risk (admin-selected)
  if (shipment.routeId) {
    const route = routes.find((r) => r.id === shipment.routeId);
    if (route) {
      if (route.riskLevel === RiskLevel.HIGH) {
        score += 10;
        reasons.push(`Route classified as High risk: ${route.name}`);
      } else if (route.riskLevel === RiskLevel.MEDIUM) {
        score += 5;
        reasons.push(`Route classified as Medium risk: ${route.name}`);
      }
    }
  }

  // Quality mismatch (linked lots vs shipment spec)
  const spec = shipment.qualitySpec;
  const linked = (shipment.lotIds ?? []).map((id) => lots.find((l) => l.id === id)).filter(Boolean) as Lot[];
  if (spec && linked.length) {
    const fails: string[] = [];
    for (const l of linked) {
      if (spec.minCuppingScore != null && l.cuppingScore != null && l.cuppingScore < spec.minCuppingScore) {
        fails.push(`${l.code} cupping ${l.cuppingScore} < ${spec.minCuppingScore}`);
      }
      if (spec.maxMoisturePercent != null && l.moisturePercent != null && l.moisturePercent > spec.maxMoisturePercent) {
        fails.push(`${l.code} moisture ${l.moisturePercent}% > ${spec.maxMoisturePercent}%`);
      }
      if (spec.minScreenSize != null && l.screenSize != null && l.screenSize < spec.minScreenSize) {
        fails.push(`${l.code} screen ${l.screenSize} < ${spec.minScreenSize}`);
      }
    }
    if (fails.length) {
      score += Math.min(30, 15 + fails.length * 3);
      reasons.push(`Quality mismatch vs spec: ${fails.slice(0, 3).join(' | ')}${fails.length > 3 ? ' …' : ''}`);
    }
  }

  // Shipment status heuristics
  if (shipment.status === ShipmentStatus.DOCUMENTATION_PENDING) {
    score += 10;
    reasons.push('Shipment in Documentation Pending stage');
  }
  if (shipment.status === ShipmentStatus.CUSTOMS_CLEARANCE) {
    score += 8;
    reasons.push('Shipment in Customs Clearance stage');
  }

  // Buyer risk score (if present)
  if (buyer?.riskScore != null) {
    score += Math.min(20, Math.round(buyer.riskScore / 5)); // 0..20
    if (buyer.riskScore >= 70) reasons.push('Buyer has elevated risk profile');
  }

  // Normalize and map to level
  score = Math.max(0, Math.min(100, score));
  let level: RiskLevel = RiskLevel.LOW;
  if (score >= 70) level = RiskLevel.HIGH;
  else if (score >= 40) level = RiskLevel.MEDIUM;

  return { score, level, reasons, compliance: completeness };
}

export function computeAlerts(
  shipments: Shipment[],
  buyers: Buyer[],
  documents: Document[],
  dismissedAlertIds: string[],
  lots: Lot[] = [],
  routes: RouteTemplate[] = []
): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date().toISOString();

  for (const s0 of shipments) {
    const s = ensureShipmentIntelligence(s0);
    const buyer = buyers.find((b) => b.name === s.buyerName);
    const docsForShipment = documents.filter((d) => d.shipmentId === s.id);
    const { missingCritical } = computeCompliance(s, docsForShipment);
    const risk = computeRisk(s, buyer, docsForShipment, lots, routes);

    if (missingCritical.length && s.status !== ShipmentStatus.SHIPMENT_CLOSED) {
      const id = `ALERT-${s.id}-MISSING-CRITICAL`;
      if (!dismissedAlertIds.includes(id)) {
        alerts.push({
          id,
          createdAt: now,
          severity: 'Critical',
          title: 'Critical compliance gaps',
          message: `Shipment ${s.id} is missing critical documents: ${missingCritical.map((m) => m.name).join(', ')}`,
          shipmentId: s.id,
          buyerId: buyer?.id,
        });
      }
    }

    if (risk.score >= 70 && s.status !== ShipmentStatus.SHIPMENT_CLOSED) {
      const id = `ALERT-${s.id}-HIGH-RISK`;
      if (!dismissedAlertIds.includes(id)) {
        alerts.push({
          id,
          createdAt: now,
          severity: 'Warning',
          title: 'High shipment risk',
          message: `Shipment ${s.id} risk score is ${risk.score}/100. ${risk.reasons[0] ?? ''}`.trim(),
          shipmentId: s.id,
          buyerId: buyer?.id,
        });
      }
    }

    const ms = s.milestones ?? [];
    const today = new Date().toISOString().split('T')[0];
    const late = ms.filter((m) => m.status !== 'Done' && m.expectedDate && m.expectedDate < today);
    if (late.length && s.status !== ShipmentStatus.SHIPMENT_CLOSED) {
      const id = `ALERT-${s.id}-LATE-MILESTONE`;
      if (!dismissedAlertIds.includes(id)) {
        alerts.push({
          id,
          createdAt: now,
          severity: 'Warning',
          title: 'Milestone delays detected',
          message: `Shipment ${s.id} has milestones past expected date: ${late.map((l) => l.name).join(', ')}`,
          shipmentId: s.id,
          buyerId: buyer?.id,
        });
      }
    }

    // Quality mismatch alert
    if (s.qualitySpec && (s.lotIds ?? []).length && s.status !== ShipmentStatus.SHIPMENT_CLOSED) {
      const risk2 = computeRisk(s, buyer, docsForShipment, lots, routes);
      const hasQualityReason = risk2.reasons.some((r) => r.toLowerCase().includes('quality mismatch'));
      if (hasQualityReason) {
        const id = `ALERT-${s.id}-QUALITY-MISMATCH`;
        if (!dismissedAlertIds.includes(id)) {
          alerts.push({
            id,
            createdAt: now,
            severity: 'Warning',
            title: 'Quality mismatch detected',
            message: `Shipment ${s.id} has linked lots that do not meet the required quality spec. Review the Quality tab.`,
            shipmentId: s.id,
            buyerId: buyer?.id,
          });
        }
      }
    }
  }

  // Sort critical first, then warning, then info
  const sevRank: Record<AlertSeverity, number> = { Critical: 0, Warning: 1, Info: 2 };
  return alerts.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);
}

export function generatePortalCode(buyerName: string) {
  const base = buyerName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 16);
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `${base}-${suffix}`;
}
