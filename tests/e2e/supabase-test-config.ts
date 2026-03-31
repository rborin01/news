/**
 * Shared Supabase config for E2E tests.
 * SUPABASE_ANON_KEY is a PUBLIC read-only key — safe to include in tests.
 * See: https://supabase.com/docs/guides/api/api-keys (anon key is client-safe)
 */

export const SUPABASE_URL = 'https://sfnvctljxidzueoutnxv.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbnZjdGxqeGlkenVlb3V0bnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTI5OTcsImV4cCI6MjA4NzY4ODk5N30.Yg65dHXyZqzBWNHM1nW-YfBx7FWFpWyoFvM_Obj-wQI';
export const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/gemini-proxy`;
