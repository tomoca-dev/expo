import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../App';
import { supabase } from '../supabaseClient';

type UserRole = 'admin' | 'buyer';
type UserStatus = 'pending' | 'active' | 'rejected';

type ProfileRow = {
  id: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  buyer_id: string | null;
  created_at?: string;
};

type InviteRow = {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  buyer_id: string | null;
  created_at?: string;
};

const AdminUsers: React.FC = () => {
  const { state } = useApp();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('buyer');
  const [buyerId, setBuyerId] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const buyersById = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of state.buyers) map.set(b.id, b.name);
    return map;
  }, [state.buyers]);

  const flash = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 2500);
  };

  const load = async () => {
    if (!supabase) return;
    setLoading(true);
    const [profilesRes, invitesRes] = await Promise.all([
      supabase.from('profiles').select('id,email,role,status,buyer_id,created_at').order('created_at', { ascending: false }),
      supabase.from('invites').select('id,email,role,status,buyer_id,created_at').order('created_at', { ascending: false }),
    ]);
    if (profilesRes.error) console.error('Failed to load profiles', profilesRes.error);
    if (invitesRes.error) console.error('Failed to load invites', invitesRes.error);
    setProfiles((profilesRes.data ?? []) as ProfileRow[]);
    setInvites((invitesRes.data ?? []) as InviteRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createInvite = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) return flash('ENTER A VALID EMAIL');
    if (!supabase) return flash('SUPABASE NOT CONNECTED');
    const { error } = await supabase.from('invites').insert({
      email: trimmed,
      role,
      status: 'pending',
      buyer_id: role === 'buyer' ? (buyerId || null) : null,
    } as any);
    if (error) return flash(error.message.toUpperCase());
    setEmail('');
    setBuyerId('');
    flash('INVITE CREATED');
    await load();
  };

  const updateProfile = async (id: string, patch: Partial<ProfileRow>) => {
    if (!supabase) return;
    const { error } = await supabase.from('profiles').update(patch as any).eq('id', id);
    if (error) return flash(error.message.toUpperCase());
    await load();
  };

  const updateInvite = async (id: string, patch: Partial<InviteRow>) => {
    if (!supabase) return;
    const { error } = await supabase.from('invites').update(patch as any).eq('id', id);
    if (error) return flash(error.message.toUpperCase());
    await load();
  };

  const removeInvite = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('invites').delete().eq('id', id);
    if (error) return flash(error.message.toUpperCase());
    await load();
  };

  const pendingInvites = invites.filter((u) => u.status === 'pending' || u.status === 'sent');
  const activeProfiles = profiles.filter((u) => u.status === 'active');

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {feedback && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-4"><div className="bg-[#D4AF37] text-black px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-3"><span className="w-2 h-2 bg-black rounded-full animate-pulse"></span>{feedback}</div></div>}
      <div>
        <h2 className="text-5xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.08)]">Users</h2>
        <p className="text-white/40 font-bold uppercase tracking-[0.2em] mt-3">Supabase-backed user directory using profiles and invites.</p>
      </div>
      <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-10 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="buyer@company.com" className="lg:col-span-2 px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-sm font-bold text-white/80 placeholder:text-white/20 focus:ring-1 focus:ring-[#D4AF37] outline-none" />
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/80 focus:ring-1 focus:ring-[#D4AF37] outline-none"><option value="buyer">Buyer</option><option value="admin">Admin</option></select>
          <button onClick={createInvite} className="px-5 py-4 bg-[#D4AF37] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-[0_10px_20px_rgba(212,175,55,0.2)] hover:scale-[1.02] transition-all">Create Invite</button>
        </div>
        {role === 'buyer' && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Link to Buyer Profile</p>
            <select value={buyerId} onChange={(e) => setBuyerId(e.target.value)} className="mt-3 w-full px-5 py-4 bg-black/40 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/80 focus:ring-1 focus:ring-[#D4AF37] outline-none">
              <option value="">Not linked</option>
              {state.buyers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-10">
          <h4 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em]">Pending Invites ({pendingInvites.length.toString().padStart(2, '0')})</h4>
          <div className="mt-8 space-y-4">{loading && <div className="text-white/30 text-[10px] font-black uppercase tracking-widest">Loading...</div>}{!loading && pendingInvites.length === 0 && <div className="p-14 text-center bg-white/[0.01] border border-white/5 rounded-2xl"><p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">No pending invites</p></div>}{pendingInvites.map((u) => <div key={u.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div><p className="text-xs font-black text-white/90 uppercase tracking-widest">{u.email}</p><p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-2">Role: <span className="text-white/60">{u.role}</span>{u.buyer_id && <span className="ml-3">Buyer: <span className="text-white/60">{buyersById.get(u.buyer_id) ?? u.buyer_id}</span></span>}</p></div><div className="flex flex-wrap gap-3"><button onClick={() => updateInvite(u.id, { status: 'sent' })} className="px-4 py-2 bg-[#10B981]/15 border border-[#10B981]/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#10B981] hover:bg-[#10B981]/25 transition-all">Mark Sent</button><button onClick={() => updateInvite(u.id, { status: 'cancelled' })} className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/15 transition-all">Cancel</button><button onClick={() => removeInvite(u.id)} className="px-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white/70 hover:border-white/20 transition-all">Remove</button></div></div></div>)}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-[32px] p-10">
          <h4 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em]">Active Profiles ({activeProfiles.length.toString().padStart(2, '0')})</h4>
          <div className="mt-8 space-y-4">{loading && <div className="text-white/30 text-[10px] font-black uppercase tracking-widest">Loading...</div>}{!loading && activeProfiles.length === 0 && <div className="p-14 text-center bg-white/[0.01] border border-white/5 rounded-2xl"><p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">No active profiles</p></div>}{activeProfiles.map((u) => <div key={u.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6"><div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"><div><p className="text-xs font-black text-white/90 uppercase tracking-widest">{u.email ?? u.id}</p><p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-2">ID: <span className="font-mono text-white/40">{u.id}</span></p></div><div className="flex flex-col md:flex-row gap-3 md:items-center"><select value={u.role} onChange={(e) => updateProfile(u.id, { role: e.target.value as UserRole, buyer_id: e.target.value === 'buyer' ? u.buyer_id : null })} className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/80 focus:ring-1 focus:ring-[#D4AF37] outline-none"><option value="buyer">Buyer</option><option value="admin">Admin</option></select><select value={u.buyer_id ?? ''} onChange={(e) => updateProfile(u.id, { buyer_id: e.target.value || null })} disabled={u.role !== 'buyer'} className={`px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-[#D4AF37] outline-none ${u.role !== 'buyer' ? 'text-white/20 opacity-60 cursor-not-allowed' : 'text-white/80'}`}><option value="">Not linked</option>{state.buyers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select><select value={u.status} onChange={(e) => updateProfile(u.id, { status: e.target.value as UserStatus })} className="px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/80 focus:ring-1 focus:ring-[#D4AF37] outline-none"><option value="active">Active</option><option value="pending">Pending</option><option value="rejected">Rejected</option></select></div></div></div>)}</div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
