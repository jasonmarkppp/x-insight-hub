"use server";

import { revalidatePath } from "next/cache";
import { AuthorRepository } from "@/repositories/author.repository";
import { TwitterService } from "@/services/twitter.service";
import { DeepSeekService } from "@/services/deepseek.service";
import { FeishuService } from "@/services/feishu.service";
import { TweetRepository } from "@/repositories/tweet.repository";
import { AnalysisRepository } from "@/repositories/analysis.repository";
import { ContentFactoryService } from "@/services/content-factory.service";
import { logger } from "@/lib/logger";
import { z } from "zod";

// ============================================================================
// Author Actions
// ============================================================================

const addAuthorSchema = z.object({
  username: z.string().min(1, "Username is required").max(100),
  display_name: z.string().max(200).optional(),
  tier: z.enum(["S", "A", "B"]).optional(),
});

export async function addAuthor(formData: FormData) {
  const validated = addAuthorSchema.parse({
    username: formData.get("username"),
    display_name: formData.get("display_name"),
    tier: formData.get("tier") || "A",
  });

  // Fetch Twitter user info
  const twitterUser = await TwitterService.getUserByUsername(
    validated.username,
  );
  if (!twitterUser) {
    return { error: "Twitter user not found" };
  }

  // Check if already exists
  const existing = await AuthorRepository.findByTwitterUserId(twitterUser.id);
  if (existing) {
    return { error: "Author already exists" };
  }

  await AuthorRepository.create({
    twitter_user_id: twitterUser.id,
    username: twitterUser.username,
    display_name: validated.display_name || twitterUser.name,
    avatar_url: twitterUser.profile_image_url,
    tier: validated.tier,
  });

  revalidatePath("/authors");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateAuthorTier(id: string, tier: "S" | "A" | "B") {
  await AuthorRepository.update(id, { tier });
  revalidatePath("/authors");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { success: true };
}

export async function deleteAuthor(id: string) {
  await AuthorRepository.delete(id);
  revalidatePath("/authors");
  revalidatePath("/dashboard");
}

export async function toggleAuthorActive(id: string) {
  await AuthorRepository.toggleActive(id);
  revalidatePath("/authors");
  revalidatePath("/dashboard");
}

export async function updateAuthor(
  id: string,
  data: { username?: string; display_name?: string },
) {
  await AuthorRepository.update(id, data);
  revalidatePath("/authors");
}

// ============================================================================
// Content Generation Action
// ============================================================================

export async function generateContent(tweetId: string) {
  try {
    const tweet = await TweetRepository.findById(tweetId);
    if (!tweet) return { error: "Tweet not found" };

    const analysis = await AnalysisRepository.findByTweetId(tweetId);
    const content = await ContentFactoryService.generateAndSave(
      tweetId,
      tweet.content,
      analysis?.summary,
    );

    revalidatePath("/content");
    revalidatePath("/tweets");
    return { success: true, data: content };
  } catch (error) {
    logger.error("Failed to generate content", error);
    return { error: "Failed to generate content" };
  }
}

// ============================================================================
// Manual Process Actions
// ============================================================================

export async function processTweet(tweetId: string) {
  try {
    const tweet = await TweetRepository.findById(tweetId);
    if (!tweet) return { error: "Tweet not found" };

    // Analyze
    const analysis = await DeepSeekService.analyzeTweet(tweet.content);
    await AnalysisRepository.create({
      tweet_id: tweetId,
      translation: analysis.translation,
      summary: analysis.summary,
      keywords: analysis.keywords,
      category: analysis.category,
      sentiment: analysis.sentiment,
    });

    // Push to Feishu
    const tweetWithAuthor = await TweetRepository.findById(tweetId);
    if (tweetWithAuthor?.author) {
      const analysisRecord = await AnalysisRepository.findByTweetId(tweetId);
      if (analysisRecord) {
        await FeishuService.sendTweetNotification(
          tweetWithAuthor,
          analysisRecord,
        );
        await TweetRepository.markPushedToFeishu(tweetId);
      }
    }

    await TweetRepository.markProcessed(tweetId);

    revalidatePath("/tweets");
    revalidatePath("/analysis");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    logger.error("Failed to process tweet", error);
    return { error: "Failed to process tweet" };
  }
}
