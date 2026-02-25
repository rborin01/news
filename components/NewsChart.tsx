
import React from 'react';
import { NewsAnalysis } from '../types';

interface NewsChartProps {
  news: NewsAnalysis[];
}

export const NewsChart: React.FC<NewsChartProps> = ({ news }) => {
  const { data, maxCount } = React.useMemo(() => {
    const counts: { [key: string]: number } = {};
    
    news.forEach(item => {
      const rawCat = item.category || "Geral";
      // Limpeza suave: remove caracteres estranhos, mas mantém acentos e emojis se fizerem sentido
      let cleanCat = rawCat.trim();
      if (cleanCat.length < 2) cleanCat = "Geral";
      
      counts[cleanCat] = (counts[cleanCat] || 0) + 1;
    });

    const sortedData = Object.keys(counts)
      .map(key => ({
        name: key,
        count: counts[key],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6); // Top 6 para não poluir

    const max = sortedData.length > 0 ? sortedData[0].count : 0;

    return { data: sortedData, maxCount: max };
  }, [news]);

  if (data.length === 0) return null;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 w-full">
      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Narrativas</span>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{news.length} Itens</span>
      </div>
      
      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
          const isTop = index === 0;

          return (
            <div key={item.name} className="group">
              <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] font-bold text-slate-700 truncate max-w-[180px]" title={item.name}>
                  {item.name}
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  {item.count}
                </span>
              </div>
              
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ease-out ${isTop ? 'bg-blue-600' : 'bg-slate-400 group-hover:bg-blue-400'}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
