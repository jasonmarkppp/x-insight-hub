import { logger } from "@/lib/logger";
import { getSetting } from "@/services/settings.service";
import type { DeepSeekAnalysisResult, ContentFactoryResult } from "@/types";

const DEEPSEEK_API_BASE = "https://api.deepseek.com/v1";

async function getApiKey(): Promise<string> {
  const key =
    (await getSetting("deepseek_api_key")) || process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error("Missing env: DEEPSEEK_API_KEY");
  }
  return key;
}

interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  response_format?: { type: "json_object" };
  temperature?: number;
  max_tokens?: number;
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

async function deepseekChat(
  messages: DeepSeekMessage[],
  responseFormat: "json_object" | undefined = "json_object",
  temperature = 0.7,
  maxTokens = 4096,
): Promise<string> {
  const requestBody: DeepSeekRequest = {
    model: "deepseek-chat",
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  if (responseFormat) {
    requestBody.response_format = { type: responseFormat };
  }

  logger.debug("DeepSeek API request", {
    model: requestBody.model,
    messageCount: messages.length,
  });

  const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as DeepSeekResponse;

  if (data.usage) {
    logger.info("DeepSeek API usage", data.usage);
  }

  return data.choices[0]?.message?.content ?? "";
}

function parseJsonResponse<T>(content: string): T {
  // Attempt 1: direct parse
  try {
    return JSON.parse(content) as T;
  } catch {
    // Attempt 2: strip markdown code fences
    try {
      const cleaned = content
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      return JSON.parse(cleaned) as T;
    } catch {
      // Attempt 3: extract JSON object with regex
      try {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          return JSON.parse(match[0]) as T;
        }
      } catch {
        // fall through to error
      }

      logger.error("Failed to parse DeepSeek response as JSON", {
        preview: content.slice(0, 500),
      });
      throw new Error("Invalid JSON response from DeepSeek API");
    }
  }
}

export const DeepSeekService = {
  /**
   * Analyze a tweet: translate, summarize, categorize.
   * This is the LIGHTWEIGHT analysis — always runs in cron.
   */
  async analyzeTweet(tweetContent: string): Promise<DeepSeekAnalysisResult> {
    const systemPrompt = `你是一位专业内容分析师。请分析以下推文内容，并输出JSON格式的分析结果。

重要：请务必返回合法的 JSON 字符串，不要包含任何 Markdown 的 \`\`\`json 标记或其它包围字符，直接输出纯 JSON。

输出格式必须严格遵循以下JSON结构：
{
  "translation": "中文翻译",
  "summary": "核心观点总结",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "category": "分类（如：科技、财经、社会、娱乐、体育、其他）",
  "sentiment": "Bullish 或 Bearish 或 Neutral"
}`;

    const content = await deepseekChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: tweetContent },
    ]);

    return parseJsonResponse<DeepSeekAnalysisResult>(content);
  },

  /**
   * Generate multi-platform content from a tweet.
   * This is a HEAVY operation — always triggered by user action, never from cron.
   */
  async generateContent(
    tweetContent: string,
    analysisSummary?: string,
  ): Promise<ContentFactoryResult> {
    const context = analysisSummary
      ? `原文：${tweetContent}\n\n核心观点：${analysisSummary}`
      : `原文：${tweetContent}`;

    const systemPrompt = `你是一位社交媒体内容创作专家。请基于以下内容，生成适合三个平台的内容版本。

重要：请务必返回合法的 JSON 字符串，不要包含任何 Markdown 的 \`\`\`json 标记或其它包围字符，直接输出纯 JSON。

输出格式必须严格遵循以下JSON结构：
{
  "x_version": "X/Twitter版本，保持原意，轻度改写，适合X平台风格（280字符以内），可适当使用emoji",
  "wechat_version": "微信公众号版本，扩写到500-800字，深度分析，适合公众号读者阅读习惯，段落分明，可适当使用小标题",
  "xiaohongshu_title": "小红书爆款标题，吸引眼球，带emoji",
  "xiaohongshu_content": "小红书正文，400-600字，口语化，带emoji，使用适当的标签格式，排版清晰",
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"]
}`;

    const content = await deepseekChat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: context },
      ],
      "json_object",
      0.8,
      4096,
    );

    return parseJsonResponse<ContentFactoryResult>(content);
  },
};
