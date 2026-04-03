# SPEC-W36: Indices Borin Panel (DATA ROOM)

> Architect: Claude Opus | Wave: 36 | Date: 2026-04-03
> Status: RED (tests written, implementation pending)

## Overview

Add 3 React components to the DATA ROOM view that visualize the Borin Indices
from `borin_indices_daily` table and allow drill-down into tagged articles from
`processed_news`.

## Dependencies (all already in package.json)

- `recharts@3.6.0` -- LineChart for 30-day time series
- `@supabase/supabase-js` -- direct table queries via `supabase` client
- `lucide-react` -- icons (BarChart3, TrendingUp, X, FileText)

## Database Tables Used

- `borin_indices_daily` -- daily snapshots (date, index_code, article_count, avg_score_rodrigo, avg_score_brasil, top_articles, sentiment_label)
- `processed_news` -- articles with `borin_index_tags text[]` column

## Files to Create

| File | Max Lines | Purpose |
|------|-----------|---------|
| `components/IndicesBorinPanel.tsx` | 400 | Main panel with 9 cards + chart + drilldown |
| `components/IndicesBorinChart.tsx` | 200 | Recharts LineChart (30 days x indices) |
| `components/IndicesBorinDrilldown.tsx` | 250 | Article list filtered by index tag |

## File to Modify

| File | Change |
|------|--------|
| `components/Dashboard.tsx` | Import IndicesBorinPanel + render at top of DATA ROOM view |

---

## Component 1: IndicesBorinPanel.tsx

**Path**: `components/IndicesBorinPanel.tsx`

```tsx
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
```

---

## Component 2: IndicesBorinChart.tsx

**Path**: `components/IndicesBorinChart.tsx`

```tsx
import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { DailySnapshot } from './IndicesBorinPanel';
import { BORIN_INDICES, INDEX_COLORS } from './IndicesBorinPanel';

interface IndicesBorinChartProps {
  data: DailySnapshot[];
  selectedIndices: string[];
  onToggleIndex: (code: string) => void;
}

const INDEX_CODES = Object.keys(BORIN_INDICES);

export const IndicesBorinChart: React.FC<IndicesBorinChartProps> = ({
  data,
  selectedIndices,
  onToggleIndex,
}) => {
  // Pivot data: { date, IIR: score, IREF: score, ... }
  const chartData = useMemo(() => {
    const byDate: Record<string, Record<string, number | string>> = {};

    for (const snap of data) {
      if (!byDate[snap.date]) {
        byDate[snap.date] = { date: snap.date };
      }
      if (snap.avg_score_rodrigo !== null) {
        byDate[snap.date][snap.index_code] = Math.round(snap.avg_score_rodrigo);
      }
    }

    return Object.values(byDate).sort((a, b) =>
      String(a.date).localeCompare(String(b.date))
    );
  }, [data]);

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return dateStr;
  };

  return (
    <div data-testid="indices-borin-chart" className="p-4 rounded-xl border border-slate-700/50 bg-slate-900/50">
      {/* Toggle checkboxes */}
      <div className="flex flex-wrap gap-2 mb-4">
        {INDEX_CODES.map(code => (
          <label
            key={code}
            className="flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <input
              type="checkbox"
              checked={selectedIndices.includes(code)}
              onChange={() => onToggleIndex(code)}
              className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500/50"
            />
            <span
              className="font-bold"
              style={{ color: INDEX_COLORS[code] }}
            >
              {code}
            </span>
          </label>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#64748b"
              tick={{ fontSize: 10 }}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#64748b"
              tick={{ fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelFormatter={formatDate}
            />
            {selectedIndices.map(code => (
              <Line
                key={code}
                type="monotone"
                dataKey={code}
                stroke={INDEX_COLORS[code]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center py-8 text-slate-500 font-mono text-sm">
          Sem dados para o grafico
        </div>
      )}
    </div>
  );
};
```

---

## Component 3: IndicesBorinDrilldown.tsx

**Path**: `components/IndicesBorinDrilldown.tsx`

```tsx
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
```

---

## Dashboard.tsx Changes

### 1. Add import (after line 20)

```typescript
import { IndicesBorinPanel } from './IndicesBorinPanel';
```

### 2. Replace DATA ROOM block (lines 316-327)

**OLD:**
```tsx
{viewMode === 'data' && (
  <div className="space-y-6">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
        <h2 className="text-lg font-mono font-bold text-slate-300 uppercase">Arquivos (Auditoria)</h2>
      </div>
      <div className="text-xs text-slate-500 font-mono">{rawDataList.length} Dossies</div>
    </div>
    {rawDataList.map(item => <RawDataCard key={item.id} item={item} />)}
  </div>
)}
```

**NEW:**
```tsx
{viewMode === 'data' && (
  <div className="space-y-6">
    <IndicesBorinPanel />
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
        <h2 className="text-lg font-mono font-bold text-slate-300 uppercase">Arquivos (Auditoria)</h2>
      </div>
      <div className="text-xs text-slate-500 font-mono">{rawDataList.length} Dossies</div>
    </div>
    {rawDataList.map(item => <RawDataCard key={item.id} item={item} />)}
  </div>
)}
```

---

## Test File

See `tests/e2e/w36-indices-panel.spec.ts` (written separately).

## Success Criteria

- [ ] `IndicesBorinPanel.tsx` created, renders 9 index cards with data-testid attributes
- [ ] `IndicesBorinChart.tsx` created, renders Recharts LineChart with toggle checkboxes
- [ ] `IndicesBorinDrilldown.tsx` created, fetches articles via `.contains()` filter
- [ ] `Dashboard.tsx` imports and renders `<IndicesBorinPanel />` at top of DATA ROOM view
- [ ] All 7 E2E tests pass after component creation
- [ ] No file exceeds 500 lines
- [ ] No new npm dependencies added
- [ ] TypeScript compiles with zero errors
- [ ] `npm run build` succeeds
