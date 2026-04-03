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
        <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
          Aguardando primeiro snapshot diário — execute: <code className="ml-1 bg-slate-700 px-1 rounded text-xs">POST /functions/v1/gemini-proxy {"{"}"action":"snapshot_borin_daily"{"}"}</code>
        </div>
      )}
    </div>
  );
};
