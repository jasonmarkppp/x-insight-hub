import { getSupabaseAdmin } from "@/lib/supabase";
import type { Tweet, TweetWithAuthor, PaginatedResult } from "@/types";

const TABLE = "tweets";

export const TweetRepository = {
  async findAll(opts?: {
    page?: number;
    pageSize?: number;
    authorId?: string;
    search?: string;
    processed?: boolean;
  }): Promise<PaginatedResult<TweetWithAuthor>> {
    const supabase = await getSupabaseAdmin();
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from(TABLE)
      .select("*, author:authors!inner(*)", { count: "exact" });

    if (opts?.authorId) {
      query = query.eq("author_id", opts.authorId);
    }

    if (opts?.processed !== undefined) {
      query = query.eq("processed", opts.processed);
    }

    if (opts?.search) {
      query = query.ilike("content", `%${opts.search}%`);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Failed to fetch tweets: ${error.message}`);

    return {
      data: (data as TweetWithAuthor[]) ?? [],
      total: count ?? 0,
      page,
      pageSize,
    };
  },

  async findById(id: string): Promise<TweetWithAuthor | null> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*, author:authors(*)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch tweet: ${error.message}`);
    }

    return data as TweetWithAuthor;
  },

  async findByTweetId(tweetId: string): Promise<Tweet | null> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("tweet_id", tweetId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch tweet by tweet_id: ${error.message}`);
    }

    return data as Tweet;
  },

  async create(input: {
    tweet_id: string;
    author_id: string;
    content: string;
    raw_json?: Record<string, unknown>;
    created_at?: string;
  }): Promise<Tweet> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await (supabase.from(TABLE) as any)
      .insert({
        tweet_id: input.tweet_id,
        author_id: input.author_id,
        content: input.content,
        raw_json: (input.raw_json as Record<string, unknown>) ?? {},
        created_at: input.created_at ?? new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create tweet: ${error.message}`);

    return data as unknown as Tweet;
  },

  async markProcessed(id: string): Promise<void> {
    const supabase = await getSupabaseAdmin();
    const { error } = await (supabase.from(TABLE) as any)
      .update({ processed: true })
      .eq("id", id);

    if (error) throw new Error(`Failed to mark tweet as processed: ${error.message}`);
  },

  async markPushedToFeishu(id: string): Promise<void> {
    const supabase = await getSupabaseAdmin();
    const { error } = await (supabase.from(TABLE) as any)
      .update({ pushed_to_feishu: true })
      .eq("id", id);

    if (error)
      throw new Error(`Failed to mark tweet as pushed to feishu: ${error.message}`);
  },

  async getUnprocessedTweets(): Promise<Tweet[]> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("processed", false)
      .order("created_at", { ascending: true });

    if (error)
      throw new Error(`Failed to fetch unprocessed tweets: ${error.message}`);

    return (data as Tweet[]) ?? [];
  },

  async getTodayCount(): Promise<number> {
    const supabase = await getSupabaseAdmin();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    if (error) throw new Error(`Failed to count today's tweets: ${error.message}`);

    return count ?? 0;
  },

  async getRecentTweets(limit = 10): Promise<TweetWithAuthor[]> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*, author:authors(*)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch recent tweets: ${error.message}`);

    return (data as TweetWithAuthor[]) ?? [];
  },
};
