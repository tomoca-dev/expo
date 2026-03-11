
import React, { useState } from 'react';
import { useApp } from '../App';
import { useNavigate } from 'react-router-dom';
import { getAIBuyerRiskAdvisory } from '../geminiService';

const BuyersHub: React.FC = () => {
    const { state, addBuyer } = useApp();
    const navigate = useNavigate();
    const [advisory, setAdvisory] = useState<string | null>(null);
    const [selectedBuyer, setSelectedBuyer] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    
    const [newBuyerName, setNewBuyerName] = useState('');
    const [newBuyerCountry, setNewBuyerCountry] = useState('');

    const handleAdvisory = async (buyer: any) => {
        setSelectedBuyer(buyer.name);
        setAdvisory("SYNCHRONIZING WITH GLOBAL RISK DATABASE...");
        const res = await getAIBuyerRiskAdvisory(buyer);
        setAdvisory(res);
    };

    const handleRegisterEntity = async () => {
        if (!newBuyerName || !newBuyerCountry) return;
        
        const newId = crypto.randomUUID();
        const newBuyer = {
            id: newId,
            name: newBuyerName.toUpperCase(),
            country: newBuyerCountry,
            totalRevenue: 0,
            shipmentCount: 0,
            riskScore: 30,
            lastContact: new Date().toISOString().split('T')[0]
        };
        await addBuyer(newBuyer);
        setShowModal(false);
        setNewBuyerName('');
        setNewBuyerCountry('');
    };

    const filteredBuyers = state.buyers.filter(b => 
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        b.country.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div>
                   <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Entity Network</h2>
                   <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.3em] mt-1">Verified Counterparty Database</p>
                </div>
                
                <div className="flex flex-1 max-w-2xl gap-4">
                    <div className="relative flex-1">
                        <input 
                            type="text" 
                            placeholder="FILTER NETWORK NODES..."
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-12 py-4 text-[11px] font-black uppercase tracking-widest text-white placeholder-white/20 outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <button 
                        onClick={() => setShowModal(true)}
                        className="bg-[#D4AF37] text-black px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(212,175,55,0.2)] hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                    >
                        Register New Entity
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                {filteredBuyers.map(buyer => (
                    <div key={buyer.id} className="relative bg-white/[0.02] backdrop-blur-md border border-white/10 p-10 rounded-[40px] overflow-hidden group hover:bg-white/[0.05] transition-all duration-500">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] opacity-[0.02] blur-3xl -mr-16 -mt-16"></div>
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h4 className="text-xl font-black text-white tracking-tighter uppercase group-hover:text-[#D4AF37] transition-colors">{buyer.name}</h4>
                                <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.3em] mt-1">{buyer.country}</p>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                buyer.riskScore < 20 ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                                buyer.riskScore < 40 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                            }`}>
                                Vector: {buyer.riskScore}
                            </div>
                        </div>
                        <div className="space-y-4 mb-10">
                            <div className="flex justify-between items-center group/item">
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Aggregate Revenue</span>
                                <span className="text-sm font-black text-white/90 group-hover/item:text-[#D4AF37] transition-colors font-mono">${buyer.totalRevenue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center group/item">
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Shipment Nodes</span>
                                <span className="text-sm font-black text-white/90 group-hover/item:text-[#D4AF37] transition-colors font-mono">{buyer.shipmentCount}</span>
                            </div>
                            <div className="flex justify-between items-center group/item">
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Last Interface</span>
                                <span className="text-sm font-black text-white/50 group-hover/item:text-[#D4AF37] transition-colors font-mono">{buyer.lastContact.replace(/-/g, '.')}</span>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => navigate(`/buyers/${buyer.id}`)}
                                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest border border-white/10 bg-white/5 text-white/60 rounded-2xl hover:bg-white/10 hover:text-white transition-all"
                            >
                                Entity Profile
                            </button>
                            <button 
                                onClick={() => handleAdvisory(buyer)}
                                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest bg-[#D4AF37] text-black rounded-2xl shadow-[0_10px_30px_rgba(212,175,55,0.2)] hover:scale-[1.05] active:scale-95 transition-all"
                            >
                                AI Advisory
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {advisory && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-black border-2 border-[#D4AF37]/30 p-12 rounded-[56px] shadow-2xl relative overflow-hidden max-w-4xl w-full">
                        <button onClick={() => setAdvisory(null)} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h3 className="text-2xl font-black text-white uppercase mb-8">Strategic Advisory: {selectedBuyer}</h3>
                        <div className="text-white/80 leading-relaxed italic font-medium text-lg bg-white/[0.02] p-10 rounded-[32px] border border-white/5 whitespace-pre-wrap">
                            "{advisory}"
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-[#1A0F0A] border border-[#D4AF37]/30 p-12 rounded-[48px] shadow-2xl relative max-w-lg w-full">
                        <div className="flex flex-col items-center mb-10 text-center">
                            <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-3xl flex items-center justify-center mb-6 border border-[#D4AF37]/30">
                                <svg className="w-8 h-8 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Register New Entity</h3>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-2">Initialize counterparty node in the global registry</p>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest ml-4">Legal Name</label>
                                <input 
                                    type="text" 
                                    placeholder="ENTITY IDENTIFIER..."
                                    className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-[#D4AF37] transition-all"
                                    value={newBuyerName}
                                    onChange={(e) => setNewBuyerName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest ml-4">Jurisdiction / Region</label>
                                <input 
                                    type="text" 
                                    placeholder="COUNTRY PROTOCOL..."
                                    className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-[#D4AF37] transition-all"
                                    value={newBuyerCountry}
                                    onChange={(e) => setNewBuyerCountry(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="mt-12 flex gap-4">
                            <button 
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-5 bg-white/5 border border-white/10 text-white/40 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-white transition-all"
                            >
                                Abort
                            </button>
                            <button 
                                onClick={handleRegisterEntity}
                                className="flex-[2] py-5 bg-[#D4AF37] text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#D4AF37]/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                Deploy Entity Node
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BuyersHub;
