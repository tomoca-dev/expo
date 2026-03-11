import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../App';
import { computeAlerts } from '../intelligence';
import { supabase } from '../supabaseClient';

type DbAlert = {
  id: string;
  shipment_id?: string | null;
  buyer_id?: string | null;
  severity?: string | null;
  status?: string | null;
  title: string;
  details?: string | null;
  created_at?: string | null;
};

const AlertsCenter: React.FC = () => {
  const { state } = useApp();
  const [dbAlerts, setDbAlerts] = useState<DbAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDbAlerts = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .neq('status', 'closed')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load alerts', error);
    } else {
      setDbAlerts((data ?? []) as DbAlert[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDbAlerts();
  }, []);

  const fallbackAlerts = useMemo(() => {
    return computeAlerts(state.shipments, state.buyers, state.documents, [], state.lots ?? [], state.routes ?? []);
  }, [state.shipments, state.buyers, state.documents, state.lots, state.routes]);

  const alerts = dbAlerts.length
    ? dbAlerts.map((a) => ({
        id: a.id,
        createdAt: a.created_at ?? new Date().toISOString(),
        severity: a.severity === 'critical' ? 'Critical' : a.severity === 'high' || a.severity === 'medium' ? 'Warning' : 'Info',
        title: a.title,
        message: a.details ?? '',
        shipmentId: a.shipment_id ?? undefined,
        buyerId: a.buyer_id ?? undefined,
        status: a.status ?? 'open',
      }))
    : fallbackAlerts.map((a) => ({ ...a, status: 'derived' } as any));

  const badge = (sev: string) => {
    const cls =
      sev === 'Critical'
        ? 'bg-red-500/10 text-red-400 border-red-500/20'
        : sev === 'Warning'
        ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
        : 'bg-white/5 text-white/40 border-white/10';
    return <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${cls}`}>{sev}</span>;
  };

  const updateAlertStatus = async (id: string, status: 'acknowledged' | 'closed') => {
    if (!supabase) return;
    const patch: any = { status };
    if (status === 'acknowledged') patch.acknowledged_at = new Date().toISOString();
    if (status === 'closed') patch.closed_at = new Date().toISOString();
    const { error } = await supabase.from('alerts').update(patch).eq('id', id);
    if (error) {
      console.error('Failed to update alert', error);
      alert(error.message);
      return;
    }
    await loadDbAlerts();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tighter text-white">Alerts</h2>
          <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-2">
            Automated risk and compliance alerts. Connected to Supabase when alerts are available.
          </p>
        </div>
        <div className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl">
          <div className="text-[8px] font-black text-white/30 uppercase tracking-widest">Active Alerts</div>
          <div className="text-lg font-black text-white mt-1">{alerts.length}</div>
        </div>
      </div>

      <div className="bg-black/30 border border-white/10 rounded-[28px] overflow-hidden">
        <div className="divide-y divide-white/5">
          {(loading && !alerts.length) && (
            <div className="p-12 text-center text-white/30 font-black uppercase tracking-widest">Loading alerts…</div>
          )}

          {!loading && alerts.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-white/20 font-black uppercase tracking-widest">No active alerts</div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-2">System is currently stable.</p>
            </div>
          )}

          {alerts.map((a: any) => (
            <div key={a.id} className="px-8 py-6 flex items-start justify-between gap-6 hover:bg-white/[0.03] transition-all">
              <div className="min-w-0">
                <div className="flex items-center gap-4 flex-wrap">
                  {badge(a.severity)}
                  <p className="text-sm font-black text-white tracking-tight">{a.title}</p>
                  {a.shipmentId && (
                    <Link
                      to={`/shipments/${a.shipmentId}`}
                      className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:underline"
                    >
                      Open Shipment
                    </Link>
                  )}
                  {a.status && a.status !== 'derived' && (
                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-white/50">{a.status}</span>
                  )}
                </div>
                <p className="mt-3 text-[12px] text-white/50 font-semibold leading-relaxed">{a.message}</p>
                <p className="mt-3 text-[9px] text-white/30 font-black uppercase tracking-widest">{new Date(a.createdAt).toLocaleString()}</p>
              </div>

              <div className="shrink-0 flex gap-3">
                {supabase && dbAlerts.length > 0 && (
                  <>
                    <button
                      onClick={() => updateAlertStatus(a.id, 'acknowledged')}
                      className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:bg-white/10 hover:text-white transition-all"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => updateAlertStatus(a.id, 'closed')}
                      className="px-5 py-3 rounded-2xl bg-[#D4AF37] text-black text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
                    >
                      Resolve
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AlertsCenter;
