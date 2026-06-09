import { DeepSeekService } from "./deepseek.service";
import { ContentRepository } from "@/repositories/content.repository";
import { logger } from "@/lib/logger";
import type { ContentGeneration } from "@/types";

export const ContentFactoryService = {
  /**
   * Generate multi-platform content from a tweet and save to database.
   */
  async generateAndSave(
    tweetId: string,
    tweetContent: string,
    analysisSummary?: string,
  ): Promise<ContentGeneration> {
    logger.info("Generating content for tweet", { tweetId });

    // Check if content already exists
    const existing = await ContentRepository.findByTweetId(tweetId);
    if (existing) {
      logger.info("Content already exists for tweet, returning existing", {
        tweetId,
      });
      return existing;
    }

    // Generate content via DeepSeek
    const result = await DeepSeekService.generateContent(
      tweetContent,
      analysisSummary,
    );

    // Save to database
    const content = await ContentRepository.create({
      tweet_id: tweetId,
      x_version: result.x_version,
      wechat_version: result.wechat_version,
      xiaohongshu_title: result.xiaohongshu_title,
      xiaohongshu_content: result.xiaohongshu_content,
      tags: result.tags,
    });

    logger.info("Content generated and saved successfully", { tweetId });
    return content;
  },
};
