import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { X, FileText } from 'lucide-react';
import { INDEX_COLORS } from './IndicesBorinPanel';

interface DrilldownArticle {
  id: string;
  title: string;
  category: string;
  score_rodrigo: number;
  processed_at: string;
  borin_index_tags: string[];
}

interface IndicesBorinDrilldownProps {
  indexCode: string;
  indexName: string;
  onClose: () => void;
}

export const IndicesBorinDrilldown: React.FC<IndicesBorinDrilldownProps> = ({
  indexCode,
  indexName,
  onClose,
}) => {
  const [articles, setArticles] = useState<DrilldownArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('processed_news')
          .select('id, title, category, score_rodrigo, processed_at, borin_index_tags')
          .contains('borin_index_tags', [indexCode])
          .order('score_rodrigo', { ascending: false })
          .limit(20);

        if (error) {
          console.error('[IndicesBorinDrilldown] fetch error:', error);
          setArticles([]);
        } else {
          setArticles((data as DrilldownArticle[]) || []);
        }
      } catch (e) {
        console.error('[IndicesBorinDrilldown] unexpected error:', e);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, [indexCode]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const color = INDEX_COLORS[indexCode] || '#64748b';

  return (
    <div
      data-testid="indices-borin-drilldown"
      className="p-4 rounded-xl border border-slate-700/50 bg-slate-900/80"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-black px-2 py-1 rounded"
            style={{ background: `${color}22`, color }}
          >
            {indexCode}
          </span>
          <h3 className="text-sm font-bold text-slate-200">{indexName}</h3>
          <span className="text-xs text-slate-500">
            {articles.length} artigo{articles.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          data-testid="drilldown-close"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-700 transition text-slate-400 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8 text-slate-500 font-mono text-sm">
          Carregando artigos...
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-8">
          <FileText size={32} className="mx-auto mb-2 opacity-50 text-slate-500" />
          <p className="text-slate-500 font-mono text-sm">
            Nenhum artigo com tag {indexCode}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {articles.map(article => (
            <div
              key={article.id}
              data-testid="drilldown-article"
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-700/30 bg-slate-800/50 hover:bg-slate-800 transition"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-200 truncate">
                  {article.title}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">
                    {article.category}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {formatDate(article.processed_at)}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className="text-sm font-black"
                  style={{ color }}
                >
                  {article.score_rodrigo ?? '--'}
                </div>
                <div className="text-[10px] text-slate-500">score</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
