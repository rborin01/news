import React, { useState, useEffect } from 'react';
import { Pen, RefreshCw, Trash2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { OwnArticle, generateArticle, listOwnArticles, deleteOwnArticle } from '../services/ownPressService';

const CATEGORIES = ['Agronegócio', 'Política', 'Mercado Financeiro', 'Geopolítica', 'Tecnologia', 'Jurídico', 'Outros'];

interface ArticleCardProps {
  article: OwnArticle;
  onDelete: (id: string) => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{article.category}</span>
          <span className="text-[10px] text-slate-400">{new Date(article.created_at).toLocaleString('pt-BR')}</span>
        </div>
        <h3 className="font-black text-slate-800 text-base leading-tight mb-2">{article.headline}</h3>
        <p className="text-sm text-slate-600 font-medium leading-relaxed mb-3 italic">{article.lede}</p>
        {expanded && (
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap mb-3">{article.body}</p>
        )}
        {article.sources?.length > 0 && expanded && (
          <div className="text-[10px] text-slate-400 font-mono">
            Fontes: {article.sources.join(', ')}
          </div>
        )}
      </div>
      <div className="border-t border-slate-100 px-4 py-2 flex justify-between items-center">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-blue-600 font-bold hover:text-blue-800 transition">
          {expanded ? <><ChevronUp size={14} /> Recolher</> : <><ChevronDown size={14} /> Ler Artigo</>}
        </button>
        <button onClick={() => onDelete(article.id)} className="p-1 text-slate-300 hover:text-red-500 transition"><Trash2 size={14} /></button>
      </div>
    </div>
  );
};

export const OwnPressPanel: React.FC = () => {
  const [articles, setArticles] = useState<OwnArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [category, setCategory] = useState('Agronegócio');

  const load = async () => {
    setLoading(true);
    try {
      const data = await listOwnArticles(50);
      setArticles(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const article = await generateArticle(topic, context || `Categoria: ${category}. Escreva com rigor jornalístico.`);
      setArticles(prev => [article, ...prev]);
      setTopic('');
      setContext('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteOwnArticle(id);
      setArticles(prev => prev.filter(a => a.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="w-full max-w-[1800px] mx-auto">
      {/* HEADER */}
      <div className="mb-8 p-6 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl shadow-xl text-white">
        <h2 className="text-xl font-black uppercase tracking-widest text-emerald-400 mb-1 flex items-center gap-2">
          <Pen size={20} /> Minha Imprensa
        </h2>
        <p className="text-slate-400 text-sm">Jornalismo próprio — pesquisa primária + IA. Artigos originais para QuantumCore, AgroVision e NeuroGrid.</p>
      </div>

      {/* GENERATOR */}
      <div className="mb-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="font-black text-slate-700 text-sm uppercase tracking-widest mb-4">Gerar Novo Artigo</h3>

        {error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Tema / Pauta</label>
            <input
              type="text"
              placeholder="Ex: Impacto da crise hídrica na soja de MS"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Categoria</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Contexto / Fontes (opcional)</label>
              <input
                type="text"
                placeholder="Links, dados, ou contexto adicional"
                value={context}
                onChange={e => setContext(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!topic.trim() || generating}
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? <><RefreshCw size={16} className="animate-spin" /> Gerando artigo...</> : <><Pen size={16} /> Gerar Artigo</>}
          </button>
        </div>
      </div>

      {/* ARTICLES LIST */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-slate-700 uppercase tracking-widest text-sm">{articles.length} Artigos</h3>
        <button onClick={load} disabled={loading} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {loading && articles.length === 0 ? (
        <div className="text-center py-20 text-slate-400">Carregando artigos...</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
          <Pen size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-400 font-bold">Nenhum artigo gerado ainda.</p>
          <p className="text-slate-400 text-sm">Digite um tema acima e clique em Gerar Artigo.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map(a => <ArticleCard key={a.id} article={a} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  );
};
