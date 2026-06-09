import { getSupabaseAdmin } from "@/lib/supabase";
import type { TweetAnalysis, PaginatedResult } from "@/types";

const TABLE = "tweet_analysis";

export const AnalysisRepository = {
  async findAll(opts?: {
    page?: number;
    pageSize?: number;
    tweetId?: string;
    category?: string;
    sentiment?: string;
  }): Promise<PaginatedResult<TweetAnalysis & { tweet?: { content: string; author?: { username: string; display_name: string } } }>> {
    const supabase = await getSupabaseAdmin();
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from(TABLE)
      .select("*, tweet:tweets(content, author:authors(username, display_name))", {
        count: "exact",
      });

    if (opts?.tweetId) {
      query = query.eq("tweet_id", opts.tweetId);
    }
    if (opts?.category) {
      query = query.eq("category", opts.category);
    }
    if (opts?.sentiment) {
      query = query.eq("sentiment", opts.sentiment);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Failed to fetch analysis: ${error.message}`);

    return {
      data: data as (TweetAnalysis & { tweet?: { content: string; author?: { username: string; display_name: string } } })[],
      total: count ?? 0,
      page,
      pageSize,
    };
  },

  async findById(id: string): Promise<TweetAnalysis | null> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch analysis: ${error.message}`);
    }

    return data as TweetAnalysis;
  },

  async findByTweetId(tweetId: string): Promise<TweetAnalysis | null> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("tweet_id", tweetId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch analysis by tweet_id: ${error.message}`);
    }

    return data as TweetAnalysis;
  },

  async create(input: {
    tweet_id: string;
    translation: string;
    summary: string;
    keywords: string[];
    category: string;
    sentiment: "Bullish" | "Bearish" | "Neutral";
  }): Promise<TweetAnalysis> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await (supabase.from(TABLE) as any)
      .insert({
        tweet_id: input.tweet_id,
        translation: input.translation,
        summary: input.summary,
        keywords: input.keywords,
        category: input.category,
        sentiment: input.sentiment,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create analysis: ${error.message}`);

    return data as unknown as TweetAnalysis;
  },

  async getTodayCount(): Promise<number> {
    const supabase = await getSupabaseAdmin();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    if (error) throw new Error(`Failed to count today's analysis: ${error.message}`);

    return count ?? 0;
  },

  async getRecentAnalysis(limit = 10): Promise<TweetAnalysis[]> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error)
      throw new Error(`Failed to fetch recent analysis: ${error.message}`);

    return (data as TweetAnalysis[]) ?? [];
  },

  async getPopularKeywords(limit = 20): Promise<{ keyword: string; count: number }[]> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("keywords");

    if (error) throw new Error(`Failed to fetch keywords: ${error.message}`);

    const keywordCount = new Map<string, number>();
    for (const row of data as { keywords: string[] }[]) {
      for (const kw of row.keywords || []) {
        keywordCount.set(kw, (keywordCount.get(kw) || 0) + 1);
      }
    }

    return Array.from(keywordCount.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },
};
