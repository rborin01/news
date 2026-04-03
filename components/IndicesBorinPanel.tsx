import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { BarChart3 } from 'lucide-react';
import { IndicesBorinChart } from './IndicesBorinChart';
import { IndicesBorinDrilldown } from './IndicesBorinDrilldown';

export interface DailySnapshot {
  id: string;
  date: string;
  index_code: string;
  article_count: number;
  avg_score_rodrigo: number | null;
  avg_score_brasil: number | null;
  top_articles: string[] | null;
  sentiment_label: string | null;
}

export const BORIN_INDICES: Record<string, string> = {
  IIR: 'Inflacao Real',
  IREF: 'Eficiencia Fiscal',
  ICR: 'Custo da Regulacao',
  IGE: 'Governanca Efetiva',
  ICN: 'Conformidade Normativa',
  IAN: 'Adaptabilidade Nacional',
  IMP: 'Mentalidade de Prosperidade',
  ICD: 'Custo da Desconfianca',
  IPR: 'Prosperidade Real',
};

export const INDEX_COLORS: Record<string, string> = {
  IIR: '#ef4444',
  IREF: '#f97316',
  ICR: '#eab308',
  IGE: '#22c55e',
  ICN: '#06b6d4',
  IAN: '#3b82f6',
  IMP: '#8b5cf6',
  ICD: '#ec4899',
  IPR: '#14b8a6',
};

const INDEX_CODES = Object.keys(BORIN_INDICES);

function sentimentEmoji(label: string | null): string {
  if (!label) return '---';
  const l = label.toLowerCase();
  if (l === 'positive' || l === 'positivo') return '\u{1F60A}';
  if (l === 'negative' || l === 'negativo') return '\u{1F61F}';
  return '\u{1F610}';
}

export const IndicesBorinPanel: React.FC = () => {
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<string | null>(null);
  const [selectedIndicesChart, setSelectedIndicesChart] = useState<string[]>(INDEX_CODES);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('borin_indices_daily')
          .select('*')
          .gte('date', dateStr)
          .order('date', { ascending: true });

        if (error) {
          console.error('[IndicesBorinPanel] fetch error:', error);
          setSnapshots([]);
        } else {
          setSnapshots(data || []);
        }
      } catch (e) {
        console.error('[IndicesBorinPanel] unexpected error:', e);
        setSnapshots([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const todayStr = useMemo(() => {
    const now = new Date();
    const utc3 = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    return utc3.toISOString().split('T')[0];
  }, []);

  const todaySnapshots = useMemo(() => {
    return snapshots.filter(s => s.date === todayStr);
  }, [snapshots, todayStr]);

  const handleToggleIndex = (code: string) => {
    setSelectedIndicesChart(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  if (loading) {
    return (
      <div data-testid="indices-borin-panel" className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <h2 className="text-lg font-mono font-bold text-slate-300 uppercase">
            Indices Borin
          </h2>
        </div>
        <div className="text-center py-12 text-slate-500 font-mono text-sm">
          Carregando indices...
        </div>
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div data-testid="indices-borin-panel" className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-amber-500 rounded-full" />
          <h2 className="text-lg font-mono font-bold text-slate-300 uppercase">
            Indices Borin
          </h2>
        </div>
        <div className="text-center py-12 bg-slate-900 rounded-xl border border-dashed border-slate-700">
          <BarChart3 size={48} className="mx-auto mb-4 opacity-50 text-slate-500" />
          <p className="text-slate-400 font-mono">
            Sem dados &mdash; execute o snapshot do dia
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="indices-borin-panel" className="mb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <h2 className="text-lg font-mono font-bold text-slate-300 uppercase">
            Indices Borin
          </h2>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          {todaySnapshots.length} indices hoje &middot; {snapshots.length} snapshots (30d)
        </div>
      </div>

      {/* 9 Index Cards */}
      <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-9 gap-3">
        {INDEX_CODES.map(code => {
          const snap = todaySnapshots.find(s => s.index_code === code);
          const isSelected = selectedIndex === code;
          return (
            <button
              key={code}
              data-testid={`index-card-${code}`}
              onClick={() => setSelectedIndex(isSelected ? null : code)}
              className={`relative p-3 rounded-xl border text-left transition-all group overflow-hidden ${
                isSelected
                  ? 'border-amber-500/60 bg-amber-500/10 ring-1 ring-amber-500/30'
                  : 'border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 hover:border-slate-600'
              }`}
            >
              <div
                className="absolute top-0 left-0 w-full h-0.5"
                style={{ background: INDEX_COLORS[code] }}
              />
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  data-testid={`index-badge-${code}`}
                  className="text-[10px] font-black px-1.5 py-0.5 rounded"
                  style={{
                    background: `${INDEX_COLORS[code]}22`,
                    color: INDEX_COLORS[code],
                  }}
                >
                  {code}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 truncate mb-2">
                {BORIN_INDICES[code]}
              </div>
              {snap ? (
                <>
                  <div className="flex items-end justify-between">
                    <div>
                      <div
                        data-testid={`index-count-${code}`}
                        className="text-xl font-black text-white"
                      >
                        {snap.article_count}
                      </div>
                      <div className="text-[10px] text-slate-500">artigos</div>
                    </div>
                    <div className="text-right">
                      <div
                        data-testid={`index-score-${code}`}
                        className="text-sm font-bold text-white"
                      >
                        {snap.avg_score_rodrigo !== null
                          ? Math.round(snap.avg_score_rodrigo)
                          : '--'}
                      </div>
                      <div className="text-lg">
                        {sentimentEmoji(snap.sentiment_label)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-slate-600 italic">sem snapshot</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <IndicesBorinChart
        data={snapshots}
        selectedIndices={selectedIndicesChart}
        onToggleIndex={handleToggleIndex}
      />

      {/* Drilldown */}
      {selectedIndex && (
        <IndicesBorinDrilldown
          indexCode={selectedIndex}
          indexName={BORIN_INDICES[selectedIndex]}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </div>
  );
};
