import { useState, useEffect, useRef, useCallback } from 'react';
import { callGeminiProxy } from '../services/supabaseClient';

const INTERVAL_MS = 2_100_000; // 35 minutes
const COUNTDOWN_TICK_MS = 1_000;
const LS_KEY = 'truepress_autopilot';

export interface AutoPilotState {
  enabled: boolean;
  toggle: () => void;
  countdown: string;
  lastRunTime: string;
  isRunning: boolean;
  lastResult: string;
}

export function useAutoPilot(): AutoPilotState {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(LS_KEY) === 'true');
  const [countdown, setCountdown] = useState('');
  const [lastRunTime, setLastRunTime] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState('');
  const nextRunRef = useRef<number>(0);
  const isRunningRef = useRef(false);

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      localStorage.setItem(LS_KEY, String(next));
      if (next) {
        nextRunRef.current = Date.now(); // run immediately
      } else {
        setCountdown('');
      }
      return next;
    });
  }, []);

  const runCycle = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setIsRunning(true);
    try {
      const collectRes = await callGeminiProxy('collect_rss', {});
      const processRes = await callGeminiProxy('process_queue', { batchSize: 20 });
      const collected = collectRes?.inserted ?? collectRes?.count ?? 0;
      const processed = processRes?.processed ?? 0;
      setLastResult(`${collected} coletadas, ${processed} processadas`);
      setLastRunTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      nextRunRef.current = Date.now() + INTERVAL_MS;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message?.substring(0, 40) : 'Erro desconhecido';
      setLastResult(`Erro: ${message}`);
      nextRunRef.current = Date.now() + INTERVAL_MS;
    } finally {
      isRunningRef.current = false;
      setIsRunning(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) { setCountdown(''); return; }
    if (nextRunRef.current === 0) nextRunRef.current = Date.now();
    const tick = setInterval(() => {
      const remaining = Math.max(0, nextRunRef.current - Date.now());
      if (remaining <= 0 && !isRunningRef.current) {
        runCycle();
      }
      const totalSec = Math.ceil(remaining / 1000);
      const min = Math.floor(totalSec / 60);
      const sec = totalSec % 60;
      setCountdown(`${min}:${sec.toString().padStart(2, '0')}`);
    }, COUNTDOWN_TICK_MS);
    return () => clearInterval(tick);
  }, [enabled, runCycle]);

  return { enabled, toggle, countdown, lastRunTime, isRunning, lastResult };
}
