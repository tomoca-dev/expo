import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Logo } from '../constants';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase connection not established. Check your .env file and restart the dev server.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      setError(err?.message || 'An authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    if (!supabase) {
      setError('OAuth requires an active Supabase connection.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-['Inter'] relative overflow-hidden">
      <div className="absolute top-8 left-8 z-20 flex items-center gap-5">
        <Logo className="w-16 h-16 md:w-20 md:h-20" />
        <div>
          <span className="text-2xl md:text-3xl font-black tracking-tighter text-[#D4AF37] block leading-none drop-shadow-[0_0_16px_rgba(212,175,55,0.45)]">TOMOCA</span>
          <span className="text-[10px] uppercase tracking-[0.35em] font-bold text-white/50 block mt-1">Export Systems</span>
        </div>
      </div>

      <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#D4AF37] blur-[200px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#FFB800] blur-[180px] rounded-full"></div>
      </div>

      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-1000">
        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[48px] p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-30"></div>

          <div className="flex flex-col items-center mb-8">
            <Logo className="w-28 h-28 md:w-36 md:h-36 mb-8" />
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase text-center">Access Portal</h1>
            <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.4em] mt-2">TOMOCA Export Systems</p>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-[1px] bg-white/5"></div>
            <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.5em]">Secure Identity</span>
            <div className="flex-1 h-[1px] bg-white/5"></div>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest ml-4">Identifier</label>
              <input
                type="email"
                required
                placeholder="EMAIL@EXPORT.PROTOCOL"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white placeholder-white/10 focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]/50 outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest ml-4">Credential</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white placeholder-white/10 focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]/50 outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                <p className="text-[9px] font-black text-red-500 uppercase tracking-widest text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-white/5 border border-white/10 text-white/60 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] hover:bg-white/10 hover:text-white transition-all"
            >
              {loading ? 'AUTHENTICATING...' : 'Authenticate'}
            </button>
          </form>

          <div className="mt-8">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleOAuth('google')}
                className="flex items-center justify-center gap-3 py-3 bg-white/[0.02] border border-white/10 rounded-2xl hover:bg-white/[0.05] transition-all group"
              >
                <svg className="w-3.5 h-3.5 text-white/20 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                <span className="text-[8px] font-black text-white/20 group-hover:text-white uppercase tracking-widest">Google</span>
              </button>
              <button
                onClick={() => handleOAuth('github')}
                className="flex items-center justify-center gap-3 py-3 bg-white/[0.02] border border-white/10 rounded-2xl hover:bg-white/[0.05] transition-all group"
              >
                <svg className="w-3.5 h-3.5 text-white/20 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
                <span className="text-[8px] font-black text-white/20 group-hover:text-white uppercase tracking-widest">GitHub</span>
              </button>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Invite-only access enabled</p>
            <p className="text-[9px] font-bold text-white/15 uppercase tracking-[0.25em] mt-2">Contact an administrator if you need access.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
