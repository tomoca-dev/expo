
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../App';
import { Logo } from '../constants';

const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const { state, seedData, refreshExchangeRates } = useApp();

  const handleSignOut = () => {
    signOut();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="text-center relative py-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#D4AF37] blur-[120px] opacity-10 rounded-full"></div>
        <div className="relative z-10">
           <div className="w-32 h-32 mx-auto rounded-[40px] border-2 border-[#D4AF37]/50 p-1 mb-6 relative group overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.2)]">
              <img src={`https://picsum.photos/seed/${state.role}/200/200`} className="w-full h-full object-cover rounded-[36px] grayscale group-hover:grayscale-0 transition-all duration-500" alt="operator" />
           </div>
           <h2 className="text-4xl font-black text-white tracking-tighter uppercase">{user?.user_metadata?.full_name || 'Authorized Operator'}</h2>
           <p className="text-[#D4AF37] mt-2 text-xs font-black uppercase tracking-[0.4em]">{state.role} Clearance Node</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Security Dossier */}
        <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 p-10 rounded-[40px] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#D4AF37] opacity-20"></div>
          <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-8">Security Dossier</h4>
          <div className="space-y-6">
            <div className="flex justify-between items-center group/item">
               <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Identifier</span>
               <span className="text-sm font-black text-white/80">{user?.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center group/item">
               <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Node ID</span>
               <span className="text-sm font-mono font-black text-[#D4AF37]">{(user?.id || 'UNK').slice(0, 12).toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center group/item">
               <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Protocol Version</span>
               <span className="text-sm font-black text-white/80">4.2.0-STABLE</span>
            </div>
            <div className="flex justify-between items-center group/item pt-4 border-t border-white/5">
               <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Session Uptime</span>
               <span className="text-sm font-black text-[#10B981]">02:45:12</span>
            </div>
          </div>
        </div>

        {/* Operational Controls */}
        <div className="bg-white/[0.02] backdrop-blur-md border border-white/5 p-10 rounded-[40px] relative overflow-hidden group">
           <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-8">Session Protocol</h4>
           <div className="space-y-4">
              <button 
                onClick={handleSignOut}
                className="w-full py-5 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-red-600 shadow-[0_10px_30px_rgba(239,68,68,0.2)] hover:scale-[1.02] active:scale-95 transition-all"
              >
                 Terminate Session
              </button>
              <button 
                onClick={seedData}
                className="w-full py-5 bg-[#D4AF37] text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-[0_10px_30px_rgba(212,175,55,0.2)] hover:scale-[1.02] active:scale-95 transition-all"
              >
                 Seed Protocol Data
              </button>
              <button 
                onClick={() => {
                    refreshExchangeRates();
                    alert("GLOBAL RE-SYNC INITIATED");
                }}
                className="w-full py-5 border border-white/10 text-white/60 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all"
              >
                 Request Global Re-Sync
              </button>
              <div className="pt-6">
                 <p className="text-[9px] text-white/10 font-bold uppercase tracking-[0.2em] leading-relaxed text-center">
                    Terminating the session will clear the active decryption buffer and revoke all temporary access tokens.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
