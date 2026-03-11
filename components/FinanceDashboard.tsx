
import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../App';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { generateFinancialReport } from '../geminiService';
import { supabase } from '../supabaseClient';

const FinanceDashboard: React.FC = () => {
  const { state, convert, refreshExchangeRates } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    const run = async () => {
      if (!supabase) return;
      const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('PAYMENTS LOAD ERROR', error);
        setPayments([]);
        return;
      }
      setPayments(data ?? []);
    };
    run();
  }, []);

  const { totalExposure, pendingPayments, exposureByCurrency, openCount } = useMemo(() => {
    if (supabase && payments.length) {
      const exposureByCurrency: Record<string, number> = {};
      let total = 0;
      let open = 0;
      for (const p of payments) {
        const due = Number(p.amount_due ?? 0);
        const paid = Number(p.amount_paid ?? 0);
        const remaining = Math.max(0, due - paid);
        const cur = (p.currency ?? 'USD').toUpperCase();
        exposureByCurrency[cur] = (exposureByCurrency[cur] ?? 0) + remaining;
        total += remaining;
        if ((p.status ?? '').toLowerCase() !== 'paid' && remaining > 0) open += 1;
      }
      return { totalExposure: total, pendingPayments: total, exposureByCurrency, openCount: open };
    }

    const total = state.shipments.filter(s => s.status !== 'Shipment Closed').reduce((acc, curr) => acc + curr.value, 0);
    return {
      totalExposure: total,
      pendingPayments: total * 0.45,
      exposureByCurrency: { USD: total * 0.8, EUR: total * 0.15, ETB: total * 0.05 },
      openCount: state.shipments.filter(s => s.status !== 'Shipment Closed').length,
    };
  }, [payments, state.shipments]);

  const data = Object.entries(exposureByCurrency).map(([name, value]) => ({ name, value }));

  const CHART_COLORS = ['#D4AF37', '#FFB800', '#F59E0B'];

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setAiReport(null);
    try {
      const consolidatedData = {
        totalExposure,
        pendingPayments,
        rates: state.exchangeRates,
        activeShipments: state.shipments.filter(s => s.status !== 'Shipment Closed').map(s => ({
          id: s.id,
          value: s.value,
          status: s.status,
          buyer: s.buyerName
        }))
      };
      const report = await generateFinancialReport(consolidatedData);
      setAiReport(report);
    } catch (error) {
      setAiReport("FATAL: AGENT DEPLOYMENT FAILED. PROTOCOL INTERRUPTED.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const StatCard = ({ title, value, sub, statusColor = "text-[#D4AF37]" }: any) => (
    <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 p-8 rounded-[32px] overflow-hidden relative group hover:bg-white/[0.04] transition-all">
       <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-10 group-hover:opacity-30"></div>
       <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-3">{title}</p>
       <h3 className={`text-3xl font-black tracking-tighter ${statusColor}`}>{value}</h3>
       <p className="text-[11px] font-bold text-white/20 uppercase tracking-widest mt-4 flex items-center gap-2">
          <span className="w-1 h-1 bg-current rounded-full"></span>
          {sub}
       </p>
    </div>
  );

  const handleRefreshRates = async () => {
    setIsRefreshing(true);
    await refreshExchangeRates();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const convExposure = convert(totalExposure);
  const convPending = convert(pendingPayments);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
          <div>
             <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Financial Ledger</h2>
             <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.4em] mt-1">Global Credit & FX Telemetry</p>
          </div>
          <button 
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            className={`group relative px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] overflow-hidden transition-all flex items-center gap-3 ${
              isGeneratingReport 
              ? 'bg-white/10 text-white/30 cursor-wait' 
              : 'bg-black border border-[#D4AF37]/50 text-[#D4AF37] hover:border-[#D4AF37] hover:shadow-[0_0_20px_rgba(212,175,55,0.2)]'
            }`}
          >
             <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             {isGeneratingReport ? (
               <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full animate-ping"></span>
                  Synthesizing Report...
               </span>
             ) : (
               <>
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                 </svg>
                 AI Financial Synthesis
               </>
             )}
          </button>
       </div>

       {aiReport && (
         <div className="bg-[#1A0F0A] border border-[#D4AF37]/30 p-10 rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-500 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] opacity-[0.02] blur-3xl -mr-16 -mt-16"></div>
            <button onClick={() => setAiReport(null)} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="flex items-center gap-4 mb-8">
               <div className="w-1.5 h-6 bg-[#D4AF37] rounded-full"></div>
               <h4 className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.4em]">Strategic CFO Intelligence Output</h4>
            </div>
            <div className="font-mono text-sm text-white/80 leading-relaxed bg-white/[0.02] p-8 rounded-3xl border border-white/5 whitespace-pre-wrap">
               {aiReport}
            </div>
            <div className="mt-8 flex justify-end">
               <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.5em]">Digital Signature: CFO-AI-V4.2.0</span>
            </div>
         </div>
       )}

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Total FX Exposure" 
            value={`${convExposure.symbol}${convExposure.value.toLocaleString()}`} 
            sub={`Cross-currency aggregate (${convExposure.code})`} 
          />
          <StatCard 
            title="Realized Performance" 
            value="+$0" 
            sub="Efficiency: 0.0%" 
            statusColor="text-[#10B981]" 
          />
          <StatCard 
            title="Active Receivables" 
            value={`${convPending.symbol}${convPending.value.toLocaleString()}`} 
            sub={`${openCount} pending settlements`} 
            statusColor="text-orange-500" 
          />
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white/[0.02] backdrop-blur-sm border border-white/5 p-10 rounded-[40px]">
             <div className="flex justify-between items-center mb-10">
                <h4 className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.3em]">Currency Distribution Map</h4>
                <div className="text-[10px] font-black text-white/30 uppercase">Base: USD</div>
             </div>
             <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie data={data} innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none">
                         {data.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                         ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{backgroundColor: '#0F0906', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '16px', fontSize: '10px', fontWeight: 900}}
                        itemStyle={{color: '#D4AF37'}}
                        formatter={(val: number) => [`$${val.toLocaleString()}`, 'Exposure']}
                      />
                   </PieChart>
                </ResponsiveContainer>
             </div>
             <div className="flex justify-center gap-10 mt-8">
                {data.map((d, i) => (
                   <div key={d.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]" style={{ color: CHART_COLORS[i], backgroundColor: CHART_COLORS[i] }}></div>
                      <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{d.name}</span>
                   </div>
                ))}
             </div>
          </div>

          <div className="bg-white/[0.02] backdrop-blur-sm border border-white/5 p-10 rounded-[40px] flex flex-col">
             <h4 className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.3em] mb-8">Exchange Terminal</h4>
             <div className="space-y-4 flex-1">
                <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">Market Sync Protocols (1 USD Base)</p>
                    <div className="space-y-3">
                        {Object.entries(state.exchangeRates).filter(([k]) => k !== 'USD').map(([code, rate]) => (
                            <div key={code} className="flex justify-between items-center">
                                <span className="text-xs font-black text-white/80">{code}</span>
                                <span className="font-mono text-xs font-black text-[#D4AF37]">{(rate as number).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mt-6 mb-4">Impending Settlements</h4>
                {state.shipments.filter(s => s.status !== 'Shipment Closed').length > 0 ? (
                  state.shipments.filter(s => s.status !== 'Shipment Closed').slice(0, 3).map((item, idx) => {
                   const conv = convert(item.value);
                   return (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.06] transition-all group cursor-pointer">
                        <div>
                            <p className="text-[10px] font-black text-white/90 uppercase tracking-widest group-hover:text-[#D4AF37] transition-colors">{item.buyerName}</p>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1">Due: {item.date}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-black text-white font-mono tracking-tighter">{conv.symbol}{conv.value.toLocaleString()}</p>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${item.riskLevel === 'High' ? 'text-red-500' : 'text-green-500'} flex items-center justify-end gap-1 mt-1`}>
                            {item.riskLevel} Risk
                            </span>
                        </div>
                    </div>
                   );
                  })
                ) : (
                  <div className="p-8 text-center border border-white/5 rounded-2xl bg-white/[0.02]">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">No Active Settlements</p>
                  </div>
                )}
             </div>
             <button 
                onClick={handleRefreshRates}
                disabled={isRefreshing}
                className={`w-full mt-10 py-5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${
                    isRefreshing 
                    ? 'bg-white/10 text-white/40' 
                    : 'bg-white/[0.05] text-white/80 hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37] hover:shadow-[0_10px_30px_rgba(212,175,55,0.2)]'
                }`}
             >
                {isRefreshing ? <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span> : null}
                {isRefreshing ? 'SYNCING PROTOCOLS' : 'Execute Liquidity Sync'}
             </button>
          </div>
       </div>
    </div>
  );
};

export default FinanceDashboard;
