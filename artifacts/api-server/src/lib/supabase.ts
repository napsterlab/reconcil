import { ReplitConnectors } from "@replit/connectors-sdk";

type SupabaseRequestInit = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
};

const connectors = new ReplitConnectors();

export const persistenceMode = process.env.RECONCIL_PERSISTENCE === "supabase" ? "supabase" : "demo";

export async function supabaseRequest(path: string, init: SupabaseRequestInit = {}) {
  if (persistenceMode !== "supabase") {
    throw new Error("Supabase persistence is disabled. Set RECONCIL_PERSISTENCE=supabase.");
  }

  return connectors.proxy("supabase", path, {
    method: init.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    ...(init.body ? { body: init.body } : {}),
  });
}

export async function supabaseJson<T>(path: string, init: SupabaseRequestInit = {}): Promise<T> {
  const response = await supabaseRequest(path, init);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  return response.json() as Promise<T>;
}

export function isSupabaseEnabled() {
  return persistenceMode === "supabase";
}