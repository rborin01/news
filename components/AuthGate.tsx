import React, { useState } from 'react';
import { Lock, Mail, User, Fingerprint, ShieldCheck, KeyRound } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface AuthGateProps {
  onSuccess: () => void;
}

type Mode = 'login' | 'register' | 'forgot';

export const AuthGate: React.FC<AuthGateProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const clearMessages = () => { setError(null); setInfo(null); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message === 'Invalid login credentials'
        ? 'Email ou senha incorretos.'
        : authError.message);
      return;
    }
    onSuccess();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (password.length < 8) { setError('Senha deve ter no mínimo 8 caracteres.'); return; }
    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    setInfo('Conta criada! Verifique seu email para confirmar o cadastro.');
    setMode('login');
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    setInfo('Link de redefinição enviado para seu email.');
  };

  const inputClass = 'w-full bg-slate-900 border border-slate-600 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-200 p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(37,99,235,0.5)]">
            <Fingerprint size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            TRUE PRESS<span className="text-blue-500">.AI</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-mono uppercase tracking-widest">
            {mode === 'login' && 'Acesso Restrito'}
            {mode === 'register' && 'Criar Conta'}
            {mode === 'forgot' && 'Recuperar Senha'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300 text-sm">
            {info}
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className={inputClass} placeholder="Email" required autoFocus />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className={inputClass} placeholder="Senha" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
              {loading ? 'Entrando...' : (<><ShieldCheck size={18} /> ENTRAR</>)}
            </button>
            <div className="flex justify-between text-xs text-slate-500 pt-1">
              <button type="button" onClick={() => { setMode('register'); clearMessages(); }}
                className="hover:text-blue-400 transition-colors">Criar conta</button>
              <button type="button" onClick={() => { setMode('forgot'); clearMessages(); }}
                className="hover:text-blue-400 transition-colors">Esqueci a senha</button>
            </div>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className={inputClass} placeholder="Nome completo" required autoFocus />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className={inputClass} placeholder="Email" required />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className={inputClass} placeholder="Senha (mín. 8 caracteres)" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
              {loading ? 'Criando...' : (<><KeyRound size={18} /> CRIAR CONTA</>)}
            </button>
            <div className="text-center">
              <button type="button" onClick={() => { setMode('login'); clearMessages(); }}
                className="text-xs text-slate-500 hover:text-blue-400 transition-colors">
                Já tenho conta
              </button>
            </div>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className={inputClass} placeholder="Email" required autoFocus />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition-all">
              {loading ? 'Enviando...' : 'ENVIAR LINK'}
            </button>
            <div className="text-center">
              <button type="button" onClick={() => { setMode('login'); clearMessages(); }}
                className="text-xs text-slate-500 hover:text-blue-400 transition-colors">
                Voltar ao login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
