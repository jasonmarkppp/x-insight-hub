import { NextResponse } from "next/server";
import { SettingsRepository } from "@/repositories/settings.repository";
import { getAllSettings, invalidateSettingsCache } from "@/services/settings.service";
import type { AppSettings } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Mask a secret value — show only last 4 chars.
 */
function maskValue(value?: string): string {
  if (!value) return "";
  if (value.length <= 8) return "••••" + value.slice(-4);
  return "••••••••" + value.slice(-4);
}

/**
 * GET /api/settings
 * Returns all settings with values masked, plus status flags.
 */
export async function GET() {
  try {
    const settings = await getAllSettings();

    const masked: Record<string, { value: string; configured: boolean }> = {};
    for (const [key, value] of Object.entries(settings)) {
      const typedKey = key as keyof AppSettings;
      const isConfigured = !!value && !value.includes("placeholder");
      masked[key] = {
        value: isConfigured ? maskValue(value) : "",
        configured: isConfigured,
      };
    }

    return NextResponse.json({
      settings: masked,
      envOverrides: {
        supabase: !!(
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.SUPABASE_SERVICE_ROLE_KEY
        ),
        twitter: !!process.env.TWITTER_BEARER_TOKEN,
        deepseek: !!process.env.DEEPSEEK_API_KEY,
        feishu: !!process.env.FEISHU_WEBHOOK_URL,
        cron: !!process.env.CRON_SECRET,
      },
    });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/settings
 * Update settings. Accepts a partial AppSettings object.
 */
export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<AppSettings>;

    // Only allow known keys
    const allowedKeys: (keyof AppSettings)[] = [
      "supabase_url",
      "supabase_anon_key",
      "supabase_service_role_key",
      "twitter_bearer_token",
      "deepseek_api_key",
      "feishu_webhook_url",
      "cron_secret",
    ];

    const cleaned: Partial<AppSettings> = {};
    for (const key of allowedKeys) {
      if (key in body) {
        const val = body[key];
        cleaned[key] = typeof val === "string" ? val.trim() : "";
      }
    }

    if (Object.keys(cleaned).length === 0) {
      return NextResponse.json(
        { error: "No valid settings provided" },
        { status: 400 },
      );
    }

    const success = await SettingsRepository.saveSettings(cleaned);
    if (!success) {
      return NextResponse.json(
        { error: "Failed to save settings to database" },
        { status: 500 },
      );
    }

    // Invalidate in-memory cache
    invalidateSettingsCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 },
    );
  }
}
