import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';
import { computeRisk, ensureShipmentIntelligence } from '../intelligence';
import { supabase } from '../supabaseClient';

const Pill: React.FC<{ text: string; tone: 'low' | 'med' | 'high' }> = ({ text, tone }) => {
  const cls =
    tone === 'high'
      ? 'bg-red-500/10 text-red-400 border-red-500/20'
      : tone === 'med'
      ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
      : 'bg-green-500/10 text-green-400 border-green-500/20';
  return <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${cls}`}>{text}</span>;
};

type DbViewRow = {
  shipment_id: string;
  reference?: string | null;
  status?: string | null;
  origin?: string | null;
  destination?: string | null;
  buyer_name?: string | null;
  missing_critical_docs?: number | null;
  milestones_completed?: number | null;
  milestones_total?: number | null;
  payments_received?: number | null;
};

type DbSnapshot = {
  shipment_id?: string | null;
  risk_score: number;
  risk_level?: string | null;
  drivers?: any;
  created_at?: string | null;
};

const RiskCenter: React.FC = () => {
  const { state } = useApp();
  const [dbRows, setDbRows] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      const [viewRes, snapRes] = await Promise.all([
        supabase.from('v_shipment_risk_dashboard').select('*'),
        supabase.from('risk_snapshots').select('*').order('created_at', { ascending: false }),
      ]);
      if (viewRes.error) console.error('Failed to load risk dashboard', viewRes.error);
      if (snapRes.error) console.error('Failed to load risk snapshots', snapRes.error);

      const latestByShipment = new Map<string, DbSnapshot>();
      for (const snap of (snapRes.data ?? []) as DbSnapshot[]) {
        if (snap.shipment_id && !latestByShipment.has(snap.shipment_id)) latestByShipment.set(snap.shipment_id, snap);
      }

      const merged = ((viewRes.data ?? []) as DbViewRow[]).map((row) => {
        const snap = latestByShipment.get(row.shipment_id);
        const compliance = row.missing_critical_docs ? Math.max(0, 100 - row.missing_critical_docs * 25) : 100;
        const derivedScore = Math.max(0, Math.min(100, (row.missing_critical_docs ?? 0) * 25 + ((row.milestones_total ?? 0) > 0 ? (((row.milestones_total ?? 0) - (row.milestones_completed ?? 0)) * 8) : 0) + ((row.payments_received ?? 0) > 0 ? 0 : 10)));
        return {
          shipmentId: row.shipment_id,
          reference: row.reference ?? row.shipment_id,
          buyerName: row.buyer_name ?? 'Unknown Buyer',
          destination: row.destination ?? 'Unknown',
          status: row.status ?? 'in_progress',
          compliance,
          score: snap?.risk_score ?? derivedScore,
          reasons: Array.isArray(snap?.drivers) ? snap?.drivers : [
            `${row.missing_critical_docs ?? 0} missing critical docs`,
            `${row.milestones_completed ?? 0}/${row.milestones_total ?? 0} milestones complete`,
          ],
          lastUpdated: snap?.created_at ?? new Date().toISOString(),
        };
      }).sort((a, b) => b.score - a.score);
      setDbRows(merged);
    };
    load();
  }, []);

  const fallbackRows = useMemo(() => {
    return state.shipments
      .map((s) => ensureShipmentIntelligence(s))
      .map((s) => {
        const buyer = state.buyers.find((b) => b.name === s.buyerName);
        const docs = state.documents.filter((d) => d.shipmentId === s.id);
        const risk = computeRisk(s, buyer, docs, state.lots ?? [], state.routes ?? []);
        return {
          shipmentId: s.id,
          reference: s.id,
          buyerName: s.buyerName,
          destination: s.destination,
          status: s.status,
          compliance: risk.compliance,
          score: risk.score,
          reasons: risk.reasons,
          lastUpdated: new Date().toISOString(),
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [state.shipments, state.buyers, state.documents, state.lots, state.routes]);

  const rows = dbRows.length ? dbRows : fallbackRows;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tighter text-white">Risk Center</h2>
          <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-2">
            Reading from Supabase risk analytics when available.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl">
            <div className="text-[8px] font-black text-white/30 uppercase tracking-widest">Shipments</div>
            <div className="text-lg font-black text-white mt-1">{rows.length}</div>
          </div>
        </div>
      </div>

      <div className="bg-black/30 border border-white/10 rounded-[28px] overflow-hidden">
        <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">Shipment Risk Heatmap</p>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">Sorted by risk score (high → low)</p>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {rows.length === 0 && (
            <div className="p-10 text-center text-white/20 font-black uppercase tracking-widest">No shipments yet</div>
          )}
          {rows.map((row) => {
            const tone = row.score >= 70 ? 'high' : row.score >= 40 ? 'med' : 'low';
            return (
              <div key={row.shipmentId} className="px-8 py-6 flex items-center justify-between hover:bg-white/[0.03] transition-all">
                <div className="min-w-0">
                  <div className="flex items-center gap-4 flex-wrap">
                    <Link
                      to={`/shipments/${row.shipmentId}`}
                      className="text-sm font-black tracking-tight text-white hover:text-[#D4AF37] transition-colors"
                    >
                      {row.reference}
                    </Link>
                    <Pill text={`${row.score}/100`} tone={tone} />
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{String(row.status).replace(/_/g, ' ')}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-6 flex-wrap">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Buyer: {row.buyerName}</span>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Destination: {row.destination}</span>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Compliance: {row.compliance}%</span>
                  </div>
                  {row.reasons?.length > 0 && (
                    <p className="mt-3 text-[11px] text-white/40 font-semibold leading-relaxed">
                      {row.reasons.slice(0, 2).join(' • ')}
                    </p>
                  )}
                </div>

                <div className="hidden md:flex items-center gap-3">
                  <Link
                    to={`/shipments/${row.shipmentId}`}
                    className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:bg-white/10 hover:text-white transition-all"
                  >
                    Open
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RiskCenter;
