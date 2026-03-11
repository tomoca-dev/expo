import React, { useMemo, useState } from 'react';
import { useApp } from '../App';
import { useNavigate } from 'react-router-dom';
import { ShipmentStatus, RiskLevel, Buyer } from '../types';

const ShipmentList: React.FC = () => {
  const { state, addShipment } = useApp();
  const navigate = useNavigate();

  const [filter, setFilter] = useState('');
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    return state.shipments.filter(
      (s) =>
        (s.buyerName || '').toLowerCase().includes(filter.toLowerCase()) ||
        (s.id || '').toLowerCase().includes(filter.toLowerCase()) ||
        (s.destination || '').toLowerCase().includes(filter.toLowerCase())
    );
  }, [state.shipments, filter]);

  const selectedBuyer: Buyer | undefined = useMemo(() => {
    return state.buyers.find((b) => b.id === selectedBuyerId);
  }, [state.buyers, selectedBuyerId]);

  const handleInitialize = async () => {
    if (!selectedBuyer) {
      alert('Please select a buyer first.');
      return;
    }

    setCreating(true);

    try {
      const newId = crypto.randomUUID();

      const newShipment = {
        id: newId,
        buyerId: selectedBuyer.id,
        buyerName: selectedBuyer.name,
        destination: selectedBuyer.country || 'TBD',
        value: 0,
        currency: 'USD',
        status: ShipmentStatus.BUYER_REQUEST,
        riskLevel: RiskLevel.HIGH,
        coffeeType: 'Selection Required',
        weight: 0,
        date: new Date().toISOString().split('T')[0],
        margin: 0,
      };

      await addShipment(newShipment as any);
      navigate(`/shipments/${newId}`);
    } catch (error: any) {
      console.error('SHIPMENT CREATE ERROR:', error);
      alert(error?.message || 'Failed to create shipment.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="relative flex-1 max-w-xl group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg
                className="w-4 h-4 text-white/30 group-focus-within:text-[#D4AF37] transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <input
              type="text"
              placeholder="SCAN PROTOCOL: ID, BUYER, OR GEO-TARGET..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-[11px] font-black uppercase tracking-widest text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-[#D4AF37]/50 focus:bg-white/[0.05] transition-all"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <select
              value={selectedBuyerId}
              onChange={(e) => setSelectedBuyerId(e.target.value)}
              className="min-w-[280px] bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-[11px] font-black uppercase tracking-widest text-white outline-none focus:ring-1 focus:ring-[#D4AF37]/50"
            >
              <option value="">Select Buyer</option>
              {state.buyers.map((buyer) => (
                <option key={buyer.id} value={buyer.id} className="bg-[#0A0A0A] text-white">
                  {buyer.name} ({buyer.country})
                </option>
              ))}
            </select>

            <button
              onClick={() => void handleInitialize()}
              disabled={creating || !selectedBuyer}
              className="bg-[#D4AF37] text-black px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(212,175,55,0.2)] hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100"
            >
              {creating ? 'Creating...' : 'Initialize Request'}
            </button>
          </div>
        </div>

        {state.buyers.length === 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
            <p className="text-[10px] font-black text-yellow-400 uppercase tracking-[0.2em]">
              No buyers found. Create a buyer first before creating a shipment.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-6 border-b border-white/5">Signal ID</th>
                <th className="px-8 py-6 border-b border-white/5">Counterparty</th>
                <th className="px-8 py-6 border-b border-white/5">Destination</th>
                <th className="px-8 py-6 border-b border-white/5">Origin/Type</th>
                <th className="px-8 py-6 border-b border-white/5">Status</th>
                <th className="px-8 py-6 border-b border-white/5 text-right">Value</th>
                <th className="px-8 py-6 border-b border-white/5 text-center">Risk Vector</th>
                <th className="px-8 py-6 border-b border-white/5"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {filtered.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-white/[0.04] transition-all group">
                  <td className="px-8 py-6 font-mono font-black text-[#D4AF37] tracking-wider">
                    {shipment.id}
                  </td>
                  <td className="px-8 py-6 font-bold text-white/90">{shipment.buyerName}</td>
                  <td className="px-8 py-6 text-white/50 text-xs font-bold uppercase tracking-wide">
                    {shipment.destination}
                  </td>
                  <td className="px-8 py-6 text-white/40 text-[10px] font-black uppercase tracking-widest">
                    {shipment.coffeeType}
                  </td>
                  <td className="px-8 py-6">
                    <span
                      className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap ${
                        shipment.status === 'In Transit'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : shipment.status === 'Processing'
                          ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                          : shipment.status === 'Shipment Closed'
                          ? 'bg-white/5 text-white/40 border-white/10'
                          : 'bg-green-500/10 text-green-500 border-green-500/20'
                      }`}
                    >
                      {shipment.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 font-black text-white/90 text-right font-mono tracking-tighter text-sm">
                    ${Number(shipment.value || 0).toLocaleString()}
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${
                          shipment.riskLevel === 'Low'
                            ? 'text-green-500 bg-green-500'
                            : shipment.riskLevel === 'Medium'
                            ? 'text-yellow-500 bg-yellow-500'
                            : 'text-red-500 bg-red-500'
                        }`}
                      ></span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                        {shipment.riskLevel}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <button
                      onClick={() => navigate(`/shipments/${shipment.id}`)}
                      className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-[#D4AF37] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
              <div className="p-6 rounded-full bg-white/5 text-white/20">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <p className="text-sm font-black text-white/20 uppercase tracking-[0.3em]">
                No matching telemetry found
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShipmentList;