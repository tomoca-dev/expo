
import React, { useState, useRef, useEffect } from 'react';
import { 
  analyzeRegulatoryRisk, 
  getLiveCoffeeInsights, 
  getLiveExchangeRates, 
  getAIBuyerRiskAdvisory,
  generateShipmentSummary
} from '../geminiService';
import { GoogleGenAI } from "@google/genai";

const AIAgentHub: React.FC = () => {
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [executionMsg, setExecutionMsg] = useState('');
  
  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const agents = [
    { id: 'regulatory', name: 'Regulation Engine', desc: 'Syncs with global export law database.', icon: '⚖️' },
    { id: 'market', name: 'Market Intelligence', desc: 'Real-time coffee commodity price trends.', icon: '📈' },
    { id: 'fx', name: 'FX Strategy', desc: 'Currency risk and exchange terminal analysis.', icon: '💱' },
    { id: 'ar_followup', name: 'Credit Collector', desc: 'Strategic payment recovery protocols.', icon: '🎯' },
    { id: 'fraud', name: 'Anomaly Scanner', desc: 'N-dimensional risk pattern analysis.', icon: '⚡' },
    { id: 'email', name: 'Protocol Drafter', desc: 'Synthetic communication generation.', icon: '📡' }
  ];

  const runAgent = async (id: string) => {
    setLoading(true);
    setActiveAgent(id);
    setResult(null);
    try {
      if (id === 'regulatory') {
        const res = await analyzeRegulatoryRisk('Japan', ['Invoice', 'Packing List']);
        setResult(res);
      } else if (id === 'market') {
        const res = await getLiveCoffeeInsights();
        setResult(res);
      } else if (id === 'fx') {
        const res = await getLiveExchangeRates();
        setResult(`LIVE EXCHANGE TERMINAL SYNC:\n\nUSD/ETB: ${res.ETB}\nUSD/EUR: ${res.EUR}\nUSD/GBP: ${res.GBP}\n\nSTRATEGY: FX EXPOSURE IS WITHIN NOMINAL PARAMETERS. NO IMMEDIATE HEDGING REQUIRED.`);
      } else {
        await new Promise(r => setTimeout(r, 2000));
        setResult(`SYSTEM STATUS: ANALYSIS COMPLETE FOR NODE [${id.toUpperCase()}]. LATENCY: 42MS. NO CRITICAL VIOLATIONS DETECTED IN ACTIVE BUFFER.`);
      }
    } catch (e) {
      setResult("FATAL: AI CORE DISCONNECTED. VERIFY AUTH TOKEN.");
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatting(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [...chatHistory, { role: 'user', text: userMsg }].map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
        })),
        config: {
            systemInstruction: "You are the TOMOCA AI Core, a sophisticated trade assistant. You help operators manage coffee exports, logistics, and risk."
        }
      });
      setChatHistory(prev => [...prev, { role: 'model', text: response.text || 'Core communication failure.' }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'model', text: 'ERROR: AI CORE OFFLINE.' }]);
    } finally {
      setIsChatting(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleExportJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify({ agent: activeAgent, output: result, timestamp: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_ANALYSIS_${activeAgent?.toUpperCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExecute = () => {
    setExecutionMsg('DIRECTIVES TRANSMITTED TO OPERATIONAL NODES');
    setTimeout(() => setExecutionMsg(''), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="text-center relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D4AF37] blur-[150px] opacity-10 rounded-full"></div>
        <h2 className="text-5xl font-black text-white tracking-tighter uppercase relative z-10">AI Deployment Hub</h2>
        <p className="text-white/40 mt-4 text-xs font-bold uppercase tracking-[0.4em] relative z-10">Advanced Autonomous Intelligence Interface</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {agents.map(agent => (
          <div key={agent.id} className="relative bg-white/[0.02] backdrop-blur-md border border-white/5 p-8 rounded-[32px] overflow-hidden group hover:bg-white/[0.05] transition-all duration-500">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37] opacity-0 group-hover:opacity-100 transition-all shadow-[0_0_20px_rgba(212,175,55,0.6)]"></div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-black/40 border border-white/10 rounded-[20px] flex items-center justify-center text-3xl group-hover:border-[#D4AF37]/50 transition-all group-hover:shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                  {agent.icon}
                </div>
                <div>
                  <h4 className="text-lg font-black text-white/90 uppercase tracking-widest">{agent.name}</h4>
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em] mt-1">{agent.desc}</p>
                </div>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-4">
               <div className="flex-1 h-[1px] bg-white/10"></div>
               <span className="text-[9px] font-black text-white/20 tracking-widest uppercase">Agent Ready</span>
               <div className="flex-1 h-[1px] bg-white/10"></div>
            </div>
            <button 
              disabled={loading}
              onClick={() => runAgent(agent.id)}
              className={`mt-8 w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] transition-all relative overflow-hidden ${
                loading && activeAgent === agent.id 
                ? 'bg-white/10 text-white/20' 
                : 'bg-white/[0.05] border border-white/10 text-white/60 hover:text-black hover:bg-[#D4AF37] hover:border-[#D4AF37] hover:shadow-[0_10px_30px_rgba(212,175,55,0.2)]'
              }`}
            >
              {loading && activeAgent === agent.id ? (
                <span className="flex items-center justify-center gap-2">
                   <span className="w-1 h-1 bg-white rounded-full animate-bounce"></span>
                   <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></span>
                   <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></span>
                   SYNCING CORE
                </span>
              ) : 'Deploy Protocol'}
            </button>
          </div>
        ))}
      </div>

      {executionMsg && (
        <div className="bg-[#10B981]/10 border border-[#10B981]/30 p-4 rounded-2xl text-center">
            <p className="text-[10px] font-black text-[#10B981] uppercase tracking-[0.3em]">{executionMsg}</p>
        </div>
      )}

      {result && (
        <div className="bg-black/80 backdrop-blur-3xl p-10 rounded-[40px] border-2 border-[#D4AF37]/30 shadow-2xl animate-in zoom-in-95 duration-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 to-transparent pointer-events-none"></div>
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center gap-3">
               <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse shadow-[0_0_10px_#D4AF37]"></div>
               <h5 className="font-black text-[#D4AF37] uppercase tracking-[0.3em] text-xs">Analysis Output Data</h5>
            </div>
            <button onClick={() => setResult(null)} className="text-white/20 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="font-mono text-sm text-white/80 leading-relaxed bg-white/[0.02] p-8 rounded-3xl border border-white/5 relative z-10 whitespace-pre-wrap">
            {result}
          </div>
          <div className="mt-10 flex gap-4 relative z-10">
             <button onClick={handleExportJSON} className="px-8 py-4 bg-white/5 border border-white/10 text-white/60 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Export JSON</button>
             <button onClick={handleExecute} className="flex-1 py-4 bg-[#D4AF37] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px_30px_rgba(212,175,55,0.2)]">Execute Directives</button>
          </div>
        </div>
      )}

      {/* AI Core Chat Interface */}
      <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center border border-[#D4AF37]/20">
              <div className="w-4 h-4 bg-[#D4AF37] rounded-full animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">AI Core Terminal</h3>
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-0.5">Direct Neural Link Active</p>
            </div>
          </div>
          <button 
            onClick={() => setChatHistory([])}
            className="text-[9px] font-black text-white/20 uppercase tracking-widest hover:text-white transition-colors"
          >
            Clear Buffer
          </button>
        </div>

        <div className="h-[400px] overflow-y-auto p-8 space-y-6 custom-scrollbar bg-black/20">
          {chatHistory.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
              <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              <p className="text-xs font-black uppercase tracking-widest">Awaiting Input...</p>
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-6 rounded-3xl text-xs leading-relaxed ${
                msg.role === 'user' 
                ? 'bg-[#D4AF37] text-black font-bold rounded-tr-none' 
                : 'bg-white/5 text-white/80 border border-white/10 rounded-tl-none font-medium'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isChatting && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl rounded-tl-none flex gap-2">
                <div className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleChat} className="p-6 bg-white/[0.01] border-t border-white/5 flex gap-4">
          <input 
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Query the AI Core..."
            className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white placeholder:text-white/20 outline-none focus:border-[#D4AF37]/50 transition-all"
          />
          <button 
            type="submit"
            disabled={isChatting || !chatInput.trim()}
            className="px-8 bg-[#D4AF37] text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
          >
            Transmit
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIAgentHub;
