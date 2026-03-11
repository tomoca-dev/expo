
import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../App';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { getLiveCoffeeInsights } from '../geminiService';
import { ShipmentStatus, RiskLevel } from '../types';

const Dashboard: React.FC = () => {
  const { state, convert, addShipment, addBuyer } = useApp();
  const navigate = useNavigate();
  const [insights, setInsights] = useState('READY FOR SYSTEM DEPLOYMENT. MANUAL AUTHORIZATION REQUIRED.');
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<'D' | 'W' | 'M' | 'Y'>('M');

  const fetchInsights = async () => {
    setIsInsightLoading(true);
    setInsights('INITIATING CORE SYNCHRONIZATION... ACCESSING MARKET TELEMETRY...');
    try {
      const res = await getLiveCoffeeInsights();
      setInsights(res);
    } catch (e) {
      setInsights('OFFLINE: MARKET DATA UNREACHABLE. CORE DISCONNECTED.');
    } finally {
      setIsInsightLoading(false);
    }
  };

  const handleNewShipment = () => {
    const newId = `SHP-${Math.floor(1000 + Math.random() * 9000)}`;
    const newShipment = {
      id: newId,
      buyerName: 'NEW PROSPECTIVE BUYER',
      destination: 'TBD',
      value: 0,
      currency: 'USD',
      status: ShipmentStatus.BUYER_REQUEST,
      riskLevel: RiskLevel.HIGH,
      coffeeType: 'Selection Required',
      weight: 0,
      date: new Date().toISOString().split('T')[0],
      margin: 0
    };
    addShipment(newShipment);
    navigate(`/shipments/${newId}`);
  };

  const handleNewBuyer = () => {
    const newId = `BYR-${Math.floor(10 + Math.random() * 89)}`;
    const newBuyer = {
      id: newId,
      name: 'NEW ENTITY',
      country: 'PENDING',
      totalRevenue: 0,
      shipmentCount: 0,
      riskScore: 0,
      lastContact: new Date().toISOString().split('T')[0]
    };
    addBuyer(newBuyer);
    navigate('/buyers');
  };

  const totalRevenue = state.shipments.reduce((acc, curr) => acc + curr.value, 0);
  const avgMargin = state.shipments.length > 0 ? state.shipments.reduce((acc, curr) => acc + curr.margin, 0) / state.shipments.length : 0;
  const highRiskCount = state.shipments.filter(s => s.riskLevel === 'High').length;
  const totalVolume = state.shipments.reduce((acc, curr) => acc + (curr.weight || 0), 0) / 1000; // in Tons

  // Dynamic Chart Data based on timeframe
  const chartData = useMemo(() => {
    const base = totalRevenue / 3;
    switch(timeframe) {
      case 'D':
        return [
          { name: '08:00', rev: base * 0.2, target: base * 0.3 },
          { name: '10:00', rev: base * 0.5, target: base * 0.3 },
          { name: '12:00', rev: base * 0.4, target: base * 0.3 },
          { name: '14:00', rev: base * 0.8, target: base * 0.3 },
          { name: '16:00', rev: base * 0.9, target: base * 0.3 },
          { name: '18:00', rev: base * 1.2, target: base * 0.3 },
        ];
      case 'W':
        return [
          { name: 'MON', rev: base * 0.8, target: base * 1.5 },
          { name: 'TUE', rev: base * 1.2, target: base * 1.5 },
          { name: 'WED', rev: base * 1.5, target: base * 1.5 },
          { name: 'THU', rev: base * 1.1, target: base * 1.5 },
          { name: 'FRI', rev: base * 1.9, target: base * 1.5 },
        ];
      case 'Y':
        return [
          { name: '2021', rev: 0, target: 1000000 },
          { name: '2022', rev: 0, target: 1000000 },
          { name: '2023', rev: 0, target: 1200000 },
          { name: '2024', rev: totalRevenue * 4, target: 1200000 },
        ];
      default: // 'M'
        return [
          { name: 'OCT', rev: 0, target: 100000 },
          { name: 'NOV', rev: 0, target: 100000 },
          { name: 'DEC', rev: 0, target: 100000 },
          { name: 'JAN', rev: 0, target: 120000 },
          { name: 'FEB', rev: 0, target: 120000 },
          { name: 'MAR', rev: totalRevenue, target: 120000 },
        ];
    }
  }, [timeframe, totalRevenue]);

  const Card = ({ title, value, sub, color = "text-[#D4AF37]", glow = "rgba(212,175,55,0.3)" }: any) => (
    <div className="group relative bg-white/[0.03] backdrop-blur-md border border-white/10 p-6 rounded-3xl overflow-hidden transition-all hover:bg-white/[0.06] hover:border-[#D4AF37]/40 hover:-translate-y-1">
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] -mr-8 -mt-8 rounded-full transition-all group-hover:scale-110"></div>
      <div className="relative z-10">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2">{title}</p>
        <h3 className={`text-3xl font-black tracking-tighter ${color} drop-shadow-[0_0_12px_${glow}]`}>{value}</h3>
        <p className="text-[11px] font-medium text-white/60 mt-3 flex items-center gap-1.5 uppercase tracking-wider">
           <span className="w-1 h-1 bg-current rounded-full"></span>
           {sub}
        </p>
      </div>
    </div>
  );

  const convertedRevenue = convert(totalRevenue);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val = convert(payload[0].value);
      return (
        <div className="bg-[#0A0A0A]/90 backdrop-blur-xl border border-[#D4AF37]/30 p-4 rounded-2xl shadow-2xl">
          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">{label} SESSION</p>
          <p className="text-lg font-black text-[#D4AF37] tracking-tighter">
            {val.symbol}{val.value.toLocaleString()}
          </p>
          <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between gap-4">
             <span className="text-[8px] font-black text-white/40 uppercase">Delta:</span>
             <span className="text-[8px] font-black text-[#10B981]">+12.4%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Quick Action Command Center */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
         <button 
            onClick={handleNewShipment}
            className="group relative h-24 bg-black border border-[#D4AF37]/30 rounded-[32px] flex items-center justify-between px-10 overflow-hidden transition-all hover:border-[#D4AF37] hover:shadow-[0_0_20px_rgba(212,175,55,0.1)] active:scale-95"
         >
            <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/5 to-transparent"></div>
            <div className="relative z-10">
               <h4 className="text-sm font-black text-[#D4AF37] uppercase tracking-[0.2em]">Initialize Shipment</h4>
               <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-1">Deploy New Logistics Node</p>
            </div>
            <div className="relative z-10 w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center group-hover:scale-110 transition-transform">
               <svg className="w-5 h-5 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
               </svg>
            </div>
         </button>

         <button 
            onClick={handleNewBuyer}
            className="group relative h-24 bg-black border border-white/10 rounded-[32px] flex items-center justify-between px-10 overflow-hidden transition-all hover:border-white/30 hover:bg-white/5 active:scale-95"
         >
            <div className="relative z-10">
               <h4 className="text-sm font-black text-white/90 uppercase tracking-[0.2em]">Register Entity</h4>
               <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-1">Onboard New Counterparty</p>
            </div>
            <div className="relative z-10 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
               <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
               </svg>
            </div>
         </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
            title="Quarterly Revenue" 
            value={`${convertedRevenue.symbol}${convertedRevenue.value > 1000000 ? (convertedRevenue.value/1000000).toFixed(2) + 'M' : (convertedRevenue.value/1000).toFixed(1) + 'K'}`} 
            sub={`↑ 0.0% vs last period (${convertedRevenue.code})`} 
        />
        <Card title="Aggregated Margin" value={`${avgMargin.toFixed(1)}%`} sub="Target: 18.0% Benchmark" />
        <Card 
          title="Critical Alerts" 
          value={highRiskCount} 
          sub="Urgent intervention required" 
          color="text-red-500" 
          glow="rgba(239,68,68,0.3)" 
        />
        <Card title="Export Volume" value={`${totalVolume.toFixed(1)}T`} sub="Direct Trade Logistics" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Enhanced Area Chart */}
        <div className="lg:col-span-2 bg-white/[0.02] backdrop-blur-sm border border-white/5 p-8 rounded-[32px] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37] opacity-[0.01] blur-[120px] rounded-full -mr-32 -mt-32"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4 relative z-10">
            <div>
              <h4 className="text-lg font-black tracking-tight text-white/90">FINANCIAL VELOCITY</h4>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mt-1">Global Revenue Streams • {state.displayCurrency}</p>
            </div>
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 backdrop-blur-md">
               {(['D', 'W', 'M', 'Y'] as const).map(t => (
                 <button 
                  key={t} 
                  onClick={() => setTimeframe(t)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-black tracking-widest transition-all ${timeframe === t ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
                 >
                   {t}
                 </button>
               ))}
            </div>
          </div>

          <div className="h-80 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  vertical={false} 
                  stroke="rgba(255,255,255,0.03)" 
                />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 900}} 
                  dy={15} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 900}}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="rev" 
                  stroke="#D4AF37" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#areaGrad)" 
                  animationDuration={1500}
                  activeDot={{ r: 6, stroke: '#D4AF37', strokeWidth: 2, fill: '#0F0906' }}
                />
                {/* Visual Target Reference */}
                <Area 
                  type="monotone" 
                  dataKey="target" 
                  stroke="rgba(255,255,255,0.05)" 
                  strokeWidth={1} 
                  strokeDasharray="5 5"
                  fill="transparent"
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights Card */}
        <div className="bg-gradient-to-br from-[#1A0F0A] to-[#0A0A0A] border border-[#D4AF37]/20 p-8 rounded-[32px] shadow-2xl relative overflow-hidden flex flex-col group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D4AF37] via-transparent to-[#D4AF37] opacity-50"></div>
          <div className="flex items-center space-x-3 mb-6">
             <div className="p-2.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                <svg className={`w-5 h-5 text-[#D4AF37] ${isInsightLoading ? 'animate-spin' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                   <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 11a1 1 0 112 0v2a1 1 0 11-2 0v-2zm1-7a1 1 0 110 2 1 1 0 010-2z" />
                </svg>
             </div>
             <div>
                <h4 className="font-black text-sm tracking-widest text-[#D4AF37] uppercase">AI Oracle</h4>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Predictive Logic v4.2</p>
             </div>
          </div>
          <div className="relative flex-1">
            <div className="absolute inset-0 bg-white/[0.01] pointer-events-none rounded-xl"></div>
            <p className="text-sm text-white/80 leading-relaxed italic font-medium p-4 border-l border-[#D4AF37]/30">
              "{insights}"
            </p>
          </div>
          <button 
            onClick={fetchInsights}
            disabled={isInsightLoading}
            className={`mt-8 w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(212,175,55,0.2)] hover:scale-[1.02] active:scale-95 transition-all ${
              isInsightLoading ? 'bg-white/5 text-white/20 border border-white/10' : 'bg-[#D4AF37] text-black'
            }`}
          >
            {isInsightLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                SYNCHRONIZING...
              </span>
            ) : 'Unlock Market Synthesis'}
          </button>
        </div>
      </div>

      {/* Futuristic Recent Activity Table */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-sm">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
          <div>
            <h4 className="text-sm font-black text-white/90 uppercase tracking-[0.2em]">Operational Pulse</h4>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Live Shipment Terminal</p>
          </div>
          <button 
            onClick={() => navigate('/shipments')}
            className="text-[#D4AF37] text-[10px] font-black tracking-widest uppercase py-2 px-4 border border-[#D4AF37]/30 rounded-full hover:bg-[#D4AF37]/10 transition-all"
          >
            Full Archives
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] text-[10px] text-white/30 uppercase tracking-[0.2em] font-black">
              <tr>
                <th className="px-8 py-5">Node ID</th>
                <th className="px-8 py-5">Recipient</th>
                <th className="px-8 py-5">Target Region</th>
                <th className="px-8 py-5 text-right">Credit Value ({state.displayCurrency})</th>
                <th className="px-8 py-5 text-center">Lifecycle Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-bold">
              {state.shipments.slice(0, 5).map(s => {
                const conv = convert(s.value);
                return (
                    <tr key={s.id} onClick={() => navigate(`/shipments/${s.id}`)} className="hover:bg-white/[0.03] transition-all group cursor-pointer">
                    <td className="px-8 py-6 font-mono text-[#D4AF37]">{s.id}</td>
                    <td className="px-8 py-6 text-white/90">{s.buyerName}</td>
                    <td className="px-8 py-6 text-white/50">{s.destination}</td>
                    <td className="px-8 py-6 text-right text-white/90">{conv.symbol}{conv.value.toLocaleString()}</td>
                    <td className="px-8 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest border ${
                        s.status === 'Delivered' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                        {s.status}
                        </span>
                    </td>
                    </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
