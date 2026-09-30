import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { env } from '@/core/config/env';

import type { Database } from './database.generated';

function createVitrinaClient(url: string, key: string) {
  return createClient<Database, 'vitrina'>(url, key, {
    db: { schema: 'vitrina' },
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export type VitrinaSupabaseClient = ReturnType<typeof createVitrinaClient>;

let client: VitrinaSupabaseClient | null = null;

/** Lazy singleton, typed with the generated `vitrina` schema types (`npm run db:types`). */
export function getSupabaseClient(): VitrinaSupabaseClient {
  if (client) return client;

  const { supabaseUrl: url, supabasePublishableKey: key } = env;
  if (!url || !key) throw new Error('Supabase is not configured');

  const created = createVitrinaClient(url, key);

  AppState.addEventListener('change', (state) => {
    if (state === 'active') void created.auth.startAutoRefresh();
    else void created.auth.stopAutoRefresh();
  });

  client = created;
  return created;
}
