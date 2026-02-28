// Monitor do Pipeline True Press
// Acesse /monitor no site para ver status da fila em tempo real

import { useState, useEffect } from 'react';

import { supabase } from '../services/supabaseClient';

interface Stats {

  pending: number; processing: number; done: number; error: number; processed: number;

}

async function getStats(): Promise<Stats> {

  const counts = await Promise.all([

    supabase.from('raw_news').select('*', { count: 'exact', head: true }).eq('status', 'pending'),

    supabase.from('raw_news').select('*', { count: 'exact', head: true }).eq('status', 'processing'),

    supabase.from('raw_news').select('*', { count: 'exact', head: true }).eq('status', 'done'),

    supabase.from('raw_news').select('*', { count: 'exact', head: true }).eq('status', 'error'),

    supabase.from('processed_news').select('*', { count: 'exact', head: true }),

  ]);

  return {

    pending: counts[0].count || 0,

    processing: counts[1].count || 0,

    done: counts[2].count || 0,

    error: counts[3].count || 0,

    processed: counts[4].count || 0,

  };

}

export default function Monitor() {

  const [stats, setStats] = useState<Stats | null>(null);

  const [lastUpdate, setLastUpdate] = useState('');

  const load = async () => {

    const s = await getStats();

    setStats(s);

    setLastUpdate(new Date().toLocaleTimeString('pt-BR'));

  };

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  const total = stats ? stats.pending + stats.processing + stats.done + stats.error : 0;

  const pct = total > 0 ? Math.round(((stats!.done) / total) * 100) : 0;

  const remaining = stats ? stats.pending + stats.processing : 0;

  const eta = remaining > 0 ? (remaining / (10 * 60 / 35)).toFixed(1) : '0';

  return (

    <div style={{ background: '#030712', minHeight: '100vh', color: 'white', padding: '24px', fontFamily: 'monospace' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>

        <div>

          <h1 style={{ color: '#60a5fa', margin: 0, fontSize: '22px' }}>⚡ TRUE PRESS MONITOR</h1>

          <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0 0' }}>Pipeline RSS → Gemini → Supabase</p>

        </div>

        <button onClick={load} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>↻ Atualizar</button>

      </div>

      {stats && (

        <>

          <div style={{ background: '#111827', borderRadius: '12px', padding: '24px', marginBottom: '24px', border: '1px solid #1f2937' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>

              <span style={{ color: '#9ca3af' }}>Progresso da Fila</span>

              <span style={{ fontSize: '24px', fontWeight: 'bold', color: pct < 30 ? '#ef4444' : pct < 70 ? '#f59e0b' : '#22c55e' }}>{pct}%</span>

            </div>

            <div style={{ background: '#1f2937', borderRadius: '999px', height: '20px', overflow: 'hidden' }}>

              <div style={{ height: '100%', borderRadius: '999px', width: `${pct}%`, background: pct < 30 ? '#ef4444' : pct < 70 ? '#f59e0b' : '#22c55e', transition: 'width 0.5s' }} />

            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>

              <span>{stats.done} concluídas</span><span>{total} total</span>

            </div>

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

            {[

              { l: '✅ DONE', v: stats.done, c: '#4ade80' },

              { l: '⏳ PENDING', v: stats.pending, c: '#facc15' },

              { l: '⚙️ PROCESSING', v: stats.processing, c: '#60a5fa' },

              { l: '❌ ERROR', v: stats.error, c: '#f87171' },

            ].map(x => (

              <div key={x.l} style={{ background: '#111827', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid #1f2937' }}>

                <div style={{ fontSize: '32px', fontWeight: 'bold', color: x.c }}>{x.v}</div>

                <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>{x.l}</div>

              </div>

            ))}

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

            <div style={{ background: '#111827', borderRadius: '12px', padding: '24px', border: '1px solid #3b0764' }}>

              <div style={{ color: '#c084fc', fontSize: '13px' }}>🧠 PROCESSED_NEWS</div>

              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#d8b4fe', margin: '4px 0' }}>{stats.processed}</div>

              <div style={{ color: '#6b7280', fontSize: '12px' }}>Notícias analisadas pelo Gemini</div>

            </div>

            <div style={{ background: '#111827', borderRadius: '12px', padding: '24px', border: '1px solid #164e63' }}>

              <div style={{ color: '#22d3ee', fontSize: '13px' }}>⏱️ ETA FILA</div>

              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#67e8f9', margin: '4px 0' }}>{eta}h</div>

              <div style={{ color: '#6b7280', fontSize: '12px' }}>{remaining} pendentes ÷ ~17/hora</div>

            </div>

          </div>

          <div style={{ background: '#111827', borderRadius: '12px', padding: '20px', border: '1px solid #1f2937' }}>

            <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '12px' }}>🤖 CRON JOBS (servidor — site não precisa ficar aberto)</div>

            <div style={{ fontSize: '13px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>

              <span>true-press-pipeline</span><span style={{ color: '#4ade80' }}>*/30min → ingest_rss</span>

            </div>

            <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>

              <span>true-press-process</span><span style={{ color: '#4ade80' }}>*/35min → process_queue(10)</span>

            </div>

            {lastUpdate && <div style={{ color: '#4b5563', fontSize: '11px', marginTop: '12px', textAlign: 'right' }}>Atualizado: {lastUpdate}</div>}

          </div>

        </>

      )}

    </div>

  );

}
