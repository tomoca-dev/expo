import React, { useMemo, useState } from 'react';
import { useApp } from '../App';
import { RiskLevel, RouteTemplate } from '../types';

const emptyRoute = (): RouteTemplate => ({
  id: '',
  name: 'Addis Ababa → Djibouti → Destination',
  origin: 'Addis Ababa',
  port: 'Djibouti',
  destination: 'Hamburg',
  inlandLeadDays: 3,
  portHandlingDays: 5,
  seaTransitDays: 18,
  riskLevel: RiskLevel.MEDIUM,
  commonDelayReasons: ['Customs inspection', 'Trucking delays', 'Port congestion'],
});

export default function RoutesHub() {
  const { state, addRoute, updateRoute, deleteRoute } = useApp();
  const [editing, setEditing] = useState<RouteTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);
  const routes = state.routes ?? [];

  const sorted = useMemo(() => {
    return [...routes].sort((a, b) => a.name.localeCompare(b.name));
  }, [routes]);

  const openNew = () => {
    setEditing(emptyRoute());
    setIsNew(true);
  };

  const openEdit = (r: RouteTemplate) => {
    setEditing({ ...r });
    setIsNew(false);
  };

  const save = () => {
    if (!editing) return;
    const normalized: RouteTemplate = {
      ...editing,
      commonDelayReasons: (editing.commonDelayReasons ?? []).filter(Boolean),
      inlandLeadDays: Math.max(0, Number(editing.inlandLeadDays) || 0),
      portHandlingDays: Math.max(0, Number(editing.portHandlingDays) || 0),
      seaTransitDays: Math.max(0, Number(editing.seaTransitDays) || 0),
    };
    if (isNew || !normalized.id) addRoute(normalized);
    else updateRoute(normalized);
    setEditing(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tighter">Route Library</h2>
          <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-2">
            Admin-managed logistics routes used for milestone automation and delay risk.
          </p>
        </div>
        <button
          onClick={openNew}
          className="px-6 py-3 rounded-2xl bg-[#D4AF37] text-black text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(212,175,55,0.25)]"
        >
          Add Route
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sorted.map((r) => (
          <div
            key={r.id}
            className="bg-black/30 border border-white/5 rounded-[28px] p-8 backdrop-blur-xl hover:border-[#D4AF37]/20 transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">{r.riskLevel} route</div>
                <div className="text-xl font-black tracking-tighter mt-2">{r.name}</div>
                <div className="text-xs text-white/40 font-bold uppercase tracking-widest mt-2">
                  {r.origin} → {r.port} → {r.destination}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(r)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this route?')) deleteRoute(r.id);
                  }}
                  className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/15"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Inland</div>
                <div className="text-lg font-black mt-1">{r.inlandLeadDays}d</div>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Port</div>
                <div className="text-lg font-black mt-1">{r.portHandlingDays}d</div>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Sea</div>
                <div className="text-lg font-black mt-1">{r.seaTransitDays}d</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Common delay reasons</div>
              <div className="flex flex-wrap gap-2 mt-3">
                {(r.commonDelayReasons ?? []).slice(0, 6).map((x, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/50"
                  >
                    {x}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-[#0F0F0F] border border-white/10 rounded-[36px] p-10 shadow-2xl">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.35em] text-[#D4AF37]">Route Template</div>
                <h3 className="text-2xl font-black tracking-tighter mt-2">{isNew ? 'Create Route' : 'Edit Route'}</h3>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8">
              <label className="space-y-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Name</div>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm"
                />
              </label>
              <label className="space-y-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Risk level</div>
                <select
                  value={editing.riskLevel}
                  onChange={(e) => setEditing({ ...editing, riskLevel: e.target.value as RiskLevel })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm"
                >
                  {Object.values(RiskLevel).map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Origin</div>
                <input
                  value={editing.origin}
                  onChange={(e) => setEditing({ ...editing, origin: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm"
                />
              </label>
              <label className="space-y-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Port</div>
                <input
                  value={editing.port}
                  onChange={(e) => setEditing({ ...editing, port: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm"
                />
              </label>
              <label className="space-y-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Destination</div>
                <input
                  value={editing.destination}
                  onChange={(e) => setEditing({ ...editing, destination: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm"
                />
              </label>
              <div />
              <label className="space-y-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Inland lead (days)</div>
                <input
                  type="number"
                  value={editing.inlandLeadDays}
                  onChange={(e) => setEditing({ ...editing, inlandLeadDays: Number(e.target.value) })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm"
                />
              </label>
              <label className="space-y-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Port handling (days)</div>
                <input
                  type="number"
                  value={editing.portHandlingDays}
                  onChange={(e) => setEditing({ ...editing, portHandlingDays: Number(e.target.value) })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm"
                />
              </label>
              <label className="space-y-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Sea transit (days)</div>
                <input
                  type="number"
                  value={editing.seaTransitDays}
                  onChange={(e) => setEditing({ ...editing, seaTransitDays: Number(e.target.value) })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Common delay reasons (comma-separated)</div>
                <input
                  value={(editing.commonDelayReasons ?? []).join(', ')}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      commonDelayReasons: e.target.value
                        .split(',')
                        .map((x) => x.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-10">
              <button
                onClick={() => setEditing(null)}
                className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="px-6 py-3 rounded-2xl bg-[#D4AF37] text-black text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(212,175,55,0.25)]"
              >
                Save Route
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
