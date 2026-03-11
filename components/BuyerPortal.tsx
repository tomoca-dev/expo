import React, { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { Logo } from '../constants';
import { useApp } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { ensureShipmentIntelligence } from '../intelligence';
import { supabase } from '../supabaseClient';

const BuyerPortalLogin: React.FC = () => {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] flex items-center justify-center p-6 relative overflow-hidden font-['Inter']">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D4AF37] blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[#FFB800] blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-md bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 space-y-8 relative z-10">
        <div className="flex items-center gap-4">
          <Logo className="w-12 h-12" />
          <div>
            <div className="text-xl font-black tracking-tighter text-[#D4AF37] leading-none">TOMOCA</div>
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40 mt-1">Buyer Portal</div>
          </div>
        </div>

        <div>
          <h1 className="text-lg font-black tracking-tight text-white">Access your shipments</h1>
          <p className="text-[11px] text-white/40 font-semibold mt-2">
            Enter the portal access code shared by TOMOCA Export Systems.
          </p>
        </div>

        <div className="space-y-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="PORTAL-CODE-1234"
            className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold tracking-wider text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/60"
          />
          <button
            onClick={() => navigate(`/buyer/${encodeURIComponent(code.trim())}`)}
            disabled={!code.trim()}
            className="w-full py-4 bg-[#D4AF37] text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] disabled:opacity-30"
          >
            Enter
          </button>
          <div className="text-center">
            <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white/60">Back to Admin Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const BuyerPortalHome: React.FC = () => {
  const { code, id } = useParams();
  const { state, buyerReceipts, acknowledgeBuyerReceipt } = useApp();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const buyer = useMemo(() => {
    if (profile?.role === 'buyer' && profile.buyer_id) {
      return state.buyers.find((b) => b.id === profile.buyer_id);
    }
    return state.buyers.find((b) => (b.portalCode ?? '').toUpperCase() === (code ?? '').toUpperCase() || b.id.toUpperCase() === (code ?? '').toUpperCase());
  }, [state.buyers, code, profile]);

  const shipments = useMemo(() => {
    if (!buyer) return [];
    return state.shipments.filter((s) => (s.buyerId ? s.buyerId === buyer.id : s.buyerName === buyer.name));
  }, [state.shipments, buyer]);

  const selectedShipment = useMemo(() => {
    if (!id) return null;
    const s = shipments.find((x) => x.id === id);
    return s ? ensureShipmentIntelligence(s) : null;
  }, [id, shipments]);

  const docsByShipment = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of state.documents) {
      if (!d.shipmentId) continue;
      if (!d.buyerVisible) continue;
      map[d.shipmentId] = (map[d.shipmentId] ?? 0) + 1;
    }
    return map;
  }, [state.documents]);

  const buyerVisibleDocsForSelected = useMemo(() => {
    if (!selectedShipment) return [];
    return state.documents.filter((d) => d.shipmentId === selectedShipment.id && d.buyerVisible);
  }, [state.documents, selectedShipment]);

  const receipt = useMemo(() => {
    const key = String(profile?.buyer_id ?? buyer?.id ?? code ?? '').toUpperCase();
    if (!selectedShipment || !key) return null;
    return buyerReceipts?.[key]?.[selectedShipment.id] ?? null;
  }, [buyerReceipts, code, selectedShipment, profile, buyer]);

  const downloadPack = async () => {
    if (!buyer || !selectedShipment) return;
    const zip = new JSZip();
    const folder = zip.folder(`${selectedShipment.id}-buyer-docs`) ?? zip;

    const manifest = {
      buyer: { name: buyer.name, country: buyer.country },
      shipment: {
        id: selectedShipment.id,
        status: selectedShipment.status,
        destination: selectedShipment.destination,
        coffeeType: selectedShipment.coffeeType,
        weightKg: selectedShipment.weight,
      },
      generatedAt: new Date().toISOString(),
      documents: buyerVisibleDocsForSelected.map((d) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        status: d.status,
        date: d.date,
        fileSize: d.fileSize,
      })),
    };

    folder.file('manifest.json', JSON.stringify(manifest, null, 2));

    for (const d of buyerVisibleDocsForSelected) {
      const safeName = `${d.type}-${d.id}`.replace(/[^a-z0-9\-_]+/gi, '_');
      if (supabase && d.storagePath) {
        const { data, error } = await supabase.storage.from('documents').download(d.storagePath);
        if (!error && data) {
          folder.file(`${safeName}-${d.name.replace(/[^a-z0-9\-_\.]+/gi, '_')}`, data);
        }
      }
      const body = {
        id: d.id,
        name: d.name,
        type: d.type,
        status: d.status,
        date: d.date,
        storagePath: d.storagePath ?? null,
        content: d.content ?? null,
      };
      folder.file(`${safeName}.json`, JSON.stringify(body, null, 2));
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedShipment.id}-buyer-documents.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const acknowledge = async () => {
    if (!selectedShipment) return;
    const docIds = buyerVisibleDocsForSelected.map((d) => d.id);
    await acknowledgeBuyerReceipt(String(profile?.buyer_id ?? buyer?.id ?? code ?? '').toUpperCase(), selectedShipment.id, docIds);
  };

  if (!buyer) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] flex items-center justify-center p-6 font-['Inter']">
        <div className="max-w-lg text-center space-y-6">
          <Logo className="w-16 h-16 mx-auto opacity-80" />
          <h1 className="text-xl font-black tracking-tight">Invalid portal code</h1>
          <p className="text-sm text-white/40 font-semibold">
            The access code was not found. Please contact TOMOCA to request a valid portal code.
          </p>
          <Link
            to="/buyer"
            className="inline-flex px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/10"
          >
            Try again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] font-['Inter']">
      <div className="px-10 py-8 border-b border-white/5 bg-black/20 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo className="w-10 h-10" />
          <div>
            <div className="text-lg font-black tracking-tight text-white">Buyer Portal</div>
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">{buyer.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {selectedShipment && (
            <button
              onClick={() => navigate(profile?.role === 'buyer' ? '/portal' : `/buyer/${encodeURIComponent(code ?? '')}`)}
              className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white"
            >
              Back to Shipments
            </button>
          )}
          {profile?.role !== 'buyer' && <Link to="/buyer" className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white">Switch Code</Link>}
        </div>
      </div>

      <div className="px-10 py-10 space-y-8">
        <div className="bg-black/30 border border-white/10 rounded-[28px] p-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">Profile</p>
              <p className="text-sm font-black text-white mt-2">{buyer.name}</p>
              <p className="text-[11px] text-white/40 font-semibold mt-1">Country: {buyer.country}</p>
            </div>
            <div className="flex gap-3">
              <div className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl">
                <div className="text-[8px] font-black text-white/30 uppercase tracking-widest">Shipments</div>
                <div className="text-lg font-black text-white mt-1">{shipments.length}</div>
              </div>
            </div>
          </div>
        </div>

        {!selectedShipment && (
          <div className="bg-black/30 border border-white/10 rounded-[28px] overflow-hidden">
            <div className="px-8 py-6 border-b border-white/10">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">My Shipments</p>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">View-only shipment status and shared documents</p>
            </div>
            <div className="divide-y divide-white/5">
              {shipments.length === 0 && (
                <div className="p-12 text-center text-white/20 font-black uppercase tracking-widest">No shipments found</div>
              )}
              {shipments.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/buyer/${encodeURIComponent(code ?? '')}/shipment/${encodeURIComponent(s.id)}`)}
                  className="w-full text-left px-8 py-6 flex items-center justify-between gap-6 hover:bg-white/5 transition"
                >
                  <div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-sm font-black tracking-tight text-white">{s.id}</span>
                      <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-white/50">{s.status}</span>
                    </div>
                    <div className="mt-3 flex gap-6 flex-wrap">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Destination: {s.destination}</span>
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Coffee: {s.coffeeType}</span>
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Shared Docs: {docsByShipment[s.id] ?? 0}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30">View</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedShipment && (
          <div className="space-y-6">
            <div className="bg-black/30 border border-white/10 rounded-[28px] p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">Shipment</p>
                  <div className="mt-2 flex items-center gap-4 flex-wrap">
                    <span className="text-xl font-black tracking-tight text-white">{selectedShipment.id}</span>
                    <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-white/50">{selectedShipment.status}</span>
                  </div>
                  <div className="mt-3 flex gap-6 flex-wrap">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Destination: {selectedShipment.destination}</span>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Coffee: {selectedShipment.coffeeType}</span>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Weight: {selectedShipment.weight.toLocaleString()} KG</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={downloadPack}
                    disabled={buyerVisibleDocsForSelected.length === 0}
                    className="px-6 py-3 bg-[#D4AF37] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30"
                  >
                    Download Pack
                  </button>
                  <button
                    onClick={acknowledge}
                    disabled={buyerVisibleDocsForSelected.length === 0 || !!receipt}
                    className="px-6 py-3 border border-white/10 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/70 disabled:opacity-30"
                  >
                    {receipt ? 'Docs Received' : 'Acknowledge Receipt'}
                  </button>
                </div>
              </div>

              {receipt && (
                <div className="mt-6 text-[10px] font-bold uppercase tracking-widest text-white/30">
                  Receipt acknowledged at {new Date(receipt.acknowledgedAt).toLocaleString()}.
                </div>
              )}
            </div>

            <div className="bg-black/30 border border-white/10 rounded-[28px] overflow-hidden">
              <div className="px-8 py-6 border-b border-white/10">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">Tracking Timeline</p>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">Milestone progress (read-only)</p>
              </div>
              <div className="divide-y divide-white/5">
                {(selectedShipment.milestones ?? []).map((m) => (
                  <div key={m.id} className="px-8 py-5 flex items-center justify-between gap-6">
                    <div>
                      <div className="text-sm font-black text-white/90">{m.name}</div>
                      <div className="mt-2 flex gap-6 flex-wrap">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Expected: {m.expectedDate ?? '—'}</span>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Actual: {m.actualDate ?? '—'}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 ${m.status === 'Done' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/40'}`}>
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black/30 border border-white/10 rounded-[28px] overflow-hidden">
              <div className="px-8 py-6 border-b border-white/10">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">Shared Documents</p>
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">Only documents marked as shared by admin appear here</p>
              </div>
              <div className="divide-y divide-white/5">
                {buyerVisibleDocsForSelected.length === 0 && (
                  <div className="p-12 text-center text-white/20 font-black uppercase tracking-widest">No documents shared yet</div>
                )}
                {buyerVisibleDocsForSelected.map((d) => (
                  <div key={d.id} className="px-8 py-5 flex items-center justify-between gap-6">
                    <div>
                      <div className="text-sm font-black text-white/90">{d.name}</div>
                      <div className="mt-2 flex gap-6 flex-wrap">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Type: {d.type}</span>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Status: {d.status}</span>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Date: {d.date}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Shared</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { BuyerPortalLogin, BuyerPortalHome };
