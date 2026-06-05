import { supabase } from './supabaseClient';

export interface ProfessionalProfile {
  profession: string;
  specialty: string;
  location: string;
  keywords: string[];
}

export interface Briefing {
  id: string;
  user_id: string;
  profession: string;
  specialty: string;
  keywords: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  analysis: string | null;
  generated_at: string;
}

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_BRIEFING_WEBHOOK_URL as string;

export async function saveProfessionalProfile(
  userId: string,
  profile: ProfessionalProfile
): Promise<void> {
  const { error } = await supabase
    .from('professional_profiles')
    .upsert({ user_id: userId, ...profile }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}

export async function getProfessionalProfile(
  userId: string
): Promise<ProfessionalProfile | null> {
  const { data, error } = await supabase
    .from('professional_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data ?? null;
}

export async function requestBriefing(
  userId: string,
  profession: string,
  specialty: string,
  keywords: string[]
): Promise<string> {
  const { data, error } = await supabase
    .from('briefings')
    .insert({ user_id: userId, profession, specialty, keywords, status: 'pending' })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  const briefingId: string = data.id;
  if (N8N_WEBHOOK_URL) {
    await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ briefing_id: briefingId, user_id: userId, profession, specialty, keywords }),
    }).catch((err) => console.error('[briefingService] webhook error:', err));
  }
  return briefingId;
}

export async function getBriefings(
  userId: string,
  limit = 10
): Promise<Briefing[]> {
  const { data, error } = await supabase
    .from('briefings')
    .select('*')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}
