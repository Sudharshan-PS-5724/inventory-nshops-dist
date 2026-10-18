export interface MobileSession {
  readonly userName: string;
  readonly role: "Administrator" | "Shop user";
  readonly mode: "fallback" | "live";
}

export { hasLiveConfiguration as hasSupabaseConfiguration } from "../auth/config";

export function createFallbackSession(): MobileSession {
  return {
    userName: "PS",
    role: "Administrator",
    mode: "fallback",
  };
}

export function createLiveSession(
  email: string | undefined,
  serverRole: "ADMIN" | "SHOP_USER",
): MobileSession {
  return {
    userName: email?.split("@")[0] || "Account",
    role: serverRole === "ADMIN" ? "Administrator" : "Shop user",
    mode: "live",
  };
}
