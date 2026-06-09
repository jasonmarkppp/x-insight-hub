// ============================================================================
// Domain Types
// ============================================================================

export interface Author {
  id: string;
  twitter_user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  active: boolean;
  tier: "S" | "A" | "B";
  last_fetched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tweet {
  id: string;
  tweet_id: string;
  author_id: string;
  content: string;
  raw_json: Record<string, unknown>;
  created_at: string;
  processed: boolean;
  pushed_to_feishu: boolean;
}

export interface TweetWithAuthor extends Tweet {
  author?: Author;
  analysis?: TweetAnalysis | null;
}

export interface TweetAnalysis {
  id: string;
  tweet_id: string;
  translation: string;
  summary: string;
  keywords: string[];
  category: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  created_at: string;
}

export interface ContentGeneration {
  id: string;
  tweet_id: string;
  x_version: string;
  wechat_version: string;
  xiaohongshu_title: string;
  xiaohongshu_content: string;
  tags: string[];
  created_at: string;
}

// ============================================================================
// API Types
// ============================================================================

export interface DeepSeekAnalysisResult {
  translation: string;
  summary: string;
  keywords: string[];
  category: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
}

export interface ContentFactoryResult {
  x_version: string;
  wechat_version: string;
  xiaohongshu_title: string;
  xiaohongshu_content: string;
  tags: string[];
}

export interface FeishuMessage {
  msg_type: "interactive";
  card: {
    header: {
      title: {
        tag: "plain_text";
        content: string;
      };
    };
    elements: Array<{
      tag: string;
      content: string;
      [key: string]: unknown;
    }>;
  };
}

// ============================================================================
// Dashboard Stats
// ============================================================================

export interface DashboardStats {
  total_authors: number;
  active_authors: number;
  today_tweets: number;
  today_analysis: number;
  today_push: number;
}

// ============================================================================
// Settings Types
// ============================================================================

export interface AppSettings {
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_role_key: string;
  twitter_bearer_token: string;
  deepseek_api_key: string;
  feishu_webhook_url: string;
  cron_secret: string;
}

// ============================================================================
// Form Types
// ============================================================================

export interface AuthorFormData {
  username: string;
  display_name?: string;
}

// ============================================================================
// Pagination
// ============================================================================

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
