import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key);

export async function deriveUserId(name: string, pin: string): Promise<string> {
  const input = `rkpd:${name.toLowerCase().trim()}:${pin}`;
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function loadCloudState(userId: string): Promise<{ state: unknown; updatedAt: number } | null> {
  const { data, error } = await supabase
    .from('game_states')
    .select('state, updated_at')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return { state: data.state, updatedAt: new Date(data.updated_at).getTime() };
}

export async function saveCloudState(userId: string, state: unknown): Promise<void> {
  await supabase.from('game_states').upsert({
    user_id: userId,
    state,
    updated_at: new Date().toISOString(),
  });
}

export async function deleteCloudState(userId: string): Promise<void> {
  await supabase.from('game_states').delete().eq('user_id', userId);
}
