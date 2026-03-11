
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { getAIBuyerRiskAdvisory } from '../geminiService';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Document } from '../types';
import { generatePortalCode } from '../intelligence';

const BuyerProfile: React.FC = () => {
    const { id } = useParams();
    const { state, convert, updateBuyer, deleteBuyer } = useApp();
    const navigate = useNavigate();
    const [advisory, setAdvisory] = useState<string | null>(null);
    const [isAdvisoryLoading, setIsAdvisoryLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

    const handleDownload = (doc: Document) => {
        const content = `
TOMOCA EXPORT SYSTEMS - SECURE ASSET RETRIEVAL
----------------------------------------------
PROTOCOL ID: ${doc.id}
ASSET NAME: ${doc.name}
TYPE: ${doc.type}
STATUS: ${doc.status}
SYNC DATE: ${doc.date}
LINKED NODE: ${doc.shipmentId || 'MASTER'}
----------------------------------------------
This is a simulated secure asset retrieval from the ERM Vault.
        `.trim();
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.name.replace(/\s+/g, '_')}_ARCHIVE.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const buyer = state.buyers.find(b => b.id === id);
    const buyerShipments = state.shipments.filter(s => s.buyerName.toLowerCase() === buyer?.name.toLowerCase());

    const [editName, setEditName] = useState(buyer?.name || '');
    const [editCountry, setEditCountry] = useState(buyer?.country || '');
    const [editRisk, setEditRisk] = useState(buyer?.riskScore || 0);

    if (!buyer) return <div className="p-20 text-center font-black uppercase tracking-widest text-white/20">Buyer Node Not Found</div>;

    const handleAdvisory = async () => {
        setIsAdvisoryLoading(true);
        setAdvisory("SYNCHRONIZING WITH GLOBAL RISK DATABASE...");
        try {
            const res = await getAIBuyerRiskAdvisory(buyer);
            setAdvisory(res);
        } catch (e) {
            setAdvisory("ERROR: RISK ADVISORY UNAVAILABLE.");
        } finally {
            setIsAdvisoryLoading(false);
        }
    };

    const handleSaveChanges = async () => {
        const updated = {
            ...buyer,
            name: editName.toUpperCase(),
            country: editCountry,
            riskScore: Number(editRisk)
        };
        await updateBuyer(updated);
        setIsEditMode(false);
    };

    const handleGeneratePortal = async () => {
        const updated = { ...buyer, portalCode: generatePortalCode(buyer.name) };
        await updateBuyer(updated);
    };

    const handleExecuteDelete = async () => {
        await deleteBuyer(buyer.id);
        navigate('/buyers');
    };

    const convRevenue = convert(buyer.totalRevenue);

    const historicalData = [
        { month: 'OCT', value: buyer.totalRevenue * 0.15 },
        { month: 'NOV', value: buyer.totalRevenue * 0.25 },
        { month: 'DEC', value: buyer.totalRevenue * 0.30 },
        { month: 'JAN', value: buyer.totalRevenue * 0.10 },
        { month: 'FEB', value: buyer.totalRevenue * 0.20 },
    ];

    const MetricCard = ({ label, value, sub, trend = null }: any) => (
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[32px] hover:bg-white/[0.04] transition-all group">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">{label}</p>
            <h3 className="text-3xl font-black text-white tracking-tighter group-hover:text-[#D4AF37] transition-colors">{value}</h3>
            <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{sub}</span>
                {trend !== null && (
                    <span className={`text-[10px] font-black ${trend > 0 ? 'text-[#10B981]' : 'text-red-500'}`}>
                        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </span>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#1A0F0A] border border-red-500/30 p-12 rounded-[48px] max-w-md w-full text-center space-y-8 shadow-2xl">
                        <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Terminate Entity Node?</h3>
                            <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-2">All linked telemetry for {buyer.name} will be detached from the active registry.</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 bg-white/5 text-white/60 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">Abort</button>
                            <button onClick={handleExecuteDelete} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all">Terminate</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                    <button onClick={() => navigate('/buyers')} className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-[#D4AF37] mb-6 flex items-center gap-2 transition-colors">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        Network Overview
                    </button>
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-[28px] flex items-center justify-center overflow-hidden">
                             <img src={`https://picsum.photos/seed/${buyer.id}/120/120`} className="w-full h-full object-cover grayscale opacity-60" alt="" />
                        </div>
                        <div>
                            {isEditMode ? (
                                <input 
                                    className="text-4xl font-black text-white tracking-tighter uppercase bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:ring-1 focus:ring-[#D4AF37]"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                />
                            ) : (
                                <h2 className="text-5xl font-black text-white tracking-tighter uppercase">{buyer.name}</h2>
                            )}
                            <div className="flex items-center gap-4 mt-2">
                                {isEditMode ? (
                                    <input 
                                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[#D4AF37] text-xs font-black uppercase tracking-[0.4em]"
                                        value={editCountry}
                                        onChange={(e) => setEditCountry(e.target.value)}
                                    />
                                ) : (
                                    <p className="text-[#D4AF37] text-xs font-black uppercase tracking-[0.4em]">{buyer.country} • Tier 1 Counterparty</p>
                                )}
                                <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] font-mono">ID: {buyer.id}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    {isEditMode ? (
                        <>
                            <button onClick={() => setIsEditMode(false)} className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">Cancel</button>
                            <button onClick={handleSaveChanges} className="px-8 py-4 bg-[#D4AF37] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#D4AF37]/20 transition-all">Commit Updates</button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setShowDeleteConfirm(true)} className="px-6 py-4 bg-red-500/10 border border-red-500/20 text-red-500/60 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Terminate Node</button>
                            <button onClick={() => setIsEditMode(true)} className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all">Edit Protocol</button>
                            <button 
                                onClick={handleAdvisory}
                                disabled={isAdvisoryLoading}
                                className="px-8 py-4 bg-[#D4AF37] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-[0_10px_20px_rgba(212,175,55,0.2)] hover:scale-105 active:scale-95 transition-all"
                            >
                                {isAdvisoryLoading ? 'Syncing...' : 'Risk Assessment'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Buyer Portal */}
            <div className="bg-black/30 border border-white/10 rounded-[32px] p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <p className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em]">Buyer Portal</p>
                    <p className="text-[11px] text-white/40 font-semibold mt-2">Generate a view-only access code for this buyer.</p>
                    <div className="mt-4 flex items-center gap-3 flex-wrap">
                        <span className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/70 font-mono">
                            {buyer.portalCode ? buyer.portalCode : 'Not generated'}
                        </span>
                        {buyer.portalCode && (
                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Route: /#/buyer/{buyer.portalCode}</span>
                        )}
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleGeneratePortal}
                        className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/10 hover:text-white transition-all"
                    >
                        {buyer.portalCode ? 'Reset Code' : 'Generate Code'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                    label="Lifetime Value" 
                    value={`${convRevenue.symbol}${convRevenue.value.toLocaleString()}`} 
                    sub={`Aggregate in ${convRevenue.code}`}
                    trend={12.4}
                />
                <MetricCard 
                    label="Active Nodes" 
                    value={buyerShipments.filter(s => s.status !== 'Shipment Closed').length} 
                    sub="In-pipeline shipments"
                />
                <MetricCard 
                    label="Risk Score" 
                    value={isEditMode ? (
                        <input 
                            type="number"
                            className="bg-transparent border-b border-[#D4AF37] outline-none w-20 text-3xl font-black text-white"
                            value={editRisk}
                            onChange={(e) => setEditRisk(Number(e.target.value))}
                        />
                    ) : buyer.riskScore} 
                    sub="Composite Vector Analysis"
                    trend={-2.1}
                />
                <MetricCard 
                    label="Contract Yield" 
                    value="16.2%" 
                    sub="Average Margin Rate"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 p-10 rounded-[40px] flex flex-col">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h4 className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.3em]">Revenue Velocity</h4>
                            <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mt-1">Transaction History</p>
                        </div>
                        <div className="flex gap-2">
                            {['6M', '1Y', 'ALL'].map(t => (
                                <button key={t} className={`px-4 py-1.5 rounded-lg text-[9px] font-black border transition-all ${t === '1Y' ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'border-white/10 text-white/40 hover:text-white'}`}>{t}</button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 h-72 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={historicalData}>
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 900}} dy={10} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.02)'}}
                                    contentStyle={{backgroundColor: '#0F0906', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '12px', fontSize: '10px'}}
                                    formatter={(v: any) => [`${convRevenue.symbol}${v.toLocaleString()}`, 'Revenue']}
                                />
                                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={40}>
                                    {historicalData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 2 ? '#D4AF37' : 'rgba(212, 175, 55, 0.2)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 p-10 rounded-[40px] flex flex-col space-y-8">
                    <h4 className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.3em]">Strategic Profile</h4>
                    
                    <div className="space-y-6">
                        <div>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2">Compliance Status</p>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#10B981] w-[88%] shadow-[0_0_10px_#10B981]"></div>
                                </div>
                                <span className="text-xs font-black text-[#10B981]">88%</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2">Payment Reliability</p>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500 w-[65%] shadow-[0_0_10px_#F59E0B]"></div>
                                </div>
                                <span className="text-xs font-black text-yellow-500">65%</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2">Logistics Efficiency</p>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-[#D4AF37] w-[94%] shadow-[0_0_10px_#D4AF37]"></div>
                                </div>
                                <span className="text-xs font-black text-[#D4AF37]">94%</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/5">
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-4">Last Interaction Profile</p>
                        <div className="p-5 bg-white/[0.03] rounded-2xl border border-white/5">
                            <p className="text-[11px] font-bold text-white/80 leading-relaxed italic">
                                "Buyer has requested increased volume for the next Q3 cycle. Credit limit adjustment advised."
                            </p>
                            <div className="mt-4 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black">M</div>
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Operator Note • {buyer.lastContact.replace(/-/g, '.')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden backdrop-blur-sm">
                <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                    <div>
                        <h4 className="text-sm font-black text-white tracking-tighter uppercase">Active Shipment Nodes</h4>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Live Telemetry Linked to Entity</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/[0.02] text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                            <tr>
                                <th className="px-10 py-6">Node ID</th>
                                <th className="px-10 py-6">Commodity</th>
                                <th className="px-10 py-6 text-right">Value</th>
                                <th className="px-10 py-6 text-center">Lifecycle Stage</th>
                                <th className="px-10 py-6"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs font-bold">
                            {buyerShipments.length > 0 ? (
                                buyerShipments.map(s => {
                                    const conv = convert(s.value);
                                    return (
                                        <tr key={s.id} className="hover:bg-white/[0.03] transition-all group">
                                            <td className="px-10 py-6 font-mono text-[#D4AF37] uppercase">{s.id}</td>
                                            <td className="px-10 py-6 text-white/90 uppercase tracking-widest text-[10px]">{s.coffeeType}</td>
                                            <td className="px-10 py-6 text-right text-white font-mono">{conv.symbol}{conv.value.toLocaleString()}</td>
                                            <td className="px-10 py-6 text-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] uppercase tracking-widest border ${
                                                    s.status === 'Delivered' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                                                    s.status === 'Processing' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                }`}>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="px-10 py-6 text-right">
                                                <button onClick={() => navigate(`/shipments/${s.id}`)} className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest hover:underline">View Node</button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-10 py-20 text-center text-white/10 uppercase font-black text-sm tracking-[0.5em]">No active nodes found in buffer</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden backdrop-blur-sm">
                <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                    <div>
                        <h4 className="text-sm font-black text-white tracking-tighter uppercase">Document Vault</h4>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Authorized Protocols & Archived Assets</p>
                    </div>
                    <button 
                        onClick={() => navigate('/forms', { state: { buyerId: buyer.id } })}
                        className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#D4AF37] hover:text-black transition-all"
                    >
                        Generate Protocol
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/[0.02] text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                            <tr>
                                <th className="px-10 py-6">Protocol Type</th>
                                <th className="px-10 py-6">Linked Node</th>
                                <th className="px-10 py-6">Status</th>
                                <th className="px-10 py-6 text-right">Sync Date</th>
                                <th className="px-10 py-6"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs font-bold">
                            {state.documents.filter(d => 
                                d.buyerId === buyer.id || 
                                buyerShipments.some(s => s.id === d.shipmentId)
                            ).length > 0 ? (
                                state.documents.filter(d => 
                                    d.buyerId === buyer.id || 
                                    buyerShipments.some(s => s.id === d.shipmentId)
                                ).map(doc => (
                                    <tr key={doc.id} className="hover:bg-white/[0.03] transition-all group">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-[#D4AF37]">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                </div>
                                                <span className="text-white/90 uppercase tracking-widest text-[10px]">{doc.type}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 font-mono text-white/40 uppercase">{doc.shipmentId || 'MASTER'}</td>
                                        <td className="px-10 py-6">
                                            <span className="px-3 py-1 bg-[#10B981]/10 text-[#10B981] rounded-full text-[8px] font-black uppercase tracking-widest border border-[#10B981]/20">
                                                {doc.status}
                                            </span>
                                        </td>
                                        <td className="px-10 py-6 text-right text-white/40 font-mono">{doc.date.replace(/-/g, '.')}</td>
                                        <td className="px-10 py-6 text-right">
                                            <button 
                                                onClick={() => setSelectedDoc(doc)}
                                                className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest hover:underline"
                                            >
                                                Retrieve
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-10 py-20 text-center text-white/10 uppercase font-black text-sm tracking-[0.5em]">Vault currently empty</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Document Preview Modal */}
            {selectedDoc && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-[#0F0906] border-2 border-[#D4AF37]/30 p-12 rounded-[56px] shadow-2xl relative overflow-hidden max-w-2xl w-full">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#D4AF37] via-transparent to-[#D4AF37]"></div>
                        
                        <button 
                            onClick={() => setSelectedDoc(null)} 
                            className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors"
                        >
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <div className="flex items-center gap-6 mb-10">
                            <div className="w-16 h-16 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl flex items-center justify-center text-[#D4AF37]">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tighter uppercase">{selectedDoc.name}</h3>
                                <p className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-[0.4em] mt-1">Protocol ID: {selectedDoc.id}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-10">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Type</p>
                                <p className="text-xs font-bold text-white/80 uppercase">{selectedDoc.type}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Status</p>
                                <p className="text-xs font-bold text-[#10B981] uppercase">{selectedDoc.status}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Sync Date</p>
                                <p className="text-xs font-bold text-white/80 font-mono">{selectedDoc.date}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Linked Node</p>
                                <p className="text-xs font-bold text-[#D4AF37] font-mono">{selectedDoc.shipmentId || 'MASTER'}</p>
                            </div>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl mb-10">
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-4">AI Extraction Summary</p>
                            <p className="text-xs text-white/60 leading-relaxed italic">
                                "This asset has been verified against the global export registry. All signatures are valid and the document hash matches the blockchain record. No anomalies detected in the protocol buffer."
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => setSelectedDoc(null)}
                                className="flex-1 py-4 bg-white/5 border border-white/10 text-white/40 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-white transition-all"
                            >
                                Close Preview
                            </button>
                            {['Sales Contract', 'Proforma Invoice', 'Commercial Invoice', 'Packing List', 'Air Waybill', 'Bank Permit', 'Certificate of Origin', 'Declaration', 'Bank Receipt', 'Phytosanitary Certificate'].includes(selectedDoc.type) && (
                                <button 
                                    onClick={() => {
                                        navigate('/forms', { 
                                            state: { 
                                                shipmentId: selectedDoc.shipmentId, 
                                                buyerId: selectedDoc.buyerId, 
                                                activeTab: selectedDoc.type 
                                            } 
                                        });
                                    }}
                                    className="flex-1 py-4 bg-white/5 border border-white/10 text-white/40 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-white transition-all"
                                >
                                    Edit Protocol
                                </button>
                            )}
                            <button 
                                onClick={() => handleDownload(selectedDoc)}
                                className="flex-[2] py-4 bg-[#D4AF37] text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#D4AF37]/20 hover:scale-[1.02] transition-all"
                            >
                                Download Secure Archive
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {advisory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="bg-black border-2 border-[#D4AF37]/30 p-12 rounded-[56px] shadow-2xl relative overflow-hidden max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#D4AF37] via-transparent to-[#D4AF37]"></div>
                        <button onClick={() => setAdvisory(null)} className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        
                        <div className="flex items-center gap-8 mb-12">
                            <div className="w-20 h-20 bg-[#D4AF37] rounded-[32px] flex items-center justify-center text-black shadow-[0_0_40px_rgba(212,175,55,0.4)]">
                                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 11a1 1 0 112 0v2a1 1 0 11-2 0v-2zm1-7a1 1 0 110 2 1 1 0 010-2z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-white tracking-tighter uppercase">Entity Risk Advisory</h3>
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.4em] mt-1">High-Confidence Cognitive Projection</p>
                            </div>
                        </div>

                        <div className="text-white/80 leading-relaxed italic font-medium text-xl bg-white/[0.03] p-12 rounded-[40px] border border-white/5 relative z-10 whitespace-pre-wrap shadow-inner">
                            "{advisory}"
                        </div>

                        <div className="mt-12 flex gap-4 justify-end">
                            <button onClick={() => setAdvisory(null)} className="px-10 py-5 bg-white/5 border border-white/10 text-white/40 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all">Archive Advisory</button>
                            <button 
                                onClick={() => alert("DIRECTIVES DEPLOYED TO OPERATIONAL NODES")}
                                className="px-10 py-5 bg-[#D4AF37] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#D4AF37]/20 hover:scale-105 transition-all"
                            >
                                Deploy Directives
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BuyerProfile;
