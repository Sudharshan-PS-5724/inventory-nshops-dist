import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import {
  createClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";

import {
  supabaseUrl as url,
  supabaseAnonKey as anonKey,
  hasLiveConfiguration,
} from "./config";
export { hasLiveConfiguration } from "./config";

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// Browser preview keeps tokens in memory rather than using an unsupported native module.
const browserSession = new Map<string, string>();
const browserStorage = {
  getItem: async (key: string) => browserSession.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    browserSession.set(key, value);
  },
  removeItem: async (key: string) => {
    browserSession.delete(key);
  },
};

export const supabase: SupabaseClient | null =
  hasLiveConfiguration && url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: Platform.OS === "web" ? browserStorage : secureStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export async function restoreSupabaseSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
