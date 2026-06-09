import { Suspense } from "react";
import { TweetRepository } from "@/repositories/tweet.repository";
import { TweetsClientPage } from "./client-page";
import { logger } from "@/lib/logger";
import type { PaginatedResult } from "@/types";

export const dynamic = "force-dynamic";

export default async function TweetsPage() {
  let initialData: PaginatedResult<unknown> = { data: [], total: 0, page: 1, pageSize: 20 };
  try {
    initialData = await TweetRepository.findAll({ pageSize: 20 });
  } catch (error) {
    logger.error("TweetsPage: failed to load tweets", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tweets</h1>
        <p className="text-sm text-muted-foreground">
          Browse fetched tweets from monitored authors.
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <TweetsClientPage
          initialTweets={initialData.data as any}
          initialTotal={initialData.total}
        />
      </Suspense>
    </div>
  );
}
