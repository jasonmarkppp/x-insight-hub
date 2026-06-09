import { createClient } from "@supabase/supabase-js";
import type { AppSettings } from "@/types";

// Settings repository uses the anon key directly.
// RLS must be disabled on the settings table for this to work.
// (Default Supabase behavior: RLS is ON for new tables.)
let settingsClient: ReturnType<typeof createClient> | null = null;

function getSettingsClient() {
  if (settingsClient) return settingsClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  settingsClient = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  return settingsClient;
}

export const SettingsRepository = {
  /**
   * Get all settings from the DB.
   * Returns null if no settings row exists.
   */
  async getSettings(): Promise<AppSettings | null> {
    try {
      const supabase = getSettingsClient();
      const { data, error } = await (supabase as any)
        .from("settings")
        .select("config")
        .limit(1)
        .single();

      if (error || !data) return null;
      return ((data as Record<string, unknown>).config as AppSettings) ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Upsert settings — merges partial config into the existing row.
   */
  async saveSettings(config: Partial<AppSettings>): Promise<boolean> {
    try {
      const supabase = getSettingsClient();

      // Get current config first so we can merge
      const { data: existing } = await (supabase as any)
        .from("settings")
        .select("id, config")
        .limit(1);

      if (existing && existing.length > 0) {
        const row = existing[0] as Record<string, unknown>;
        const currentConfig = (row.config as AppSettings) || {};
        // Merge new config into existing config
        const mergedConfig = {
          ...currentConfig,
          ...config,
        };
        const { error } = await (supabase as any)
          .from("settings")
          .update({ config: mergedConfig })
          .eq("id", row.id as string);

        if (error) {
          console.error("Failed to save settings:", error);
          return false;
        }
        return true;
      }

      // Insert new row with default empty values merged with provided config
      const defaultConfig: AppSettings = {
        supabase_url: "",
        supabase_anon_key: "",
        supabase_service_role_key: "",
        twitter_bearer_token: "",
        deepseek_api_key: "",
        feishu_webhook_url: "",
        cron_secret: "",
      };
      const { error } = await (supabase as any)
        .from("settings")
        .insert({ config: { ...defaultConfig, ...config } });

      if (error) {
        console.error("Failed to insert settings:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Failed to save settings:", err);
      return false;
    }
  },
};
