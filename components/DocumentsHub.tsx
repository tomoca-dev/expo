
import React, { useState } from 'react';
import { useApp } from '../App';
import { useNavigate } from 'react-router-dom';
import { Document } from '../types';

const DocumentsHub: React.FC = () => {
    const { state, updateDocument } = useApp();
    const navigate = useNavigate();
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

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
                <div>
                   <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Asset Vault</h2>
                   <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.4em] mt-1">Master Encrypted Document Terminal</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => alert("FILTERING STREAMS...")}
                        className="px-6 py-3 text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 rounded-2xl text-white/60 hover:text-white hover:border-white/30 transition-all"
                    >
                        Filter Streams
                    </button>
                    <button 
                        onClick={() => alert("PREPARING MASS EXPORT...")}
                        className="px-6 py-3 text-[10px] font-black uppercase tracking-widest bg-[#D4AF37] text-black rounded-2xl shadow-[0_10px_20px_rgba(212,175,55,0.2)] hover:scale-105 transition-all"
                    >
                        Mass Export
                    </button>
                </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white/[0.02] text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                        <tr>
                            <th className="px-8 py-6 border-b border-white/5">Signal ID</th>
                            <th className="px-8 py-6 border-b border-white/5">Linked Node</th>
                            <th className="px-8 py-6 border-b border-white/5">Protocol Type</th>
                            <th className="px-8 py-6 border-b border-white/5">Authorization</th>
                            <th className="px-8 py-6 border-b border-white/5">Sync Date</th>
                            <th className="px-8 py-6 border-b border-white/5"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs font-bold">
                        {state.documents.map(doc => (
                            <tr key={doc.id} className="hover:bg-white/[0.04] transition-all group">
                                <td className="px-8 py-6 font-mono text-white/90 uppercase">{doc.name}</td>
                                <td className="px-8 py-6 text-[#D4AF37] font-mono text-[10px] tracking-widest">
                                    {doc.shipmentId ? (
                                        <button 
                                            onClick={() => navigate(`/shipments/${doc.shipmentId}`)}
                                            className="hover:underline"
                                        >
                                            {doc.shipmentId}
                                        </button>
                                    ) : (
                                        <span className="opacity-30">MASTER</span>
                                    )}
                                </td>
                                <td className="px-8 py-6 text-white/50 uppercase tracking-widest text-[10px]">{doc.type}</td>
                                <td className="px-8 py-6">
                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                        doc.status === 'Draft' ? 'bg-white/5 text-white/30 border-white/10' :
                                        doc.status === 'Approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                    }`}>
                                        {doc.status}
                                    </span>
                                </td>
                                <td className="px-8 py-6 text-white/40 font-mono">{doc.date.replace(/-/g, '.')}</td>
                                <td className="px-8 py-6">
                                    <button 
                                        onClick={() => setSelectedDoc(doc)}
                                        className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest hover:underline hover:text-white transition-all"
                                    >
                                        Retrieve
                                    </button>
                                </td>
                            </tr>
                        ))}
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
                            <div className="space-y-1 col-span-2">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Buyer Portal Visibility</p>
                                <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Share with buyer (view-only)</p>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-1">Only affects Buyer Portal</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const next = { ...selectedDoc, buyerVisible: !selectedDoc.buyerVisible };
                                            updateDocument(next);
                                            setSelectedDoc(next);
                                        }}
                                        className={`w-16 h-9 rounded-full border transition-all relative ${
                                            selectedDoc.buyerVisible ? 'bg-[#D4AF37]/80 border-[#D4AF37]' : 'bg-black/40 border-white/10'
                                        }`}
                                    >
                                        <span
                                            className={`absolute top-1 w-7 h-7 rounded-full transition-all ${
                                                selectedDoc.buyerVisible ? 'left-8 bg-black' : 'left-1 bg-white/40'
                                            }`}
                                        />
                                    </button>
                                </div>
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
        </div>
    );
};

export default DocumentsHub;
