import React, { useState, useMemo, useContext, createContext, useEffect } from 'react';
import {
  HashRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
  Navigate,
} from 'react-router-dom';
import {
  AppState,
  Role,
  Shipment,
  Buyer,
  Document,
  CurrencyCode,
  ExchangeRates,
  ShipmentStatus,
  RouteTemplate,
  Lot,
} from './types';
import { Icons, Logo } from './constants';
import { getLiveExchangeRates } from './geminiService';
import { supabase } from './supabaseClient';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ShipmentList from './components/ShipmentList';
import ShipmentDetail from './components/ShipmentDetail';
import FinanceDashboard from './components/FinanceDashboard';
import AIAgentHub from './components/AIAgentHub';
import DocumentsHub from './components/DocumentsHub';
import BuyersHub from './components/BuyersHub';
import BuyerProfile from './components/BuyerProfile';
import AdminUsers from './components/AdminUsers';
import FormsHub from './components/FormsHub';
import Profile from './components/Profile';
import RiskCenter from './components/RiskCenter';
import AlertsCenter from './components/AlertsCenter';
import RoutesHub from './components/RoutesHub';
import LotsHub from './components/LotsHub';
import { BuyerPortalHome, BuyerPortalLogin } from './components/BuyerPortal';
import { BuyerReceipt } from './storage';
import { ensureShipmentIntelligence, computeCompliance } from './intelligence';
import {
  dbBuyerToUi,
  dbDocumentToUi,
  dbLotToUi,
  dbRouteToUi,
  dbShipmentToUi,
  uiBuyerToDb,
  uiDocumentToDb,
  uiLotToDb,
  uiRouteToDb,
  uiShipmentStatusToDb,
  uiShipmentToDb,
  DbBuyer,
  DbDocument,
  DbLot,
  DbRoute,
  DbShipment,
} from './supabaseAdapters';

type AppContextType = {
  state: AppState;
  setRole: (role: Role) => void;
  setDisplayCurrency: (cur: CurrencyCode) => Promise<void>;
  updateShipment: (shipment: Shipment) => Promise<void>;
  updateShipmentStatus: (id: string, status: ShipmentStatus) => Promise<void>;
  addShipment: (shipment: Shipment) => Promise<void>;
  deleteShipment: (id: string) => Promise<void>;
  addBuyer: (buyer: Buyer) => Promise<void>;
  updateBuyer: (buyer: Buyer) => Promise<void>;
  deleteBuyer: (id: string) => Promise<void>;
  addDocument: (doc: Document) => Promise<void>;
  updateDocument: (doc: Document) => Promise<void>;
  addRoute: (route: RouteTemplate) => Promise<void>;
  updateRoute: (route: RouteTemplate) => Promise<void>;
  deleteRoute: (id: string) => Promise<void>;
  addLot: (lot: Lot) => Promise<void>;
  updateLot: (lot: Lot) => Promise<void>;
  deleteLot: (id: string) => Promise<void>;
  seedData: () => Promise<void>;
  refreshExchangeRates: () => Promise<void>;
  isSyncingRates: boolean;
  convert: (value: number) => { value: number; symbol: string; code: string };
  dismissedAlertIds: string[];
  dismissAlert: (id: string) => Promise<void>;
  buyerReceipts: Record<string, Record<string, BuyerReceipt>>;
  acknowledgeBuyerReceipt: (
    buyerCode: string,
    shipmentId: string,
    docIds: string[]
  ) => Promise<void>;
};

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, setDisplayCurrency, isSyncingRates } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Icons.Dashboard },
    { name: 'Shipments', path: '/shipments', icon: Icons.Shipments },
    { name: 'Routes', path: '/routes', icon: Icons.Documents },
    { name: 'Lots', path: '/lots', icon: Icons.Documents },
    { name: 'Finance', path: '/finance', icon: Icons.Finance, roles: ['Admin', 'Finance', 'Management'] },
    { name: 'Risk', path: '/risk', icon: Icons.AI },
    { name: 'Alerts', path: '/alerts', icon: Icons.Documents },
    { name: 'Documents', path: '/documents', icon: Icons.Documents },
    { name: 'Forms', path: '/forms', icon: Icons.Documents },
    { name: 'Buyers', path: '/buyers', icon: Icons.Shipments },
    { name: 'Users', path: '/users', icon: Icons.Dashboard, roles: ['Admin'] },
    { name: 'AI Hub', path: '/ai-hub', icon: Icons.AI },
  ];

  const filteredNavItems = navItems.filter((item) => !item.roles || item.roles.includes(state.role));

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-[#F5F5F5] overflow-hidden font-['Inter']">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D4AF37] blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[#FFB800] blur-[120px] rounded-full"></div>
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <aside className="w-72 bg-black/40 backdrop-blur-2xl border-r border-white/5 flex flex-col z-20">
        <div className="p-8 flex items-center space-x-4 cursor-pointer" onClick={() => navigate('/')}>
          <Logo className="w-12 h-12" />
          <div>
            <span className="text-xl font-black tracking-tighter text-[#D4AF37] block leading-none">TOMOCA</span>
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40 block mt-1">
              Export Systems
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredNavItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`group flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all relative overflow-hidden ${
                location.pathname === item.path
                  ? 'bg-gradient-to-r from-[#D4AF37]/20 to-transparent text-[#D4AF37] border-l-2 border-[#D4AF37]'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon
                className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${
                  location.pathname === item.path ? 'drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]' : ''
                }`}
              />
              <span className="text-sm font-semibold tracking-wide uppercase">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-6 bg-white/5 border-t border-white/5 m-4 rounded-2xl space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[9px] uppercase text-[#D4AF37] font-black tracking-widest">
                Display Currency
              </label>
              {isSyncingRates && (
                <span className="flex items-center gap-1">
                  <span className="w-1 h-1 bg-[#D4AF37] rounded-full animate-ping"></span>
                  <span className="text-[7px] font-black uppercase text-white/30 tracking-widest">Syncing</span>
                </span>
              )}
            </div>
            <div className="flex bg-black/50 p-1 rounded-xl border border-white/10">
              {(['USD', 'ETB'] as CurrencyCode[]).map((cur) => (
                <button
                  key={cur}
                  disabled={isSyncingRates}
                  onClick={() => void setDisplayCurrency(cur)}
                  className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${
                    state.displayCurrency === cur
                      ? 'bg-[#D4AF37] text-black'
                      : 'text-white/40 hover:text-white disabled:opacity-20'
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate('/profile')}
            className="w-full py-3 border border-white/10 text-white/40 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
          >
            Operator Profile
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="h-20 bg-black/20 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-10">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <Logo className="w-8 h-8" />
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-1.5 h-6 bg-[#D4AF37] rounded-full shadow-[0_0_10px_rgba(212,175,55,0.5)]"></div>
              <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white/80">
                {navItems.find((n) => n.path === location.pathname)?.name || 'System Overview'}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-8">
            <div className="hidden md:flex flex-col text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  Rate Sync: {state.exchangeRates.ETB?.toFixed(2)} ETB/$
                </span>
                {isSyncingRates && <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse"></span>}
              </div>
              <span className="text-xs font-bold text-[#10B981] flex items-center gap-1.5 justify-end">
                <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full animate-ping"></span>
                Operational
              </span>
            </div>

            <div
              onClick={() => navigate('/profile')}
              className="flex items-center space-x-3 bg-white/5 pl-4 pr-1.5 py-1.5 rounded-full border border-white/10 cursor-pointer hover:bg-white/10 transition-all group"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-white/60 group-hover:text-white">
                {state.role}
              </span>
              <div className="w-8 h-8 rounded-full border border-[#D4AF37]/50 p-0.5 group-hover:border-[#D4AF37]">
                <img
                  src={`https://picsum.photos/seed/${state.role}/40/40`}
                  className="rounded-full grayscale group-hover:grayscale-0 transition-all"
                  alt="profile"
                />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">{children}</div>
      </main>

      {isSyncingRates && (
        <div className="fixed bottom-10 right-10 z-[100] bg-black border border-[#D4AF37] px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em]">
                Real-time Market Sync
              </p>
              <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">
                Fetching global exchange protocols via Gemini...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InnerApp = () => {
  const { user, profile, loading: authLoading } = useAuth();

  const [role, setRole] = useState<Role>('Admin');
  const [displayCurrency, setDisplayCurrencyState] = useState<CurrencyCode>('USD');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    ETB: 122.5,
    EUR: 0.93,
    GBP: 0.78,
    USD: 1.0,
  });
  const [isSyncingRates, setIsSyncingRates] = useState(false);

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [routes, setRoutes] = useState<RouteTemplate[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [buyerReceipts, setBuyerReceipts] = useState<Record<string, Record<string, BuyerReceipt>>>({});

  useEffect(() => {
    if (profile?.role === 'admin') setRole('Admin');
    if (profile?.role === 'finance') setRole('Finance');
    if (profile?.role === 'management') setRole('Management');
    if (profile?.role === 'sales') setRole('Sales');
  }, [profile]);

  const refreshExchangeRates = async () => {
    if (!(import.meta as any)?.env?.VITE_GEMINI_API_KEY) return;

    setIsSyncingRates(true);
    try {
      const rates = await getLiveExchangeRates();
      if (rates) setExchangeRates((prev) => ({ ...prev, ...rates }));
    } catch (e) {
      console.error('RATE SYNC FAILED', e);
    } finally {
      setIsSyncingRates(false);
    }
  };

  const setDisplayCurrency = async (cur: CurrencyCode) => {
    setDisplayCurrencyState(cur);
    await refreshExchangeRates();
  };

  useEffect(() => {
    if (authLoading) return;

    const fetchInitialData = async () => {
      setIsLoading(true);

      if (!supabase || !user) {
        setShipments([]);
        setBuyers([]);
        setDocuments([]);
        setRoutes([]);
        setLots([]);
        setBuyerReceipts({});
        setDismissedAlertIds([]);
        setIsLoading(false);
        return;
      }

      const FETCH_TIMEOUT_MS = 10_000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Data fetch timed out after 10s')), FETCH_TIMEOUT_MS)
      );

      try {
        const results = await Promise.race([
          Promise.allSettled([
            supabase.from('shipments').select('*'),
            supabase.from('buyers').select('*'),
            supabase.from('documents').select('*'),
            supabase.from('routes').select('*'),
            supabase.from('lots').select('*'),
            supabase.from('buyer_receipts').select('*'),
          ]),
          timeoutPromise,
        ]);

        const [shpRes, buyRes, docRes, routeRes, lotRes, receiptRes] = results.map((r) =>
          r.status === 'fulfilled' ? r.value : { data: [], error: r.reason }
        );

        const buyersUi = Array.isArray(buyRes.data)
          ? buyRes.data.map((x: any) => dbBuyerToUi(x as DbBuyer))
          : [];

        const shipmentsUi = Array.isArray(shpRes.data)
          ? shpRes.data.map((x: any) => ensureShipmentIntelligence(dbShipmentToUi(x as DbShipment)))
          : [];

        const docsUi = Array.isArray(docRes.data)
          ? docRes.data.map((x: any) => dbDocumentToUi(x as DbDocument))
          : [];

        const routesUi = Array.isArray(routeRes.data)
          ? routeRes.data.map((x: any) => dbRouteToUi(x as DbRoute))
          : [];

        const lotsUi = Array.isArray(lotRes.data)
          ? lotRes.data.map((x: any) => dbLotToUi(x as DbLot))
          : [];

        const receiptMap: Record<string, Record<string, BuyerReceipt>> = {};
        if (Array.isArray(receiptRes.data)) {
          for (const r of receiptRes.data as any[]) {
            const key = String(r.buyer_id ?? '').toUpperCase();
            if (!key) continue;
            if (!receiptMap[key]) receiptMap[key] = {};
            receiptMap[key][r.shipment_id] = {
              acknowledgedAt: r.received_at,
              docIds: [],
            };
          }
        }

        setBuyers(buyersUi);
        setShipments(shipmentsUi);
        setDocuments(docsUi);
        setRoutes(routesUi);
        setLots(lotsUi);
        setBuyerReceipts(receiptMap);
      } catch (error) {
        console.error('DATA FETCH ERROR:', error);
        setShipments([]);
        setBuyers([]);
        setDocuments([]);
        setRoutes([]);
        setLots([]);
        setBuyerReceipts({});
      } finally {
        setIsLoading(false);
      }
    };

    void fetchInitialData();
  }, [user?.id, authLoading]);

  useEffect(() => {
    if ((import.meta as any)?.env?.VITE_GEMINI_API_KEY) {
      void refreshExchangeRates();
    }
  }, []);

  const state: AppState = useMemo(
    () => ({
      role,
      shipments,
      buyers,
      documents,
      routes,
      lots,
      baseCurrency: 'USD',
      displayCurrency,
      exchangeRates,
    }),
    [role, shipments, buyers, documents, routes, lots, displayCurrency, exchangeRates]
  );

  const updateShipment = async (updated: Shipment) => {
    const buyerId = updated.buyerId ?? buyers.find((b) => b.name === updated.buyerName)?.id;
    if (!buyerId) throw new Error('Please select an existing buyer before saving.');

    if (supabase) {
      const payload = uiShipmentToDb(updated, buyerId, updated.routeId ?? null);
      const { data, error } = await supabase.from('shipments').upsert(payload as any).select('*').single();
      if (error) throw error;

      const saved = ensureShipmentIntelligence(dbShipmentToUi(data as DbShipment));
      setShipments((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
      return;
    }

    setShipments((prev) => prev.map((s) => (s.id === updated.id ? ensureShipmentIntelligence(updated) : s)));
  };

  const updateShipmentStatus = async (id: string, status: ShipmentStatus) => {
    const shipment = shipments.find((s) => s.id === id);
    if (!shipment) return;

    const docsForShipment = documents.filter((d) => d.shipmentId === shipment.id);
    const { missingCritical } = computeCompliance(ensureShipmentIntelligence(shipment), docsForShipment);

    if (status === ShipmentStatus.READY_TO_SHIP && missingCritical.length) {
      alert(
        `Cannot move to "${ShipmentStatus.READY_TO_SHIP}". Missing critical approvals: ${missingCritical
          .map((c) => c.name)
          .join(', ')}`
      );
      return;
    }

    if (status === ShipmentStatus.SHIPMENT_CLOSED) {
      const paymentMs = (ensureShipmentIntelligence(shipment).milestones ?? []).find((m) =>
        m.name.toLowerCase().includes('payment')
      );
      if (paymentMs && paymentMs.status !== 'Done') {
        alert(`Cannot move to "${ShipmentStatus.SHIPMENT_CLOSED}". Payment milestone is not marked Done.`);
        return;
      }
    }

    if (supabase) {
      await supabase.from('shipments').update({ status: uiShipmentStatusToDb(status) }).eq('id', id);
    }

    setShipments((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  const addRoute = async (route: RouteTemplate) => {
    const normalized = { ...route, id: route.id || crypto.randomUUID() };
    if (supabase) {
      const payload = uiRouteToDb(normalized);
      await supabase.from('routes').insert(payload as any);
    }
    setRoutes((prev) => [normalized, ...prev]);
  };

  const updateRoute = async (route: RouteTemplate) => {
    if (supabase) {
      const payload = uiRouteToDb(route);
      await supabase.from('routes').upsert(payload as any);
    }
    setRoutes((prev) => prev.map((r) => (r.id === route.id ? route : r)));
  };

  const deleteRoute = async (id: string) => {
    if (supabase) {
      await supabase.from('routes').delete().eq('id', id);
    }
    setRoutes((prev) => prev.filter((r) => r.id !== id));
    setShipments((prev) => prev.map((s) => (s.routeId === id ? { ...s, routeId: undefined } : s)));
  };

  const addLot = async (lot: Lot) => {
    const normalized = { ...lot, id: lot.id || crypto.randomUUID() };
    if (supabase) {
      const payload = uiLotToDb(normalized);
      await supabase.from('lots').insert(payload as any);
    }
    setLots((prev) => [normalized, ...prev]);
  };

  const updateLot = async (lot: Lot) => {
    if (supabase) {
      const payload = uiLotToDb(lot);
      await supabase.from('lots').upsert(payload as any);
    }
    setLots((prev) => prev.map((l) => (l.id === lot.id ? lot : l)));
  };

  const deleteLot = async (id: string) => {
    if (supabase) {
      await supabase.from('lots').delete().eq('id', id);
    }
    setLots((prev) => prev.filter((l) => l.id !== id));
    setShipments((prev) =>
      prev.map((s) => (s.lotIds?.includes(id) ? { ...s, lotIds: s.lotIds?.filter((x) => x !== id) } : s))
    );
  };

  const addShipment = async (shipment: Shipment) => {
    const buyerId = shipment.buyerId ?? buyers.find((b) => b.name === shipment.buyerName)?.id;
    if (!buyerId) throw new Error('Please select an existing buyer before saving.');

    const normalized: Shipment = ensureShipmentIntelligence({
      ...shipment,
      id: shipment.id || crypto.randomUUID(),
      buyerId,
    });

    if (supabase) {
      const payload = uiShipmentToDb(normalized, buyerId, normalized.routeId ?? null);
      const { data, error } = await supabase.from('shipments').insert(payload as any).select('*').single();
      if (error) throw error;

      const inserted = ensureShipmentIntelligence(dbShipmentToUi(data as DbShipment));
      setShipments((prev) => [inserted, ...prev]);
      return;
    }

    setShipments((prev) => [normalized, ...prev]);
  };

  const deleteShipment = async (id: string) => {
    if (supabase) {
      await supabase.from('shipments').delete().eq('id', id);
    }
    setShipments((prev) => prev.filter((s) => s.id !== id));
  };

  const addBuyer = async (buyer: Buyer) => {
    const normalized = { ...buyer, id: buyer.id || crypto.randomUUID() };
    if (supabase) {
      const payload = uiBuyerToDb(normalized);
      await supabase.from('buyers').insert(payload as any);
    }
    setBuyers((prev) => [normalized, ...prev]);
  };

  const updateBuyer = async (updated: Buyer) => {
    if (supabase) {
      const payload = uiBuyerToDb(updated);
      await supabase.from('buyers').upsert(payload as any);
    }
    setBuyers((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  const deleteBuyer = async (id: string) => {
    if (supabase) {
      await supabase.from('buyers').delete().eq('id', id);
    }
    setBuyers((prev) => prev.filter((b) => b.id !== id));
  };

  const addDocument = async (doc: Document) => {
    const normalized = {
      ...doc,
      id: doc.id || crypto.randomUUID(),
      buyerVisible: doc.buyerVisible ?? false,
    };
    if (supabase) {
      const payload = uiDocumentToDb(normalized);
      await supabase.from('documents').insert(payload as any);
    }
    setDocuments((prev) => [...prev, normalized]);
  };

  const updateDocument = async (updated: Document) => {
    if (supabase) {
      const payload = uiDocumentToDb(updated);
      await supabase.from('documents').upsert(payload as any);
    }
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const dismissAlert = async (id: string) => {
    setDismissedAlertIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const acknowledgeBuyerReceipt = async (buyerCode: string, shipmentId: string, docIds: string[]) => {
    const normalized = String(buyerCode || profile?.buyer_id || '').toUpperCase();
    if (!normalized) return;

    if (supabase) {
      const buyerId =
        profile?.buyer_id && profile.role === 'buyer'
          ? profile.buyer_id
          : buyers.find(
              (b) =>
                b.id.toUpperCase() === normalized ||
                (b.portalCode ?? '').toUpperCase() === normalized
            )?.id ?? normalized;

      if (!buyerId) throw new Error('Unable to resolve buyer for receipt acknowledgement.');

      const { error } = await supabase.from('buyer_receipts').upsert(
        {
          buyer_id: buyerId,
          shipment_id: shipmentId,
          received_at: new Date().toISOString(),
        } as any,
        { onConflict: 'buyer_id,shipment_id' }
      );

      if (error) throw error;
    }

    setBuyerReceipts((prev) => {
      const next = { ...prev };
      const byBuyer = { ...(next[normalized] ?? {}) };
      byBuyer[shipmentId] = { acknowledgedAt: new Date().toISOString(), docIds };
      next[normalized] = byBuyer;
      return next;
    });
  };

  const seedData = async () => {
    if (!supabase) {
      alert('Supabase not connected.');
      return;
    }

    setIsLoading(true);
    try {
      await Promise.all([
        supabase.from('documents').delete().neq('id', '0'),
        supabase.from('shipments').delete().neq('id', '0'),
        supabase.from('buyers').delete().neq('id', '0'),
      ]);

      setShipments([]);
      setBuyers([]);
      setDocuments([]);
      alert('Database cleared.');
    } catch (e) {
      console.error('CLEAR ERROR:', e);
      alert('Clearing failed. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const convert = (value: number) => {
    const rate = state.exchangeRates[state.displayCurrency] || 1;
    const convertedValue = value * rate;

    let symbol = '$';
    if (state.displayCurrency === 'ETB') symbol = 'Br';
    else if (state.displayCurrency === 'EUR') symbol = '€';
    else if (state.displayCurrency === 'GBP') symbol = '£';

    return { value: convertedValue, symbol, code: state.displayCurrency };
  };

  if (authLoading || isLoading) {
    return (
      <div className="h-screen bg-[#0A0A0A] flex flex-col items-center justify-center space-y-6">
        <Logo className="w-20 h-20 animate-pulse" />
        <div className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.5em]">
          Loading System Data...
        </div>
        <div className="text-[8px] font-bold text-white/20 uppercase tracking-widest">
          Establishing secure connection
        </div>
      </div>
    );
  }

  const PendingApproval = () => (
    <div className="h-screen bg-[#0A0A0A] flex flex-col items-center justify-center space-y-6 text-center px-6">
      <Logo className="w-16 h-16" />
      <div>
        <h1 className="text-xl font-black text-white tracking-tight">Access Pending</h1>
        <p className="text-sm text-white/40 font-semibold mt-2">
          Your account is waiting for admin approval or has been restricted.
        </p>
      </div>
    </div>
  );

  const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!user) return <Login />;
    if (supabase && profile && profile.status !== 'active') return <PendingApproval />;
    if (supabase && profile?.role === 'buyer') return <Navigate to="/portal" replace />;
    return <>{children}</>;
  };

  return (
    <AppContext.Provider
      value={{
        state,
        setRole,
        setDisplayCurrency,
        updateShipment,
        updateShipmentStatus,
        addShipment,
        deleteShipment,
        addBuyer,
        updateBuyer,
        deleteBuyer,
        addDocument,
        updateDocument,
        addRoute,
        updateRoute,
        deleteRoute,
        addLot,
        updateLot,
        deleteLot,
        seedData,
        refreshExchangeRates,
        isSyncingRates,
        convert,
        dismissedAlertIds,
        dismissAlert,
        buyerReceipts,
        acknowledgeBuyerReceipt,
      }}
    >
      <Router>
        <Routes>
          <Route path="/buyer" element={<BuyerPortalLogin />} />
          <Route path="/buyer/:code" element={<BuyerPortalHome />} />
          <Route path="/buyer/:code/shipment/:id" element={<BuyerPortalHome />} />
          <Route path="/portal" element={<BuyerPortalHome />} />
          <Route path="/portal/shipment/:id" element={<BuyerPortalHome />} />

          <Route
            path="/*"
            element={
              <RequireAuth>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/shipments" element={<ShipmentList />} />
                    <Route path="/shipments/:id" element={<ShipmentDetail />} />
                    <Route path="/routes" element={<RoutesHub />} />
                    <Route path="/lots" element={<LotsHub />} />
                    <Route path="/finance" element={<FinanceDashboard />} />
                    <Route path="/risk" element={<RiskCenter />} />
                    <Route path="/alerts" element={<AlertsCenter />} />
                    <Route path="/documents" element={<DocumentsHub />} />
                    <Route path="/buyers" element={<BuyersHub />} />
                    <Route path="/buyers/:id" element={<BuyerProfile />} />
                    <Route path="/users" element={<AdminUsers />} />
                    <Route path="/forms" element={<FormsHub />} />
                    <Route path="/ai-hub" element={<AIAgentHub />} />
                    <Route path="/profile" element={<Profile />} />
                  </Routes>
                </Layout>
              </RequireAuth>
            }
          />
        </Routes>
      </Router>
    </AppContext.Provider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  );
}