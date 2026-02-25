
import React, { useRef, useState, useEffect } from 'react';
import { LayoutGrid, Lock, Sprout, Cpu, Building2, DollarSign, Globe, ListFilter, Download, Upload, Terminal, AlertCircle, Loader2, FileText, Trash2, Siren, Scale, ShieldAlert, Newspaper, Briefcase, Clapperboard, Trophy, HeartPulse, Microscope, Bot, History, Save, HardDrive } from 'lucide-react';
import { exportDatabase, importDatabase, wipeDatabase, saveSnapshot, listSnapshots, loadSnapshot, deleteSnapshot } from '../db';
import { IntelligenceReport, NewsAnalysis, MemorySnapshot } from '../types';

interface SidebarProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (c: string) => void;
  onGenerateEmail: () => void;
  totalNews: number;
  minPersonalRelevance: number;
  setMinPersonalRelevance: (n: number) => void;
  minNationalRelevance: number;
  setMinNationalRelevance: (n: number) => void;
  setRelevanceMode: (mode: 'personal' | 'national') => void;
  onOpenSystemMonitor: () => void;
  onDataImported: (news: NewsAnalysis[], report?: IntelligenceReport) => void; 
}

export const Sidebar: React.FC<SidebarProps> = ({ 
    categories, selectedCategory, onSelectCategory, totalNews,
    minPersonalRelevance, setMinPersonalRelevance,
    minNationalRelevance, setMinNationalRelevance,
    setRelevanceMode, onOpenSystemMonitor, onDataImported
}) => {

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCloudEnv, setIsCloudEnv] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showTextImport, setShowTextImport] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [snapshots, setSnapshots] = useState<MemorySnapshot[]>([]);

  useEffect(() => {
      setIsCloudEnv(!window.location.hostname.includes('localhost'));
  }, []);

  const loadSnapshotsList = async () => {
      const list = await listSnapshots();
      setSnapshots(list);
  };

  const handleSaveSnapshot = async () => {
      const name = prompt("Nome do Ponto de Restauração:", `Backup ${new Date().toLocaleTimeString()}`);
      if (name) {
          const { loadCurrentState, saveSnapshot } = await import('../db');
          const current = await loadCurrentState();
          if (current) {
              await saveSnapshot(current, name, 'MANUAL');
              await loadSnapshotsList();
              alert("Snapshot salvo com sucesso!");
          } else {
              alert("Erro: Estado atual não encontrado no DB.");
          }
      }
  };

  const handleRestoreSnapshot = async (id: string) => {
      if (confirm("Restaurar este ponto? Dados atuais não salvos serão perdidos.")) {
          const { loadSnapshot } = await import('../db');
          const data = await loadSnapshot(id);
          if (data) {
              onDataImported(data.news, data);
              alert("Sistema restaurado.");
          }
      }
  };
  
  const handleDeleteSnapshot = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm("Apagar este backup?")) {
           const { deleteSnapshot } = await import('../db');
           await deleteSnapshot(id);
           await loadSnapshotsList();
      }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (file && confirm(`Restaurar backup "${file.name}"?`)) processImport(file);
  };

  const processImport = async (input: File | string) => {
      setIsImporting(true);
      try {
          await new Promise(r => setTimeout(r, 100)); 
          let result;
          if (typeof input === 'string') {
              const blob = new Blob([input], { type: 'application/json' });
              const file = new File([blob], "paste.json");
              result = await importDatabase(file);
          } else {
              result = await importDatabase(input);
          }
          alert(`SUCESSO!\n${result.count} itens restaurados.`);
          if (onDataImported) onDataImported(result.news, result.report);
      } catch (err: any) {
          alert(`ERRO NA RESTAURAÇÃO:\n${err.message}`);
      } finally {
          setIsImporting(false);
          setShowTextImport(false);
          setPastedJson('');
      }
  };

  const handleWipe = async () => {
      if (confirm("ATENÇÃO: ISSO APAGARÁ TUDO! Usar apenas se o sistema estiver travado.\nContinuar?")) {
          await wipeDatabase();
          window.location.reload();
      }
  };

  const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-r-full text-sm font-medium transition-colors ${
        active 
          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon size={18} />
      <span className="truncate text-left">{label}</span>
    </button>
  );

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed h-full z-20">
        <div className="p-6 flex items-center gap-2 border-b border-slate-100">
            <div className="bg-slate-900 text-white p-1 rounded">
                <Lock size={16} />
            </div>
            <span className="font-black text-xl tracking-tight text-slate-800">TRUE PRESS</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 pr-4 space-y-1 custom-scrollbar">
            
            <div className="px-6 pb-2 pt-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Feeds & Categorias</div>
            <SidebarItem icon={LayoutGrid} label="Todos os Itens" active={selectedCategory === 'Todos'} onClick={() => onSelectCategory('Todos')} />
            
            {categories.filter(c => c !== 'Todos').map(cat => (
                <SidebarItem key={cat} icon={getCategoryIcon(cat)} label={cat} active={selectedCategory === cat} onClick={() => onSelectCategory(cat)} />
            ))}

            <div className="px-6 pb-2 pt-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Cofre (L4)</div>
            
            <div className="px-4 space-y-2">
                 <button 
                    onClick={() => { setShowSnapshots(!showSnapshots); if(!showSnapshots) loadSnapshotsList(); }}
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded text-xs font-bold border border-slate-200"
                 >
                    <div className="flex items-center gap-2">
                        <History size={14} /> <span>Histórico</span>
                    </div>
                    <span className="bg-slate-200 text-slate-500 px-1.5 rounded-full text-[10px]">{snapshots.length}</span>
                 </button>

                 {showSnapshots && (
                     <div className="space-y-1 pl-2 border-l-2 border-slate-100">
                         <button 
                            onClick={handleSaveSnapshot}
                            className="w-full text-left px-2 py-1.5 text-[10px] font-bold text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1"
                         >
                             <Save size={10} /> SALVAR AGORA
                         </button>
                         {snapshots.map(snap => (
                             <div key={snap.id} className="group flex justify-between items-center px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer" onClick={() => handleRestoreSnapshot(snap.id)}>
                                 <div className="truncate w-32">
                                     <div className="text-[10px] font-bold text-slate-700 truncate">{snap.name}</div>
                                     <div className="text-[9px] text-slate-400">{new Date(snap.timestamp).toLocaleTimeString()} • {snap.itemCount} itens</div>
                                 </div>
                                 <button onClick={(e) => handleDeleteSnapshot(snap.id, e)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                                     <Trash2 size={12} />
                                 </button>
                             </div>
                         ))}
                     </div>
                 )}
            </div>

            <div className="px-6 pb-2 pt-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Filtro de Relevância</div>
            <div className="px-6 py-4 space-y-4 bg-slate-50 mx-2 rounded-lg border border-slate-100 mb-4">
                <div>
                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500 mb-1">
                        <span>Impacto Pessoal</span>
                        <span>{minPersonalRelevance}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="90" step="10"
                        value={minPersonalRelevance}
                        onChange={(e) => { setMinPersonalRelevance(Number(e.target.value)); setRelevanceMode('personal'); }}
                        className="w-full h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>
            </div>

        </nav>

        {/* SYSTEM STATUS / BACKUP */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between mb-3 px-1">
                <div onClick={onOpenSystemMonitor} className="cursor-pointer hover:text-blue-600 flex items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Terminal size={10} /> System Core
                    </span>
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <div className="flex items-center gap-2">
                     <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1" title="Protocolo Caixa Preta Ativo">
                        <HardDrive size={10} className="text-slate-500" />
                        <span>BLACKBOX</span>
                     </div>
                     <button onClick={handleWipe} className="text-red-300 hover:text-red-600" title="Apagar Memória (Emergência)">
                        <Trash2 size={12} />
                     </button>
                </div>
            </div>
            
            <button 
                onClick={exportDatabase}
                disabled={isImporting}
                className="w-full flex items-center justify-center gap-2 mb-2 p-2 bg-blue-600 border border-blue-700 rounded text-white hover:bg-blue-500 transition shadow-md active:scale-95 group"
                title="Salvar arquivo físico (Recomendado)"
            >
                <Download size={16} className="group-hover:animate-bounce" />
                <span className="text-xs font-bold">BAIXAR BACKUP (SAFE)</span>
            </button>
            
            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className={`flex flex-col items-center justify-center p-2 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100 hover:text-green-600 transition ${totalNews === 0 ? 'ring-2 ring-green-500 animate-pulse' : ''}`}
                    title="Restaurar Arquivo"
                >
                    {isImporting ? <Loader2 size={16} className="mb-1 animate-spin text-blue-600" /> : <Upload size={16} className="mb-1" />}
                    <span className="text-[9px] font-bold">{isImporting ? 'LENDO...' : 'IMPORT'}</span>
                </button>
                 <button 
                    onClick={() => setShowTextImport(true)}
                    className="flex flex-col items-center justify-center p-2 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100 hover:text-purple-600 transition"
                >
                    <FileText size={16} className="mb-1" />
                    <span className="text-[9px] font-bold">COLAR</span>
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept=".json"
                    onChange={handleImport}
                />
            </div>
            
        </div>

        {/* Text Import Modal */}
        {showTextImport && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 p-4">
                <div className="bg-white rounded-lg w-full max-w-lg p-4 flex flex-col h-[80vh]">
                    <div className="flex justify-between items-center mb-2">
                         <h3 className="font-bold text-lg">Restaurar via Texto</h3>
                         <button onClick={() => setShowTextImport(false)} className="text-slate-400 hover:text-red-500 font-bold">FECHAR</button>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">Cole o conteúdo JSON abaixo.</p>
                    <textarea 
                        className="flex-1 border p-2 font-mono text-xs mb-2 rounded bg-slate-50 text-slate-800" 
                        placeholder='{"version": 1, "data": ...}'
                        value={pastedJson}
                        onChange={e => setPastedJson(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => processImport(pastedJson)} className="w-full px-4 py-3 bg-blue-600 text-white rounded font-bold shadow-lg hover:bg-blue-500 transition">RESTAURAR AGORA</button>
                    </div>
                </div>
            </div>
        )}
    </aside>
  );
};

const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('manchete') || lower.includes('alerta')) return Siren;
    if (lower.includes('stf') || lower.includes('lei') || lower.includes('política')) return Scale;
    if (lower.includes('agro') || lower.includes('rural') || lower.includes('commodity')) return Sprout;
    if (lower.includes('forex') || lower.includes('finan')) return DollarSign;
    if (lower.includes('imob') || lower.includes('constru')) return Building2;
    if (lower.includes('liberdade') || lower.includes('censura')) return ShieldAlert;
    if (lower.includes('inteligência') || lower.includes('artificial') || lower.includes('ai ')) return Bot;
    if (lower.includes('tech') || lower.includes('ia') || lower.includes('comput')) return Cpu;
    if (lower.includes('ciência') || lower.includes('science')) return Microscope;
    if (lower.includes('saúde') || lower.includes('health') || lower.includes('bem-estar')) return HeartPulse;
    if (lower.includes('esporte') || lower.includes('futebol') || lower.includes('sport')) return Trophy;
    if (lower.includes('entretenimento') || lower.includes('arte') || lower.includes('cultura')) return Clapperboard;
    if (lower.includes('negócio') || lower.includes('business') || lower.includes('eco')) return Briefcase;
    if (lower.includes('mundo') || lower.includes('world') || lower.includes('geo')) return Globe;
    if (lower.includes('brasil')) return Newspaper;
    return ListFilter;
};
