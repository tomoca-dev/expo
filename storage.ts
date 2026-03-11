import { Buyer, Document, Shipment, RouteTemplate, Lot } from './types';

export type BuyerReceipt = {
  acknowledgedAt: string;
  docIds: string[];
};

type LocalDataV4 = {
  buyers: Buyer[];
  shipments: Shipment[];
  documents: Document[];
  routes: RouteTemplate[];
  lots: Lot[];
  dismissedAlertIds: string[];
  buyerReceipts: Record<string, Record<string, BuyerReceipt>>; // buyerCode -> shipmentId -> receipt
};

const KEY_V4 = 'tomoca_erm_local_v4';
const KEY_V3 = 'tomoca_erm_local_v3';
const KEY_V2 = 'tomoca_erm_local_v2';

function empty(): LocalDataV4 {
  return { buyers: [], shipments: [], documents: [], routes: [], lots: [], dismissedAlertIds: [], buyerReceipts: {} };
}

export function loadLocalData(): LocalDataV4 {
  try {
    const rawV4 = localStorage.getItem(KEY_V4);
    if (rawV4) {
      const parsed = JSON.parse(rawV4) as Partial<LocalDataV4>;
      return {
        buyers: parsed.buyers ?? [],
        shipments: parsed.shipments ?? [],
        documents: parsed.documents ?? [],
        routes: parsed.routes ?? [],
        lots: parsed.lots ?? [],
        dismissedAlertIds: parsed.dismissedAlertIds ?? [],
        buyerReceipts: parsed.buyerReceipts ?? {},
      };
    }

    const rawV3 = localStorage.getItem(KEY_V3);
    if (rawV3) {
      const parsed = JSON.parse(rawV3) as any;
      return {
        buyers: parsed.buyers ?? [],
        shipments: parsed.shipments ?? [],
        documents: parsed.documents ?? [],
        routes: parsed.routes ?? [],
        lots: parsed.lots ?? [],
        dismissedAlertIds: parsed.dismissedAlertIds ?? [],
        buyerReceipts: {},
      };
    }

    // Migrate from v2
    const rawV2 = localStorage.getItem(KEY_V2);
    if (!rawV2) return empty();
    const parsedV2 = JSON.parse(rawV2) as any;
    const migrated: LocalDataV4 = {
      buyers: parsedV2.buyers ?? [],
      shipments: parsedV2.shipments ?? [],
      documents: parsedV2.documents ?? [],
      routes: [],
      lots: [],
      dismissedAlertIds: parsedV2.dismissedAlertIds ?? [],
      buyerReceipts: {},
    };
    // Save migrated into v4 key
    saveLocalData(migrated);
    return migrated;
  } catch (e) {
    console.warn('Failed to load local ERM data:', e);
    return empty();
  }
}

export function saveLocalData(data: LocalDataV4) {
  try {
    localStorage.setItem(KEY_V4, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save local ERM data:', e);
  }
}

export function clearLocalData() {
  try {
    localStorage.removeItem(KEY_V4);
    localStorage.removeItem(KEY_V3);
    localStorage.removeItem(KEY_V2);
  } catch {
    // ignore
  }
}
