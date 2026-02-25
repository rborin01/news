
import React, { useState, useEffect } from 'react';
import { SystemLogEntry } from '../types';
import { X, Activity, ShieldCheck, FileCode, Database, Server, Terminal, Layout } from 'lucide-react';

interface SystemMonitorProps {
  isOpen: boolean;
  onClose: () => void;
  logs: SystemLogEntry[];
}

// WHITELIST COMPLETA E REAL DO SISTEMA
const WHITELIST_COMPONENTS = [
    // CORE
    { name: 'index.html', type: 'Root', status: 'Static' },
    { name: 'index.tsx', type: 'Core', status: 'Mounted' },
    { name: 'App.tsx', type: 'Core', status: 'Active' },
    { name: 'types.ts', type: 'Core', status: 'Loaded' },
    { name: 'db.ts', type: 'Database', status: 'Active' },
    { name: 'manifest.json', type: 'Config', status: 'Static' },
    { name: 'metadata.json', type: 'Config', status: 'Static' },
    { name: 'blueprint.md', type: 'Doc', status: 'Reference' },

    // SERVICES
    { name: 'services/geminiService.ts', type: 'Service', status: 'Active' },
    { name: 'services/ollamaService.ts', type: 'Service', status: 'Hybrid-Ready' },
    { name: 'services/rssService.ts', type: 'Service', status: 'Backup-Ready' },

    // UI COMPONENTS
    { name: 'components/AuthGate.tsx', type: 'Security', status: 'Standby' },
    { name: 'components/Header.tsx', type: 'UI', status: 'Mounted' },
    { name: 'components/Sidebar.tsx', type: 'UI', status: 'Mounted' },
    { name: 'components/Dashboard.tsx', type: 'UI', status: 'Mounted' },
    { name: 'components/SystemMonitor.tsx', type: 'UI', status: 'Active' },
    { name: 'components/LoadingOverlay.tsx', type: 'UI', status: 'Standby' },

    // DATA UNITS
    { name: 'components/NewsCard.tsx', type: 'Module', status: 'Ready' },
    { name: 'components/AiInvestigationCard.tsx', type: 'Module', status: 'Ready' },
    { name: 'components/RawDataCard.tsx', type: 'Module', status: 'Ready' },
    { name: 'components/CommodityItem.tsx', type: 'Module', status: 'Mounted' },
    { name: 'components/DeepAnalysisModal.tsx', type: 'Module', status: 'Standby' },
    { name: 'components/NeuralBridgeModal.tsx', type: 'Module', status: 'Standby' }
];

export const SystemMonitor: React.FC<SystemMonitorProps> = ({ isOpen, onClose, logs }) => {
  const [activeTab, setActiveTab] = useState<'whitelist' | 'logs'>('whitelist'); // Default to whitelist per request

  // Auto-scroll to bottom of logs
  const logsEndRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen && activeTab === 'logs') {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md font-mono">
      <div className="bg-black border border-green-900 w-full max-w-5xl h-[85vh] rounded-lg shadow-[0_0_50px_rgba(0,255,0,0.15)] flex flex-col overflow-hidden ring-1 ring-green-900/50">
        
        {/* Terminal Header */}
        <div className="bg-slate-900 border-b border-slate-800 p-3 flex justify-between items-center select-none">
            <div className="flex items-center gap-4">
                <div className="flex gap-2 ml-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500"></div>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-green-500 ml-4">
                    <Terminal size={14} />
                    <span>root@truepress:~/core# audit --full</span>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition bg-slate-800 p-1 rounded hover:bg-red-900/50">
                <X size={18} />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50">
            <button 
                onClick={() => setActiveTab('whitelist')}
                className={`px-6 py-3 text-xs font-bold uppercase flex items-center gap-2 transition-colors ${activeTab === 'whitelist' ? 'bg-black text-blue-400 border-t-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <ShieldCheck size={14} /> Whitelist (Inventário)
            </button>
            <button 
                onClick={() => setActiveTab('logs')}
                className={`px-6 py-3 text-xs font-bold uppercase flex items-center gap-2 transition-colors ${activeTab === 'logs' ? 'bg-black text-green-400 border-t-2 border-green-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
                <Activity size={14} /> System Logs (Modificações)
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-black p-6 overflow-y-auto custom-scrollbar">
            
            {/* WHITELIST TAB */}
            {activeTab === 'whitelist' && (
                <div>
                    <div className="flex justify-between items-end mb-6 border-b border-slate-900 pb-4">
                        <div className="text-sm text-slate-400 border-l-4 border-blue-600 pl-3">
                            <h3 className="text-white font-bold text-lg mb-1">Inventário de Componentes</h3>
                            <p className="text-xs">Arquivos verificados e blindados contra simplificação.</p>
                        </div>
                        <div className="text-right">
                             <div className="text-2xl font-black text-blue-500">{WHITELIST_COMPONENTS.length}</div>
                             <div className="text-[10px] text-slate-500 uppercase">Arquivos Totais</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {WHITELIST_COMPONENTS.map((comp, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 border border-slate-800 rounded bg-slate-900/20 hover:border-blue-500/50 hover:bg-blue-900/10 transition-all group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {comp.type === 'Core' || comp.type === 'Root' ? <Server size={16} className="text-red-500 shrink-0" /> : 
                                     comp.type === 'UI' ? <Layout size={16} className="text-yellow-500 shrink-0" /> :
                                     comp.type === 'Database' || comp.type === 'Config' ? <Database size={16} className="text-purple-500 shrink-0" /> :
                                     comp.type === 'Service' ? <Activity size={16} className="text-cyan-500 shrink-0" /> :
                                     <FileCode size={16} className="text-slate-500 shrink-0" />}
                                    
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-slate-300 group-hover:text-white truncate" title={comp.name}>{comp.name}</div>
                                        <div className="text-[9px] text-slate-600 uppercase font-bold">{comp.status}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className={`w-1.5 h-1.5 rounded-full ${comp.status.includes('Active') || comp.status === 'Mounted' ? 'bg-green-500' : comp.status.includes('Ready') ? 'bg-blue-500' : 'bg-slate-500'}`}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* LOGS TAB */}
            {activeTab === 'logs' && (
                <div className="space-y-1 font-mono">
                    <div className="flex justify-between items-end mb-4 border-b border-slate-900 pb-2">
                         <div className="text-xs text-slate-500 uppercase font-bold">Terminal de Eventos</div>
                         <div className="flex gap-2 text-[10px]">
                            <span className="text-green-500">SUCCESS</span>
                            <span className="text-blue-500">INFO</span>
                            <span className="text-yellow-500">WARN</span>
                            <span className="text-red-500">ERROR</span>
                         </div>
                    </div>

                    {logs.length === 0 && (
                        <div className="text-slate-600 italic text-xs py-10 text-center">
                            &gt; Aguardando inicialização do kernel...
                        </div>
                    )}
                    
                    {logs.map((log, idx) => (
                        <div key={idx} className="text-xs flex gap-3 font-mono border-b border-slate-900/30 pb-1 mb-1 hover:bg-white/5 p-1 rounded transition-colors">
                            <span className="text-slate-600 min-w-[80px] select-none">{log.timestamp}</span>
                            <span className={`font-bold min-w-[60px] select-none ${
                                log.level === 'INFO' ? 'text-blue-500' : 
                                log.level === 'WARN' ? 'text-yellow-500' : 
                                log.level === 'ERROR' ? 'text-red-500' : 'text-green-500'
                            }`}>
                                [{log.level}]
                            </span>
                            <span className="text-purple-400 min-w-[90px] font-bold select-none">{log.module}</span>
                            <span className="text-slate-300 break-words">{log.message}</span>
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                    <div className="animate-pulse text-green-500 text-xs mt-4 font-bold">&gt;_</div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 border-t border-slate-900 p-2 text-[10px] text-slate-600 flex justify-between items-center font-mono">
            <span>RAM: ALLOCATED // MODE: STRICT // NO_SIMPLIFY=TRUE</span>
            <span>BUILD: v1.8.0-HYBRID</span>
        </div>

      </div>
    </div>
  );
};
