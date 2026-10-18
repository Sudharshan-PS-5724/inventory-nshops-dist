export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
export const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

function usableUrl(value: string | undefined) {
  try {
    const parsed = new URL(value ?? "");
    return (
      ["http:", "https:"].includes(parsed.protocol) &&
      !parsed.hostname.includes("your-project") &&
      !parsed.hostname.includes("replace-me")
    );
  } catch {
    return false;
  }
}

export const hasLiveConfiguration = Boolean(
  usableUrl(supabaseUrl) &&
  supabaseAnonKey &&
  !supabaseAnonKey.startsWith("replace-"),
);
