
import React, { useState } from 'react';
import { CommodityForecast } from '../types';
import { TrendingUp, TrendingDown, Minus, Calendar, AlertCircle } from 'lucide-react';

interface CommodityItemProps {
    c: CommodityForecast;
    compact?: boolean; // Sidebar usage
}

export const CommodityItem: React.FC<CommodityItemProps> = ({ c, compact = false }) => {
    const [expanded, setExpanded] = useState(false);

    if (!c) return null; 

    const name = String(c.name || "Commodity Genérica"); 
    const price = c.currentPrice || 'N/D';
    const futurePrice = c.futurePrice || '';
    const trend = c.scenarios?.short?.trend || 'Lateral';
    const justification = c.scenarios?.short?.justification || '';
    const source = c.source || 'IA';

    const isMissingData = price === 'N/D' || price === 'R$ 0,00';

    const getTrendIcon = (t: string) => {
        if (isMissingData) return <AlertCircle size={10} className="text-yellow-500" />;
        if (t === 'Alta') return <TrendingUp size={10} className="text-green-600" />;
        if (t === 'Baixa') return <TrendingDown size={10} className="text-red-600" />;
        return <Minus size={10} className="text-slate-400" />;
    };

    const getTrendColor = (t: string) => {
        if (isMissingData) return 'text-yellow-600';
        if (t === 'Alta') return 'text-green-600';
        if (t === 'Baixa') return 'text-red-600';
        return 'text-slate-500';
    };

    return (
        <div className="mb-2 border-b border-slate-200 last:border-0 pb-2 bg-white p-2 rounded shadow-sm hover:shadow-md transition-shadow">
            <div 
                className="cursor-pointer group"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Linha 1: Nome e Preço Atual */}
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight truncate max-w-[120px]" title={name}>
                        {name}
                    </span>
                    <span className={`text-xs font-black px-1.5 py-0.5 rounded ${isMissingData ? 'text-yellow-700 bg-yellow-50 border border-yellow-200' : 'text-slate-800 bg-slate-100'}`}>
                        {isMissingData ? 'AUDITANDO...' : price}
                    </span>
                </div>

                {/* Linha 2: Preço Futuro (Se existir) */}
                {futurePrice && futurePrice !== "N/D" && (
                    <div className="flex justify-between items-center mb-1 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                            <div className="flex items-center gap-1 text-[9px] font-bold text-blue-600">
                            <Calendar size={8} />
                            <span>Futuro</span>
                            </div>
                            <span className="text-[9px] font-bold text-blue-700">
                            {futurePrice}
                            </span>
                    </div>
                )}
                
                {/* Linha 3: Fonte e Tendência */}
                <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-50">
                    <span className="text-[8px] text-slate-400 truncate max-w-[80px]">
                        {source}
                    </span>
                    
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 text-[9px] font-black uppercase ${getTrendColor(trend)}`}>
                            {getTrendIcon(trend)}
                            {isMissingData ? 'Aguardando' : trend}
                        </div>
                    </div>
                </div>
            </div>

            {/* Expansão: Justificativa */}
            {expanded && justification && (
                <div className="bg-slate-50 p-2 rounded mt-2 text-[9px] border border-slate-200 animate-in slide-in-from-top-1">
                    <p className="text-slate-600 leading-tight italic border-l-2 border-blue-300 pl-2">
                        "{justification}"
                    </p>
                </div>
            )}
        </div>
    );
};
