import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { AppSettings } from "@/types";

// ============================================================================
// globalThis singleton keys (prevents connection pool leaks in Serverless)
// ============================================================================
const GLOBAL_KEY_ADMIN = "__x_insight_hub_supabase_admin";
const GLOBAL_KEY_ADMIN_SYNC = "__x_insight_hub_supabase_admin_sync";
const GLOBAL_KEY_SETTINGS = "__x_insight_hub_settings_cache";

function getPublicEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.includes("placeholder") || value === "") {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

// Create a fetch wrapper with 3s timeout to avoid hanging on missing DB
function createFetch() {
  return async (url: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    try {
      return await fetch(url as RequestInfo, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  };
}

// Cache for service role key from settings table
interface SettingsCache {
  serviceRoleKey: string | null;
  fetchedAt: number;
}

const SERVICE_ROLE_CACHE_TTL = 60_000; // 1 minute

async function loadServiceRoleKeyFromDb(): Promise<string | undefined> {
  const now = Date.now();
  const cached = (globalThis as any)[GLOBAL_KEY_SETTINGS] as
    | SettingsCache
    | undefined;

  if (cached && cached.serviceRoleKey && now - cached.fetchedAt < SERVICE_ROLE_CACHE_TTL) {
    return cached.serviceRoleKey;
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return undefined;

    const client = createClient(url, anonKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await (client as any)
      .from("settings")
      .select("config")
      .limit(1)
      .single();

    if (error || !data) {
      (globalThis as any)[GLOBAL_KEY_SETTINGS] = {
        serviceRoleKey: null,
        fetchedAt: now,
      } satisfies SettingsCache;
      return undefined;
    }

    const config = (data as any).config as AppSettings;
    const roleKey = config.supabase_service_role_key;
    if (roleKey && !roleKey.includes("placeholder") && roleKey !== "") {
      (globalThis as any)[GLOBAL_KEY_SETTINGS] = {
        serviceRoleKey: roleKey,
        fetchedAt: now,
      } satisfies SettingsCache;
      return roleKey;
    }
  } catch {
    // DB not reachable — fall back to env var
  }

  return undefined;
}

/**
 * Admin client for server-side usage (bypasses RLS).
 * Uses globalThis singleton to prevent connection pool leaks in Serverless.
 */
export async function getSupabaseAdmin(): Promise<SupabaseClient> {
  const existing = (globalThis as any)[GLOBAL_KEY_ADMIN] as
    | SupabaseClient
    | undefined;
  if (existing) return existing;

  const url = getPublicEnv("NEXT_PUBLIC_SUPABASE_URL");

  const serviceRoleKey =
    (await loadServiceRoleKeyFromDb()) ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey || serviceRoleKey.includes("placeholder")) {
    throw new Error(
      "Missing: SUPABASE_SERVICE_ROLE_KEY (set via env or settings page)",
    );
  }

  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
    global: { fetch: createFetch() },
  });

  (globalThis as any)[GLOBAL_KEY_ADMIN] = client;
  return client;
}

/**
 * Synchronous version of getSupabaseAdmin — only uses env var, no DB lookup.
 * Use when you're certain the env var is set, or in contexts where async is unavailable.
 */
export function getSupabaseAdminSync(): SupabaseClient {
  const existing = (globalThis as any)[GLOBAL_KEY_ADMIN_SYNC] as
    | SupabaseClient
    | undefined;
  if (existing) return existing;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !roleKey || roleKey.includes("placeholder")) {
    throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
  }

  const client = createClient(url, roleKey, {
    auth: { persistSession: false },
    global: { fetch: createFetch() },
  });

  (globalThis as any)[GLOBAL_KEY_ADMIN_SYNC] = client;
  return client;
}

/**
 * Client for browser usage (always uses public anon key).
 * No globalThis caching needed — the browser module registry handles dedup.
 */
export function getSupabaseClient(): SupabaseClient {
  return createClient(
    getPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: { persistSession: false },
      global: { fetch: createFetch() },
    },
  );
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!(url && !url.includes("placeholder") && url !== "");
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
