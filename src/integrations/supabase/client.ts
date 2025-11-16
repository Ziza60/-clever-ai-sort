import { createClient } from '@supabase/supabase-js';

const getSupabaseConfig = () => {
  const url = localStorage.getItem('supabase_url');
  const anonKey = localStorage.getItem('supabase_anon_key');
  
  if (!url || !anonKey) {
    throw new Error('Supabase não configurado. Configure nas configurações.');
  }
  
  return { url, anonKey };
};

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const getSupabase = () => {
  if (!supabaseInstance) {
    const { url, anonKey } = getSupabaseConfig();
    supabaseInstance = createClient(url, anonKey);
  }
  return supabaseInstance;
};

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    const client = getSupabase();
    return client[prop as keyof typeof client];
  }
});
