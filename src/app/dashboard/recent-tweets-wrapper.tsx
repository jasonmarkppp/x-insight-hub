import { RecentTweets } from "@/components/dashboard/recent-tweets";
import { TweetRepository } from "@/repositories/tweet.repository";
import { logger } from "@/lib/logger";

export async function RecentTweetsWrapper({
  tweets: _tweets,
  loading: _loading,
}: {
  tweets?: unknown[];
  loading?: boolean;
} = {}) {
  try {
    const recentTweets = await TweetRepository.getRecentTweets(10);

    return (
      <RecentTweets
        tweets={recentTweets.map((t) => ({
          id: t.id,
          tweet_id: t.tweet_id,
          content: t.content,
          created_at: t.created_at,
          author: t.author
            ? {
                username: t.author.username,
                display_name: t.author.display_name,
              }
            : undefined,
        }))}
        loading={false}
      />
    );
  } catch (error) {
    logger.error("Dashboard: failed to load recent tweets", error);
    return <RecentTweets tweets={[]} loading={false} />;
  }
}
