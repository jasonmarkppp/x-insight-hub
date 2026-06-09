import { logger } from "@/lib/logger";
import { getSetting } from "@/services/settings.service";
import type { TweetWithAuthor, TweetAnalysis } from "@/types";

async function getWebhookUrl(): Promise<string> {
  const url =
    (await getSetting("feishu_webhook_url")) || process.env.FEISHU_WEBHOOK_URL;
  if (!url) {
    throw new Error("Missing env: FEISHU_WEBHOOK_URL");
  }
  return url;
}

/**
 * Sentiment display config — maps sentiment to emoji + color.
 */
const SENTIMENT_MAP: Record<string, { emoji: string; color: string }> = {
  Bullish: { emoji: "📈", color: "green" },
  Bearish: { emoji: "📉", color: "red" },
  Neutral: { emoji: "⚖️", color: "blue" },
};

export const FeishuService = {
  /**
   * Send a beautifully formatted interactive card to Feishu.
   * Uses Feishu interactive message with rich text layout.
   */
  async sendTweetNotification(
    tweet: TweetWithAuthor,
    analysis: TweetAnalysis,
  ): Promise<boolean> {
    try {
      const authorName =
        tweet.author?.display_name || tweet.author?.username || "Unknown";
      const username = tweet.author?.username || "unknown";
      const tweetUrl = `https://x.com/${username}/status/${tweet.tweet_id}`;
      const publishTime = new Date(tweet.created_at).toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
      });

      const sentiment = SENTIMENT_MAP[analysis.sentiment] ?? {
        emoji: "⚖️",
        color: "blue",
      };

      const message = {
        msg_type: "interactive" as const,
        card: {
          header: {
            title: {
              tag: "plain_text" as const,
              content: `🐦 推文监控：${authorName}`,
            },
          },
          elements: [
            // ── Author & Time ──────────────────────────────────────────
            {
              tag: "div",
              text: {
                tag: "lark_md",
                content: `**👤 博主：** ${authorName} (@${username})\n**🕐 发布时间：** ${publishTime}`,
              },
            },
            {
              tag: "hr",
            },
            // ── Original Tweet ─────────────────────────────────────────
            {
              tag: "div",
              text: {
                tag: "lark_md",
                content: `**📝 原文：**\n${tweet.content}`,
              },
            },
            {
              tag: "hr",
            },
            // ── AI Analysis Section ────────────────────────────────────
            {
              tag: "div",
              text: {
                tag: "lark_md",
                content: `**🤖 AI 分析结果**`,
              },
            },
            {
              tag: "div",
              text: {
                tag: "lark_md",
                content: `**📖 中文翻译：**\n${analysis.translation || "（暂无）"}`,
              },
            },
            {
              tag: "div",
              text: {
                tag: "lark_md",
                content: `**💡 核心观点：** ${analysis.summary || "（暂无）"}`,
              },
            },
            // ── Keywords with badges ───────────────────────────────────
            {
              tag: "div",
              text: {
                tag: "lark_md",
                content: `**🏷️ 关键词：**\n${
                  analysis.keywords?.length
                    ? analysis.keywords
                        .slice(0, 5)
                        .map((k) => `\`${k}\``)
                        .join(" · ")
                    : "（暂无）"
                }`,
              },
            },
            {
              tag: "div",
              text: {
                tag: "lark_md",
                content: `**📂 分类：** ${analysis.category || "未分类"}　　**${sentiment.emoji} 情绪：** ${analysis.sentiment || "Neutral"}`,
              },
            },
            {
              tag: "hr",
            },
            // ── Link button ───────────────────────────────────────────
            {
              tag: "action",
              actions: [
                {
                  tag: "button",
                  text: {
                    tag: "plain_text",
                    content: "🔗 查看原文",
                  },
                  type: "link",
                  url: tweetUrl,
                  multi_url: {
                    url: tweetUrl,
                    android_url: tweetUrl,
                    ios_url: tweetUrl,
                    pc_url: tweetUrl,
                  },
                },
              ],
            },
          ],
        },
      };

      const response = await fetch(await getWebhookUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("Feishu webhook error", {
          status: response.status,
          body: errorText,
        });
        return false;
      }

      logger.info("Feishu notification sent successfully", {
        tweetId: tweet.tweet_id,
        author: authorName,
      });

      return true;
    } catch (error) {
      logger.error("Failed to send Feishu notification", error);
      return false;
    }
  },
};
