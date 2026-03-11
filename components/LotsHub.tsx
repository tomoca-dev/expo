import React, { useMemo, useState } from 'react';
import { useApp } from '../App';
import { Lot } from '../types';

const emptyLot = (): Lot => ({
  id: '',
  code: `LOT-${Math.floor(Math.random() * 9000) + 1000}`,
  origin: 'Ethiopia',
  grade: 'Grade 1',
  processingType: 'Washed',
  warehouse: 'Addis Warehouse',
  quantityKg: 60000,
  cuppingScore: 84,
  moisturePercent: 12.2,
  screenSize: 15,
  defectCount: 0,
  notes: '',
});

export default function LotsHub() {
  const { state, addLot, updateLot, deleteLot } = useApp();
  const [editing, setEditing] = useState<Lot | null>(null);
  const [isNew, setIsNew] = useState(false);
  const lots = state.lots ?? [];

  const sorted = useMemo(() => {
    return [...lots].sort((a, b) => a.code.localeCompare(b.code));
  }, [lots]);

  const openNew = () => {
    setEditing(emptyLot());
    setIsNew(true);
  };

  const openEdit = (l: Lot) => {
    setEditing({ ...l });
    setIsNew(false);
  };

  const save = () => {
    if (!editing) return;
    const normalized: Lot = {
      ...editing,
      quantityKg: Math.max(0, Number(editing.quantityKg) || 0),
      cuppingScore: editing.cuppingScore == null ? undefined : Number(editing.cuppingScore),
      moisturePercent: editing.moisturePercent == null ? undefined : Number(editing.moisturePercent),
      screenSize: editing.screenSize == null ? undefined : Number(editing.screenSize),
      defectCount: editing.defectCount == null ? undefined : Number(editing.defectCount),
    };
    if (isNew || !normalized.id) addLot(normalized);
    else updateLot(normalized);
    setEditing(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tighter">Lots & Quality</h2>
          <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-2">
            Track coffee lots with cupping and quality telemetry.
          </p>
        </div>
        <button
          onClick={openNew}
          className="px-6 py-3 rounded-2xl bg-[#D4AF37] text-black text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(212,175,55,0.25)]"
        >
          Add Lot
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sorted.map((l) => (
          <div
            key={l.id}
            className="bg-black/30 border border-white/5 rounded-[28px] p-8 backdrop-blur-xl hover:border-[#D4AF37]/20 transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">{l.code}</div>
                <div className="text-xl font-black tracking-tighter mt-2">{l.origin} • {l.processingType}</div>
                <div className="text-xs text-white/40 font-bold uppercase tracking-widest mt-2">
                  {l.grade} — {l.warehouse}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(l)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this lot?')) deleteLot(l.id);
                  }}
                  className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/15"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Qty</div>
                <div className="text-lg font-black mt-1">{Math.round(l.quantityKg / 1000)}t</div>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Cupping</div>
                <div className="text-lg font-black mt-1">{l.cuppingScore ?? '—'}</div>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Moisture</div>
                <div className="text-lg font-black mt-1">{l.moisturePercent != null ? `${l.moisturePercent}%` : '—'}</div>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Screen</div>
                <div className="text-lg font-black mt-1">{l.screenSize ?? '—'}</div>
              </div>
            </div>

            {l.notes && (
              <div className="mt-6 text-xs text-white/40 font-semibold">
                {l.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-[#0F0F0F] border border-white/10 rounded-[36px] p-10 shadow-2xl">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.35em] text-[#D4AF37]">Lot</div>
                <h3 className="text-2xl font-black tracking-tighter mt-2">{isNew ? 'Create Lot' : 'Edit Lot'}</h3>
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
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Code</div>
                <input
                  value={editing.code}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm"
                />
              </label>
              <label className="space-y-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Warehouse</div>
                <input
                  value={editing.warehouse}
                  onChange={(e) => setEditing({ ...editing, warehouse: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm"
                />
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
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Grade</div>
                <input
                  value={editing.grade}
                  onChange={(e) => setEditing({ ...editing, grade: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm"
                />
              </label>
              <label className="space-y-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Processing</div>
                <input
                  value={editing.processingType}
                  onChange={(e) => setEditing({ ...editing, processingType: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm"
                />
              </label>
              <label className="space-y-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Quantity (KG)</div>
                <input
                  type="number"
                  value={editing.quantityKg}
                  onChange={(e) => setEditing({ ...editing, quantityKg: Number(e.target.value) })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm"
                />
              </label>

              <div className="md:col-span-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Quality</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                  <label className="space-y-2">
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Cupping</div>
                    <input
                      type="number"
                      value={editing.cuppingScore ?? ''}
                      onChange={(e) => setEditing({ ...editing, cuppingScore: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="space-y-2">
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Moisture %</div>
                    <input
                      type="number"
                      step="0.1"
                      value={editing.moisturePercent ?? ''}
                      onChange={(e) => setEditing({ ...editing, moisturePercent: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="space-y-2">
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Screen</div>
                    <input
                      type="number"
                      value={editing.screenSize ?? ''}
                      onChange={(e) => setEditing({ ...editing, screenSize: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="space-y-2">
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Defects</div>
                    <input
                      type="number"
                      value={editing.defectCount ?? ''}
                      onChange={(e) => setEditing({ ...editing, defectCount: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm"
                    />
                  </label>
                </div>
              </div>

              <label className="space-y-2 md:col-span-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Notes</div>
                <textarea
                  value={editing.notes ?? ''}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm min-h-[90px]"
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
                Save Lot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
