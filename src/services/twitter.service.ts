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
        id: String(raw.id || ""),
        name: raw.name || raw.userName || username,
        username: raw.userName || username,
        profile_image_url: raw.profilePicture || "",
      };
    } catch (error) {
      logger.error(`Failed to fetch Twitter user: ${username}`, error);
      return null;
    }
  },

  /**
   * Get recent tweets for a user by their Twitter username.
   * Uses /twitter/user/last_tweets?userName={userName}
   *
   * Returns an empty array on any API error or empty response.
   */
  async getUserTweets(
    userName: string,
    sinceId?: string,
    maxResults = 10,
  ): Promise<TwitterTweet[]> {
    try {
      const params: Record<string, string> = {
        userName,
        pageSize: String(Math.min(maxResults, 20)),
      };

      const result = await twitterFetch<TwitterTweet[]>(
        "/twitter/user/last_tweets",
        params,
      );

      // Defensive: guard against empty/missing response
      if (!result) {
        logger.debug(`Empty response from TwitterAPI.io for user ${userName}`);
        return [];
      }

      // TwitterAPI.io returns: { status, code, msg, data: { pin_tweet, tweets: [...] } }
      const tweetsData = (result as any).data?.tweets;
      if (!tweetsData || !Array.isArray(tweetsData) || tweetsData.length === 0) {
        return [];
      }

      // Map to our internal format
      const tweets: TwitterTweet[] = tweetsData.map((tweet: any) => ({
        id: String(tweet.id || ""),
        text: tweet.text || "",
        created_at: tweet.createdAt || tweet.created_at || new Date().toISOString(),
        author_id: String(tweet.author?.id || tweet.author_id || ""),
      }));

      // If sinceId is provided, filter to only return tweets newer than it
      if (sinceId) {
        return tweets.filter((t) => BigInt(t.id) > BigInt(sinceId));
      }

      return tweets;
    } catch (error) {
      logger.error(`Failed to fetch tweets for user: ${userName}`, error);
      return []; // Never throw — cron must continue to next author
    }
  },

  /**
   * Get the last tweet for a user by their Twitter username.
   */
  async getLatestTweet(userName: string): Promise<TwitterTweet | null> {
    const tweets = await this.getUserTweets(userName, undefined, 5);
    return tweets.length > 0 ? tweets[0] : null;
  },
};
