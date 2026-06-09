import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { AuthorRepository } from "@/repositories/author.repository";
import { TweetRepository } from "@/repositories/tweet.repository";
import { TwitterService } from "@/services/twitter.service";
import { DeepSeekService } from "@/services/deepseek.service";
import { AnalysisRepository } from "@/repositories/analysis.repository";
import { FeishuService } from "@/services/feishu.service";
import { getSetting } from "@/services/settings.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Pro: max 60s for serverless functions

interface CronResult {
  authors_due: number;
  authors_skipped: number;
  tweets_fetched: number;
  tweets_analyzed: number;
  feishu_pushed: number;
  errors: string[];
  duration_ms: number;
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret =
    (await getSetting("cron_secret")) || process.env.CRON_SECRET;

  if (cronSecret) {
    const expectedToken = `Bearer ${cronSecret}`;
    if (authHeader !== expectedToken) {
      logger.warn("Unauthorized cron attempt", {
        ip: request.headers.get("x-forwarded-host"),
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startTime = Date.now();
  const result: CronResult = {
    authors_due: 0,
    authors_skipped: 0,
    tweets_fetched: 0,
    tweets_analyzed: 0,
    feishu_pushed: 0,
    errors: [],
    duration_ms: 0,
  };

  try {
    logger.info("Starting tier-based tweet fetch cron job");

    // ── Step 1: Get only authors due for fetch based on their tier ──────
    const dueAuthors = await AuthorRepository.getAuthorsDueForFetch();
    result.authors_due = dueAuthors.length;
    logger.info(`Found ${dueAuthors.length} authors due for fetch`);

    for (const author of dueAuthors) {
      try {
        // ── Step 2: Fetch latest tweets from X API ────────────────────
        const existingTweets = await TweetRepository.findAll({
          authorId: author.id,
          pageSize: 1,
        });

        const sinceId =
          existingTweets.data.length > 0
            ? existingTweets.data[0].tweet_id
            : undefined;

        const tweets = await TwitterService.getUserTweets(
          author.username,
          sinceId,
          10,
        );

        // ── Step 3: Always mark as fetched (even if no new tweets) ────
        await AuthorRepository.updateLastFetchedAt(author.id);

        if (!tweets || tweets.length === 0) {
          logger.info(`No new tweets for @${author.username}`);
          continue; // Nothing to process — move to next author
        }

        logger.info(`Fetched ${tweets.length} new tweets for @${author.username}`);

        // ── Step 4: Save new tweets & DeepSeek analysis ───────────────
        for (const tweet of tweets) {
          // Deduplicate by tweet_id
          const existing = await TweetRepository.findByTweetId(tweet.id);
          if (existing) continue;

          const savedTweet = await TweetRepository.create({
            tweet_id: tweet.id,
            author_id: author.id,
            content: tweet.text,
            raw_json: tweet as unknown as Record<string, unknown>,
            created_at: tweet.created_at,
          });

          result.tweets_fetched++;

          // DeepSeek analysis (lightweight: translation + summary + keywords)
          try {
            const analysis = await DeepSeekService.analyzeTweet(tweet.text);

            await AnalysisRepository.create({
              tweet_id: savedTweet.id,
              translation: analysis.translation,
              summary: analysis.summary,
              keywords: analysis.keywords,
              category: analysis.category,
              sentiment: analysis.sentiment,
            });

            result.tweets_analyzed++;

            // Mark tweet as processed
            await TweetRepository.markProcessed(savedTweet.id);

            // ── Step 5: Feishu notification ─────────────────────────
            try {
              const tweetWithAuthor = { ...savedTweet, author };
              const analysisRecord = await AnalysisRepository.findByTweetId(
                savedTweet.id,
              );

              if (analysisRecord) {
                const pushed = await FeishuService.sendTweetNotification(
                  tweetWithAuthor,
                  analysisRecord,
                );

                if (pushed) {
                  await TweetRepository.markPushedToFeishu(savedTweet.id);
                  result.feishu_pushed++;
                }
              }
            } catch (feishuError) {
              logger.error("Feishu push failed", feishuError);
              result.errors.push(
                `Feishu push failed for tweet ${savedTweet.tweet_id}`,
              );
            }
          } catch (analysisError) {
            logger.error("Analysis failed for tweet", {
              tweetId: tweet.id,
              error: analysisError,
            });
            result.errors.push(`Analysis failed for tweet ${tweet.id}`);
          }
        }
      } catch (authorError) {
        logger.error(
          `Failed to process author @${author.username}`,
          authorError,
        );
        result.errors.push(`Failed to process author @${author.username}`);
      }
    }

    result.duration_ms = Date.now() - startTime;

    logger.info("Cron job completed", {
      ...result,
      duration: `${(result.duration_ms / 1000).toFixed(1)}s`,
    });

    return NextResponse.json(result);
  } catch (error) {
    result.duration_ms = Date.now() - startTime;
    logger.error("Cron job failed", error);
    result.errors.push(`Cron job failed: ${String(error)}`);

    return NextResponse.json(result, { status: 500 });
  }
}
