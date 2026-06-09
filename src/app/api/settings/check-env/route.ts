import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const status = {
    supabase: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    twitter: !!process.env.TWITTER_BEARER_TOKEN,
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    feishu: !!process.env.FEISHU_WEBHOOK_URL,
    cron: !!process.env.CRON_SECRET,
  };

  return NextResponse.json(status);
}
