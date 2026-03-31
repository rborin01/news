import React, { useMemo, useState } from 'react';
import { NewsAnalysis } from '../types';
import { callGeminiProxy } from '../services/supabaseClient';
import { TrendingUp, Clock, Star, BarChart3, Loader2, RefreshCw } from 'lucide-react';

interface IntelDashboardProps {
  normalizedNews: NewsAnalysis[];
  queueStats: { pending: number; processing: number; done: number; error: number } | null;
}

interface BusinessDef {
  slug: string;
  name: string;
  icon: string;
  color: string;
  match: (n: NewsAnalysis) => boolean;
}

const BUSINESSES: BusinessDef[] = [
  {
    slug: 'agrovision', name: 'AgroVision', icon: '🌾', color: '#4caf50',
    match: (n) => (n as any).level_2_project === 'AgroVision' ||
      (n as any).level_1_domain === 'Agro_Commodities' ||
      (n.category || '').includes('Agroneg'),
  },
  {
    slug: 'quantumcore', name: 'QuantumCore', icon: '💹', color: '#ff9800',
    match: (n) => (n as any).level_2_project === 'QuantumCore' ||
      (n as any).level_1_domain === 'Finance_Trading' ||
      (n.category || '').includes('Mercado Financeiro'),
  },
  {
    slug: 'neurohealth', name: 'NeuroHealth', icon: '🧬', color: '#e91e63',
    match: (n) => (n as any).level_2_project === 'NeuroHealth' ||
      (n as any).level_1_domain === 'Health_Bio' ||
      (n.category || '').includes('Saude') || (n.category || '').includes('Sa\u00fade'),
  },
  {
    slug: 'neurogrid', name: 'NeuroGrid', icon: '⚡', color: '#ff5722',
    match: (n) => (n as any).level_2_project === 'NeuroGrid' ||
      (n as any).level_1_domain === 'Energy' ||
      (n.category || '').includes('Energia'),
  },
  {
    slug: 'neurosoft', name: 'NeuroSoft', icon: '🤖', color: '#2196f3',
    match: (n) => (n as any).level_2_project === 'NeuroSoft' ||
      (n as any).level_1_domain === 'Tech_AI' ||
      (n.category || '').includes('Tecnologia'),
  },
  {
    slug: 'pulsai', name: 'PulsAI', icon: '📡', color: '#9c27b0',
    match: (n) => (n as any).level_2_project === 'PulsAI' ||
      (n.category || '').includes('Tecnologia & IA'),
  },
];

function isWithinHours(dateStr: string | undefined, hours: number): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() < hours * 3600 * 1000;
}

export const IntelDashboard: React.FC<IntelDashboardProps> = ({ normalizedNews, queueStats }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const stats = useMemo(() => {
    const total = normalizedNews.length;
    const today = normalizedNews.filter(n => isWithinHours(n.dateAdded, 24)).length;
    const recent48 = normalizedNews.filter(n => isWithinHours(n.dateAdded, 48)).length;
    const highScore = normalizedNews.filter(n => (n.relevanceScore || 0) >= 70).length;
    const scores = normalizedNews.map(n => n.relevanceScore || 0).filter(s => s > 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { total, today, recent48, highScore, avgScore };
  }, [normalizedNews]);

  const businessStats = useMemo(() => {
    return BUSINESSES.map(biz => {
      const articles = normalizedNews.filter(biz.match);
      const fresh = articles.filter(n => isWithinHours(n.dateAdded, 48));
      const topScore = articles.length > 0
        ? Math.max(...articles.map(n => n.relevanceScore || 0))
        : 0;
      return { ...biz, count: articles.length, fresh: fresh.length, topScore };
    });
  }, [normalizedNews]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const collectRes = await callGeminiProxy('collect_rss', {});
      console.log('[IntelDashboard] Collected:', collectRes.collected);
      const processRes = await callGeminiProxy('process_queue', { batchSize: 20 });
      console.log('[IntelDashboard] Processed:', processRes.processed);
      // Trigger page reload to show new data
      window.location.reload();
    } catch (e) {
      console.error('[IntelDashboard] Refresh error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Stats Row */}
      <div data-testid="intel-stats" className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Artigos" value={stats.total} icon={<BarChart3 size={16} />} color="blue" />
        <StatCard label="Hoje (24h)" value={stats.today} icon={<Clock size={16} />} color="green" />
        <StatCard label="Recentes 48h" value={stats.recent48} icon={<TrendingUp size={16} />} color="cyan" />
        <StatCard label="Score &ge; 70" value={stats.highScore} icon={<Star size={16} />} color="amber" />
        <StatCard label="Media Score" value={stats.avgScore} icon={<BarChart3 size={16} />} color="purple" />
      </div>

      {/* Business Briefings */}
      <div data-testid="intel-briefings">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Business Intelligence</h3>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-xs font-bold text-cyan-400 transition disabled:opacity-50"
          >
            {isRefreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {isRefreshing ? 'Atualizando...' : 'Atualizar Pipeline'}
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {businessStats.map(biz => (
            <div
              key={biz.slug}
              className="relative p-4 rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 hover:border-slate-600 transition-all group overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 w-full h-0.5"
                style={{ background: biz.color }}
              />
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{biz.icon}</span>
                <span className="text-xs font-bold text-slate-300 truncate">{biz.name}</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-black text-white">{biz.count}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {biz.fresh > 0 ? `${biz.fresh} recentes` : 'sem recentes'}
                  </div>
                </div>
                {biz.topScore > 0 && (
                  <div
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: `${biz.color}22`, color: biz.color }}
                  >
                    Top {biz.topScore}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline Status */}
      <div data-testid="intel-pipeline" className="flex items-center gap-4 px-4 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs">
        <span className="font-bold text-slate-400 uppercase tracking-wider">Pipeline:</span>
        <PipelineBadge label="Pendentes" value={queueStats?.pending ?? 0} color="yellow" />
        <PipelineBadge label="Processando" value={queueStats?.processing ?? 0} color="blue" />
        <PipelineBadge label="Concluidos" value={queueStats?.done ?? 0} color="green" />
        {(queueStats?.error ?? 0) > 0 && <PipelineBadge label="Erros" value={queueStats?.error ?? 0} color="red" />}
      </div>
    </div>
  );
};

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-400',
    green: 'from-green-500/10 to-green-600/5 border-green-500/20 text-green-400',
    cyan: 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/20 text-cyan-400',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-400',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20 text-purple-400',
  };
  const cls = colorMap[color] || colorMap.blue;

  return (
    <div className={`p-3 rounded-xl border bg-gradient-to-br ${cls}`}>
      <div className="flex items-center gap-1.5 mb-1 opacity-70">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function PipelineBadge({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    yellow: 'bg-yellow-500/10 text-yellow-400',
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    red: 'bg-red-500/10 text-red-400',
  };
  const cls = colorMap[color] || colorMap.blue;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${cls} font-medium`}>
      {label}: <strong>{value}</strong>
    </span>
  );
}
