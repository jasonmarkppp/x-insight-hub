import { getSupabaseAdmin } from "@/lib/supabase";
import type { Author, PaginatedResult } from "@/types";

const TABLE = "authors";

/**
 * Tier intervals in minutes — how long between fetch cycles for each tier.
 */
const TIER_INTERVAL_MIN: Record<string, number> = {
  S: 9,   // every ~10 min (buffer of 1 min)
  A: 55,  // every ~1 hour
  B: 330, // every ~6 hours
};

export const AuthorRepository = {
  async findAll(opts?: {
    page?: number;
    pageSize?: number;
    search?: string;
    activeOnly?: boolean;
  }): Promise<PaginatedResult<Author>> {
    const supabase = await getSupabaseAdmin();
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from(TABLE).select("*", { count: "exact" });

    if (opts?.activeOnly) {
      query = query.eq("active", true);
    }

    if (opts?.search) {
      query = query.or(
        `username.ilike.%${opts.search}%,display_name.ilike.%${opts.search}%`,
      );
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Failed to fetch authors: ${error.message}`);

    return {
      data: (data as Author[]) ?? [],
      total: count ?? 0,
      page,
      pageSize,
    };
  },

  async findById(id: string): Promise<Author | null> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch author: ${error.message}`);
    }

    return data as Author;
  },

  async findByTwitterUserId(twitterUserId: string): Promise<Author | null> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("twitter_user_id", twitterUserId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch author by twitter ID: ${error.message}`);
    }

    return data as Author;
  },

  async findByUsername(username: string): Promise<Author | null> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .ilike("username", username)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch author by username: ${error.message}`);
    }

    return data as Author;
  },

  /**
   * Get active authors whose tier-based fetch interval has elapsed.
   * This is the core of the tiering system — only returns authors
   * that are actually due for a fetch cycle.
   *
   * Tier S: last_fetched_at IS NULL OR age >= 9 min
   * Tier A: last_fetched_at IS NULL OR age >= 55 min
   * Tier B: last_fetched_at IS NULL OR age >= 330 min
   */
  async getAuthorsDueForFetch(): Promise<Author[]> {
    const supabase = await getSupabaseAdmin();

    // Build OR conditions for each tier
    // For each tier: (tier = 'X' AND (last_fetched_at IS NULL OR last_fetched_at <= now() - interval 'X min'))
    const orConditions = Object.entries(TIER_INTERVAL_MIN)
      .map(([tier, minutes]) =>
        `and(tier.eq.${tier},or(last_fetched_at.is.null,last_fetched_at.lte.${new Date(Date.now() - minutes * 60_000).toISOString()}))`,
      )
      .join(",");

    // Use a simpler approach: fetch all active authors and filter in JS
    // This avoids complex Supabase query builder issues
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("active", true);

    if (error) throw new Error(`Failed to fetch due authors: ${error.message}`);

    const now = Date.now();
    return ((data as Author[]) ?? []).filter((author) => {
      const intervalMs = (TIER_INTERVAL_MIN[author.tier] ?? 55) * 60_000;
      if (!author.last_fetched_at) return true;
      const elapsed = now - new Date(author.last_fetched_at).getTime();
      return elapsed >= intervalMs;
    });
  },

  /**
   * Update last_fetched_at to now after a successful fetch.
   * Always called regardless of whether new tweets were found.
   */
  async updateLastFetchedAt(id: string): Promise<void> {
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase
      .from(TABLE)
      .update({ last_fetched_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to update last_fetched_at: ${error.message}`);
    }
  },

  async create(input: {
    twitter_user_id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    tier?: "S" | "A" | "B";
  }): Promise<Author> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await (supabase.from(TABLE) as any)
      .insert({
        twitter_user_id: input.twitter_user_id,
        username: input.username,
        display_name: input.display_name ?? input.username,
        avatar_url: input.avatar_url ?? "",
        tier: input.tier ?? "A",
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create author: ${error.message}`);

    return data as unknown as Author;
  },

  async update(
    id: string,
    input: Partial<{
      username: string;
      display_name: string;
      avatar_url: string;
      active: boolean;
      tier: "S" | "A" | "B";
      last_fetched_at: string;
    }>,
  ): Promise<Author> {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await (supabase.from(TABLE) as any)
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update author: ${error.message}`);

    return data as unknown as Author;
  },

  async toggleActive(id: string): Promise<Author> {
    const author = await this.findById(id);
    if (!author) throw new Error(`Author not found: ${id}`);
    return this.update(id, { active: !author.active });
  },

  async delete(id: string): Promise<void> {
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase.from(TABLE).delete().eq("id", id);

    if (error) throw new Error(`Failed to delete author: ${error.message}`);
  },
};
