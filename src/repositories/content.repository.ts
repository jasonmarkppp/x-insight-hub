import { getSupabaseAdmin } from "@/lib/supabase";
import type { ContentGeneration, PaginatedResult } from "@/types";

const TABLE = "content_generation";

export const ContentRepository = {
  async findAll(opts?: {
    page?: number;
    pageSize?: number;
    tweetId?: string;
  }): Promise<
    PaginatedResult<
      ContentGeneration & { tweet?: { content: string; author?: { username: string; display_name: string } } }
    >
  > {
    const supabase = await getSupabaseAdmin();
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from(TABLE)
      .select(
        "*, tweet:tweets(content, author:authors(username, display_name))",
        { count: "exact" },
      );

    if (opts?.tweetId) {
      query = query.eq("tweet_id", opts.tweetId);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error)
      throw new Error(`Failed to fetch content generations: ${error.message}`);

    return {
      data: data as (ContentGeneration & {
        tweet?: { content: string; author?: { username: string; display_name: string } };
      })[],
      total: count ?? 0,
      page,
      pageSize,
    };
  },

  async findByTweetId(tweetId: string): Promise<ContentGeneration | null> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("tweet_id", tweetId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(
        `Failed to fetch content generation by tweet_id: ${error.message}`,
      );
    }

    return data as ContentGeneration;
  },

  async create(input: {
    tweet_id: string;
    x_version: string;
    wechat_version: string;
    xiaohongshu_title: string;
    xiaohongshu_content: string;
    tags: string[];
  }): Promise<ContentGeneration> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await (supabase.from(TABLE) as any)
      .insert({
        tweet_id: input.tweet_id,
        x_version: input.x_version,
        wechat_version: input.wechat_version,
        xiaohongshu_title: input.xiaohongshu_title,
        xiaohongshu_content: input.xiaohongshu_content,
        tags: input.tags,
      })
      .select()
      .single();

    if (error)
      throw new Error(`Failed to create content generation: ${error.message}`);

    return data as unknown as ContentGeneration;
  },

  async getTodayCount(): Promise<number> {
    const supabase = await getSupabaseAdmin();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    if (error)
      throw new Error(`Failed to count today's content: ${error.message}`);

    return count ?? 0;
  },
};
