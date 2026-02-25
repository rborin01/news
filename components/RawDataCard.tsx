import React from 'react';
import { RawDataResult } from '../types';
import { Database, FileText, Link, Users, Calendar, Terminal } from 'lucide-react';

interface RawDataCardProps {
  item: RawDataResult;
}

export const RawDataCard: React.FC<RawDataCardProps> = ({ item }) => {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-sm mb-6 shadow-2xl relative">
        {/* Top Bar Decoration */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-cyan-500"></div>
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
            <div>
                <div className="flex items-center gap-2 text-emerald-500 mb-1">
                    <Terminal size={14} />
                    <span className="uppercase tracking-widest text-[10px] font-bold">Raw Data Extraction</span>
                </div>
                <h3 className="text-lg font-bold text-slate-200 uppercase">{item.topic}</h3>
            </div>
            <div className="text-[10px] text-slate-500 text-right">
                <div>ID: {item.id.substring(0,8)}</div>
                <div>{new Date(item.dateAdded).toLocaleDateString()}</div>
            </div>
        </div>

        {/* Key Figures Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-800">
            {item.keyFigures.map((fig, idx) => (
                <div key={idx} className="p-4 border-r border-slate-800 last:border-r-0">
                    <div className="text-[10px] text-slate-500 uppercase mb-1">{fig.label}</div>
                    <div className="text-lg font-bold text-white">{fig.value}</div>
                    <div className="text-[9px] text-slate-600 truncate mt-1">Ref: {fig.source}</div>
                </div>
            ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Timeline */}
            <div className="p-5 border-r border-slate-800">
                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-4">
                    <Calendar size={14} /> Cronologia Fática
                </h4>
                <div className="space-y-4 border-l border-slate-800 ml-1 pl-4">
                    {item.timeline.map((t, i) => (
                        <div key={i} className="relative">
                            <div className="absolute -left-[21px] top-1 w-2 h-2 bg-slate-700 rounded-full"></div>
                            <div className="text-[10px] text-cyan-500 font-bold">{t.date}</div>
                            <div className="text-slate-300 leading-snug">{t.event}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex flex-col">
                {/* Involved Parties */}
                <div className="p-5 border-b border-slate-800 flex-1">
                    <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-3">
                        <Users size={14} /> Envolvidos (Entidades/CPF)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {item.involvedParties.map((p, i) => (
                            <span key={i} className="px-2 py-1 bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded">
                                {p}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Sources & Summary */}
                <div className="p-5 bg-slate-900/30 flex-1">
                    <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
                        <FileText size={14} /> Resumo Técnico
                    </h4>
                    <p className="text-slate-400 italic mb-4 border-l-2 border-slate-700 pl-3">
                        "{item.rawSummary}"
                    </p>

                    <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
                        <Link size={14} /> Fontes Oficiais
                    </h4>
                    <ul className="space-y-1">
                        {item.officialSources.map((s, i) => (
                            <li key={i} className="text-xs text-blue-400 truncate hover:text-blue-300 cursor-pointer">
                                🔗 {s.name}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    </div>
  );
};
