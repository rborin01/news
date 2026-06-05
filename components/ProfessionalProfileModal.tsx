import React, { useState } from 'react';
import { saveProfessionalProfile, requestBriefing } from '../services/briefingService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSaved: () => void;
}

const PROFESSIONS = [
  { value: 'medico', label: 'Médico' },
  { value: 'advogado', label: 'Advogado' },
  { value: 'contador', label: 'Contador' },
  { value: 'engenheiro', label: 'Engenheiro' },
  { value: 'agro', label: 'Agronegócio' },
  { value: 'outro', label: 'Outro' },
];

export default function ProfessionalProfileModal({ isOpen, onClose, userId, onSaved }: Props) {
  const [profession, setProfession] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [location, setLocation] = useState('');
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const profile = {
    profession,
    specialty,
    location,
    keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
  };

  async function handleSave() {
    if (!profession) { setFeedback('Selecione uma profissão.'); return; }
    setLoading(true); setFeedback(null);
    try {
      await saveProfessionalProfile(userId, profile);
      setFeedback('Perfil salvo com sucesso.');
      onSaved();
    } catch (e: unknown) {
      setFeedback(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  }

  async function handleBriefing() {
    if (!profession) { setFeedback('Selecione uma profissão antes de gerar o briefing.'); return; }
    setLoading(true); setFeedback(null);
    try {
      await saveProfessionalProfile(userId, profile);
      await requestBriefing(userId, profession, specialty, profile.keywords);
      setFeedback('Briefing solicitado. Aguarde o processamento.');
      onSaved();
    } catch (e: unknown) {
      setFeedback(e instanceof Error ? e.message : 'Erro ao gerar briefing.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">Perfil Profissional</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Profissão</label>
            <select value={profession} onChange={e => setProfession(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione...</option>
              {PROFESSIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Especialidade</label>
            <input value={specialty} onChange={e => setSpecialty(e.target.value)}
              placeholder="Ex: Cardiologia"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Localização</label>
            <input value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Ex: São Paulo, SP"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Palavras-chave <span className="text-slate-500">(separadas por vírgula)</span>
            </label>
            <input value={keywords} onChange={e => setKeywords(e.target.value)}
              placeholder="Ex: reforma tributária, IR, IRPF"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {feedback && (
          <div className="p-3 bg-blue-900/40 border border-blue-700 rounded-lg text-blue-300 text-sm">
            {feedback}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors disabled:opacity-60">
            Fechar
          </button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-2 rounded-lg bg-slate-700 text-white text-sm font-semibold hover:bg-slate-600 transition-colors disabled:opacity-60">
            {loading ? 'Salvando...' : 'Salvar Perfil'}
          </button>
          <button onClick={handleBriefing} disabled={loading}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors disabled:opacity-60">
            {loading ? 'Gerando...' : 'Gerar Briefing'}
          </button>
        </div>
      </div>
    </div>
  );
}
