import React, { useState, useEffect, useCallback } from 'react';
import { X, Briefcase, UserCog, RefreshCw, AlertCircle, Loader2, FileText, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { getBriefings, getProfessionalProfile, Briefing, ProfessionalProfile } from '../services/briefingService';
import ProfessionalProfileModal from './ProfessionalProfileModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_META: Record<Briefing['status'], { label: string; icon: React.ElementType; cls: string }> = {
  pending: { label: 'Pendente', icon: Clock, cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  processing: { label: 'Processando', icon: Loader2, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: 'Concluído', icon: CheckCircle2, cls: 'bg-green-50 text-green-700 border-green-200' },
  failed: { label: 'Falhou', icon: XCircle, cls: 'bg-red-50 text-red-700 border-red-200' },
};

export default function BriefingPanel({ isOpen, onClose }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const id = authData.user?.id ?? null;
      setUserId(id);
      if (!id) {
        setError('Faça login no Supabase para acessar o True Press Pro.');
        setBriefings([]);
        setProfile(null);
        return;
      }
      const [briefingList, profileData] = await Promise.all([
        getBriefings(id),
        getProfessionalProfile(id),
      ]);
      setBriefings(briefingList);
      setProfile(profileData);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados do True Press Pro.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen, loadData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <aside className="relative w-full max-w-md h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col z-10">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-blue-500">
          <div className="flex items-center gap-2 text-white">
            <Briefcase size={20} />
            <h2 className="text-lg font-black tracking-tight">True Press Pro</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Fechar painel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Ações */}
        <div className="px-6 py-4 border-b border-slate-100 flex gap-2">
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            <UserCog size={16} /> Editar Perfil
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-100 transition-colors disabled:opacity-60"
            aria-label="Atualizar"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Perfil resumido */}
        {profile && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Perfil ativo</div>
            <div className="text-sm font-bold text-slate-700 capitalize">
              {profile.profession}
              {profile.specialty ? ` • ${profile.specialty}` : ''}
            </div>
            {profile.location && <div className="text-xs text-slate-500">{profile.location}</div>}
            {profile.keywords?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {profile.keywords.map((k) => (
                  <span key={k} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          {error && (
            <div className="p-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          )}

          {!loading && !error && briefings.length === 0 && (
            <div className="text-center py-12">
              <FileText size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-400 text-sm">
                Nenhum briefing ainda. Edite seu perfil e gere o primeiro briefing.
              </p>
            </div>
          )}

          {!loading && briefings.length > 0 && (
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Briefings recentes</div>
              {briefings.map((b) => {
                const meta = STATUS_META[b.status];
                const Icon = meta.icon;
                return (
                  <div key={b.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-bold text-slate-700 capitalize">
                        {b.profession}{b.specialty ? ` • ${b.specialty}` : ''}
                      </div>
                      <span className={`flex items-center gap-1 text-[10px] font-bold border rounded-full px-2 py-0.5 ${meta.cls}`}>
                        <Icon size={10} className={b.status === 'processing' ? 'animate-spin' : ''} />
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mb-2">
                      {new Date(b.generated_at).toLocaleString('pt-BR')}
                    </div>
                    {b.analysis ? (
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{b.analysis}</p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Análise ainda não disponível.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {userId && (
        <ProfessionalProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          userId={userId}
          onSaved={() => {
            setShowProfileModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
