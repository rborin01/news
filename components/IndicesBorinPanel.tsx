import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchBorinIndices,
  getLatestIndices,
  type BorinIndex,
} from '../services/borinIndicesService';
import { BarChart3 } from 'lucide-react';
import { IndicesBorinChart } from './IndicesBorinChart';
import { IndicesBorinDrilldown } from './IndicesBorinDrilldown';

// Mantido para compatibilidade com IndicesBorinChart, que consome esta forma.
// A fonte real e a tabela `borin_indices` (semanal); fazemos o mapeamento abaixo.
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
const HISTORY_WEEKS = 16;

// Sentimento derivado do score (schema nao possui campo de sentimento).
function sentimentEmojiFromScore(score: number | null): string {
  if (score === null || Number.isNaN(score)) return '\u{1F610}';
  if (score >= 60) return '\u{1F60A}';
  if (score <= 40) return '\u{1F61F}';
  return '\u{1F610}';
}

// Adapta os indices semanais reais para a forma que o chart espera.
function toSnapshots(history: BorinIndex[]): DailySnapshot[] {
  return history.map(row => ({
    id: row.id,
    date: row.week_start,
    index_code: row.index_code,
    article_count: row.article_count,
    avg_score_rodrigo: row.score,
    avg_score_brasil: null,
    top_articles: null,
    sentiment_label: null,
  }));
}

export const IndicesBorinPanel: React.FC = () => {
  const [latest, setLatest] = useState<Record<string, BorinIndex>>({});
  const [history, setHistory] = useState<BorinIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<string | null>(null);
  const [selectedIndicesChart, setSelectedIndicesChart] = useState<string[]>(INDEX_CODES);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [latestData, historyData] = await Promise.all([
          getLatestIndices(),
          fetchBorinIndices(HISTORY_WEEKS),
        ]);
        if (!active) return;
        setLatest(latestData);
        setHistory(historyData);
      } catch (e) {
        if (!active) return;
        console.error('[IndicesBorinPanel] unexpected error:', e);
        setLatest({});
        setHistory([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => {
      active = false;
    };
  }, []);

  const chartData = useMemo(() => toSnapshots(history), [history]);

  const latestWeek = useMemo(() => {
    let week: string | null = null;
    for (const code of Object.keys(latest)) {
      const ws = latest[code].week_start;
      if (week === null || ws > week) week = ws;
    }
    return week;
  }, [latest]);

  const formatWeek = (dateStr: string | null): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return dateStr;
  };

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

  if (Object.keys(latest).length === 0) {
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
            Sem dados &mdash; nenhum indice calculado ainda
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
          {Object.keys(latest).length} indices &middot; semana {formatWeek(latestWeek)}
        </div>
      </div>

      {/* 9 Index Cards */}
      <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-9 gap-3">
        {INDEX_CODES.map(code => {
          const snap = latest[code];
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
                      {Math.round(snap.score)}
                    </div>
                    <div className="text-lg">
                      {sentimentEmojiFromScore(snap.score)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-slate-600 italic">sem dados</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <IndicesBorinChart
        data={chartData}
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
