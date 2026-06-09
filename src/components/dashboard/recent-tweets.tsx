import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, truncate } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface RecentTweet {
  id: string;
  tweet_id: string;
  content: string;
  created_at: string;
  author?: {
    username: string;
    display_name: string;
  };
}

export function RecentTweets({
  tweets,
  loading,
}: {
  tweets: RecentTweet[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Tweets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Tweets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tweets.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No tweets yet. Add an author to start monitoring.
            </p>
          )}
          {tweets.map((tweet) => (
            <div
              key={tweet.id}
              className="group rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {tweet.author?.display_name || tweet.author?.username}
                </span>
                <span>{formatDate(tweet.created_at)}</span>
                <a
                  href={`https://x.com/${tweet.author?.username || "twitter"}/status/${tweet.tweet_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-sm">{truncate(tweet.content, 150)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
