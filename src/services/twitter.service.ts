import { logger } from "@/lib/logger";
import { getSetting } from "@/services/settings.service";

/**
 * TwitterAPI.io — Enterprise-grade Twitter data API.
 * Docs: https://docs.twitterapi.io
 * Base: https://api.twitterapi.io
 *
 * Auth: Pass API key in X-API-Key header (not Bearer Token).
 * Much cheaper than official X API ($0.15/1k tweets).
 */

const TWITTER_API_BASE = "https://api.twitterapi.io";

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

interface TwitterTweet {
  id: string;
  text: string;
  created_at: string;
  author_id?: string;
}

interface TwitterApiResponse<T> {
  data?: T;
  includes?: Record<string, unknown>;
  meta?: {
    result_count: number;
    newest_id?: string;
    oldest_id?: string;
    next_token?: string;
  };
  errors?: Array<{
    title: string;
    detail: string;
    type: string;
  }>;
}

async function getApiKey(): Promise<string> {
  const key =
    (await getSetting("twitter_bearer_token")) ||
    process.env.TWITTER_BEARER_TOKEN;
  if (!key) {
    throw new Error("Missing env: TWITTER_BEARER_TOKEN (TwitterAPI.io API Key)");
  }
  return key;
}

async function twitterFetch<T>(
  path: string,
  params?: Record<string, string>,
): Promise<TwitterApiResponse<T>> {
  const url = new URL(`${TWITTER_API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  logger.debug(`TwitterAPI.io request: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    headers: {
      "X-API-Key": await getApiKey(),
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `TwitterAPI.io error (${response.status}): ${errorText}`,
    );
  }

  const data = (await response.json()) as TwitterApiResponse<T>;

  if (data.errors && data.errors.length > 0) {
    logger.warn("TwitterAPI.io returned errors", data.errors);
  }

  return data;
}

export const TwitterService = {
  /**
   * Look up a Twitter user by username via TwitterAPI.io.
   * GET /twitter/user/info?userName={username}
   */
  async getUserByUsername(username: string): Promise<TwitterUser | null> {
    try {
      const result = await twitterFetch<TwitterUser>(
        "/twitter/user/info",
        { userName: username },
      );

      if (!result || !result.data) {
        logger.warn(`Twitter user not found: ${username}`);
        return null;
      }

      // Map TwitterAPI.io response to our expected format
      const raw = result.data as any;
      return {
        id: String(raw.id || raw.rest_id || ""),
        name: raw.name || raw.screen_name || username,
        username: raw.screen_name || username,
        profile_image_url: raw.profile_image_url || raw.avatar || "",
      };
    } catch (error) {
      logger.error(`Failed to fetch Twitter user: ${username}`, error);
      return null;
    }
  },

  /**
   * Get recent tweets for a user by their Twitter user ID (numeric).
   * Uses /twitter/user/tweet_timeline?id={userId}
   *
   * Returns an empty array on any API error or empty response.
   */
  async getUserTweets(
    userId: string,
    sinceId?: string,
    maxResults = 10,
  ): Promise<TwitterTweet[]> {
    try {
      const params: Record<string, string> = {
        id: userId,
        pageSize: String(Math.min(maxResults, 20)),
      };

      const result = await twitterFetch<TwitterTweet[]>(
        "/twitter/user/tweet_timeline",
        params,
      );

      // Defensive: guard against empty/missing response
      if (!result) {
        logger.debug(`Empty response from TwitterAPI.io for user ${userId}`);
        return [];
      }

      // meta.result_count can be 0
      if (result.meta?.result_count === 0) {
        return [];
      }

      if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
        return [];
      }

      // Map to our internal format
      const tweets: TwitterTweet[] = result.data.map((tweet: any) => ({
        id: String(tweet.id || tweet.rest_id || ""),
        text: tweet.text || tweet.full_text || "",
        created_at: tweet.created_at || tweet.createdAt || new Date().toISOString(),
        author_id: String(
          tweet.author_id || tweet.user_id || result.data?.[0]?.author_id || "",
        ),
      }));

      // If sinceId is provided, filter to only return tweets newer than it
      if (sinceId) {
        return tweets.filter((t) => BigInt(t.id) > BigInt(sinceId));
      }

      return tweets;
    } catch (error) {
      logger.error(`Failed to fetch tweets for user: ${userId}`, error);
      return []; // Never throw — cron must continue to next author
    }
  },

  /**
   * Get the last tweet for a user.
   */
  async getLatestTweet(userId: string): Promise<TwitterTweet | null> {
    const tweets = await this.getUserTweets(userId, undefined, 5);
    return tweets.length > 0 ? tweets[0] : null;
  },
};
