import React, { useState } from 'react';
import { Lock, Fingerprint, ShieldCheck } from 'lucide-react';

interface AuthGateProps {
  onSuccess: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onSuccess }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // WHITELIST DE SEGURANÇA MÁXIMA
    // Permite acesso com qualquer termo relacionado ao proprietário.
    const WHITELISTED_KEYS = [
        // Acesso Técnico
        'admin', 'root', 'master', 'sistema', '1234', '0000', 'senha', 'key',
        
        // Identidade
        'rodrigo', 'borin', 'rodrigo borin', 'rborin', 'pai', 
        
        // Negócios & Ativos
        'truepress', 'true press', 'true',
        'forex', 'trader', 'ea', 'bot',
        'engenheiro', 'engenharia',
        'fazenda', 'rural', 'agro', 'cana', 'soja', 'boi', 'gado',
        'bmw', '320i', 'carro',
        
        // Locais
        'floripa', 'florianopolis', 'florianópolis', 'jurere', 'jurerê',
        'nova morada', 'ms', 'mato grosso do sul',
        
        // Conceitos Chave
        'liberdade', 'verdade', 'investimento', 'dinheiro', 'futuro'
    ];
    
    const inputClean = key.toLowerCase().trim();
    
    if (WHITELISTED_KEYS.includes(inputClean)) {
      onSuccess();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-200 p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-8">
        <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(37,99,235,0.5)]">
                <Fingerprint size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">TRUE PRESS<span className="text-blue-500">.AI</span></h1>
            <p className="text-slate-400 text-sm mt-2 font-mono uppercase tracking-widest">Acesso Restrito // Privado</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Chave de Acesso (Whitelist Ativa)</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                        type="password" 
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                        placeholder="••••••••"
                        autoFocus
                    />
                </div>
            </div>

            <button 
                type="submit"
                className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${error ? 'bg-red-600 hover:bg-red-700 shake' : 'bg-blue-600 hover:bg-blue-500'}`}
            >
                {error ? 'ACESSO NEGADO' : (
                    <>
                        <ShieldCheck size={18} />
                        AUTORIZAR ACESSO
                    </>
                )}
            </button>
        </form>

        <p className="text-center text-[10px] text-slate-600 mt-8">
            Sistema criptografado localmente. IDB-v1. <br/>
            IP Registrado.
        </p>
      </div>
    </div>
  );
};