export interface MobileSession {
  readonly userName: string;
  readonly role: "Administrator" | "Shop user";
  readonly mode: "fallback" | "live";
}

export const hasSupabaseConfiguration = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL &&
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);

export function createFallbackSession(): MobileSession {
  return {
    userName: "PS",
    role: "Administrator",
    mode: "fallback",
  };
}

export function createLiveSession(email: string | undefined): MobileSession {
  return {
    userName: email?.split("@")[0] || "Account",
    role: "Administrator",
    mode: "live",
  };
}
