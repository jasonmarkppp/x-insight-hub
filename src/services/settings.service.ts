import { SettingsRepository } from "@/repositories/settings.repository";
import { logger } from "@/lib/logger";
import type { AppSettings } from "@/types";

/**
 * Settings Service
 *
 * Reads runtime configuration from the DB `settings` table.
 * Falls back to environment variables when the DB value is empty/unavailable.
 *
 * Environment variables ALWAYS take precedence over DB values when present,
 * so existing .env.local / Vercel env vars continue to work unchanged.
 */

type EnvMap = {
  [K in keyof AppSettings]: string;
};

const ENV_MAP: EnvMap = {
  supabase_url: "NEXT_PUBLIC_SUPABASE_URL",
  supabase_anon_key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  supabase_service_role_key: "SUPABASE_SERVICE_ROLE_KEY",
  twitter_bearer_token: "TWITTER_BEARER_TOKEN",
  deepseek_api_key: "DEEPSEEK_API_KEY",
  feishu_webhook_url: "FEISHU_WEBHOOK_URL",
  cron_secret: "CRON_SECRET",
};

// In-memory cache for settings (re-fetched on each call via the env fallback pattern)
let cachedSettings: AppSettings | null = null;
let lastFetch = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

function isValid(value: string | undefined | null): boolean {
  return !!value && !value.includes("placeholder") && value !== "";
}

async function loadSettingsFromDb(): Promise<AppSettings | null> {
  const now = Date.now();
  if (cachedSettings && now - lastFetch < CACHE_TTL_MS) {
    return cachedSettings;
  }

  try {
    const dbSettings = await SettingsRepository.getSettings();
    if (dbSettings) {
      cachedSettings = dbSettings;
      lastFetch = now;
      return dbSettings;
    }
  } catch (err) {
    logger.warn("Failed to load settings from DB, using env fallback", err);
  }

  return null;
}

/**
 * Get a specific setting key.
 * Priority: env var > DB value > undefined
 */
export async function getSetting<K extends keyof AppSettings>(
  key: K,
): Promise<string | undefined> {
  // 1. Check env var first (always takes precedence)
  // NEXT_PUBLIC_ vars are already embedded; server-only vars checked here
  const dbSettings = await loadSettingsFromDb();
  const envKey = ENV_MAP[key];
  const envValue = process.env[envKey];
  if (isValid(envValue)) return envValue;

  // 2. Fall back to DB
  if (dbSettings) {
    const dbValue = dbSettings[key];
    if (isValid(dbValue)) return dbValue;
  }

  return undefined;
}

/**
 * Get all settings merged (env vars override DB values).
 */
export async function getAllSettings(): Promise<AppSettings> {
  const dbSettings = await loadSettingsFromDb();

  const result: AppSettings = {
    supabase_url: dbSettings?.supabase_url ?? "",
    supabase_anon_key: dbSettings?.supabase_anon_key ?? "",
    supabase_service_role_key:
      dbSettings?.supabase_service_role_key ?? "",
    twitter_bearer_token: dbSettings?.twitter_bearer_token ?? "",
    deepseek_api_key: dbSettings?.deepseek_api_key ?? "",
    feishu_webhook_url: dbSettings?.feishu_webhook_url ?? "",
    cron_secret: dbSettings?.cron_secret ?? "",
  };

  // Override with env vars if present
  for (const [key, envKey] of Object.entries(ENV_MAP)) {
    const envValue = process.env[envKey];
    if (isValid(envValue)) {
      (result as unknown as Record<string, string>)[key] = envValue!;
    }
  }

  return result;
}

/**
 * Invalidate in-memory cache so next read hits the DB.
 */
export function invalidateSettingsCache(): void {
  cachedSettings = null;
  lastFetch = 0;
}

/**
 * Get a setting synchronously (env-only, no DB lookup).
 * Use this in contexts where async is not available (e.g. module init).
 */
export function getSettingSync<K extends keyof AppSettings>(
  key: K,
): string | undefined {
  const envKey = ENV_MAP[key];
  const envValue = process.env[envKey];
  if (isValid(envValue)) return envValue;
  return undefined;
}
