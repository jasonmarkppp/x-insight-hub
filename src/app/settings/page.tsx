"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Save,
  Loader2,
  AlertCircle,
  CheckCheck,
  Database,
  Twitter,
  Brain,
  Bell,
  Key,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface SettingField {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  placeholder: string;
}

interface SettingsData {
  settings: Record<
    string,
    { value: string; configured: boolean }
  >;
  envOverrides: Record<string, boolean>;
}

interface SaveState {
  status: "idle" | "saving" | "success" | "error";
  message: string;
}

// ============================================================================
// Config
// ============================================================================

const SETTING_FIELDS: SettingField[] = [
  {
    key: "supabase_url",
    label: "Supabase Project URL",
    description: "Supabase 项目地址（公开）",
    icon: <Database className="h-4 w-4" />,
    placeholder: "https://your-project-id.supabase.co",
  },
  {
    key: "supabase_anon_key",
    label: "Supabase Anon Key",
    description: "Supabase 匿名密钥（公开，用于客户端连接）",
    icon: <Database className="h-4 w-4" />,
    placeholder: "eyJhbGciOiJIUzI1NiIs...",
  },
  {
    key: "supabase_service_role_key",
    label: "Supabase Service Role Key",
    description: "用于服务端数据库操作（高权限）",
    icon: <Database className="h-4 w-4" />,
    placeholder: "eyJhbGciOiJIUzI1NiIs...",
  },
  {
    key: "twitter_bearer_token",
    label: "X (Twitter) Bearer Token",
    description: "用于抓取推文数据",
    icon: <Twitter className="h-4 w-4" />,
    placeholder: "AAAAAAAAAAAAAAAAAAAA...",
  },
  {
    key: "deepseek_api_key",
    label: "DeepSeek API Key",
    description: "用于 AI 内容分析与生成",
    icon: <Brain className="h-4 w-4" />,
    placeholder: "sk-xxxxxxxxxxxxxxxx",
  },
  {
    key: "feishu_webhook_url",
    label: "飞书机器人 Webhook URL",
    description: "用于推送通知到飞书群",
    icon: <Bell className="h-4 w-4" />,
    placeholder: "https://open.feishu.cn/open-apis/bot/v2/hook/...",
  },
  {
    key: "cron_secret",
    label: "Cron 保护密钥",
    description: "用于定时任务的身份验证（可选）",
    icon: <Key className="h-4 w-4" />,
    placeholder: "your-cron-secret",
  },
];

// ============================================================================
// Settings Page Component
// ============================================================================

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state: raw values keyed by setting key
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  // Visibility toggles for each field
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  // Save state
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle", message: "" });

  // Load settings
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const result: SettingsData = await res.json();
      setData(result);

      // Populate form with existing values (will be masked)
      const initial: Record<string, string> = {};
      for (const [key, field] of Object.entries(result.settings)) {
        initial[key] = field.value; // masked value or empty string
      }
      setFormValues(initial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Handle input change
  const handleChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  // Toggle visibility
  const toggleVisibility = (key: string) => {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Handle save
  const handleSave = async () => {
    setSaveState({ status: "saving", message: "" });

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save");
      }

      setSaveState({ status: "success", message: "Settings saved successfully!" });
      // Refresh to get masked values
      setTimeout(() => fetchSettings(), 1000);
    } catch (err) {
      setSaveState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to save settings",
      });
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load settings: {error}</p>
        <Button variant="outline" onClick={fetchSettings}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure API keys and service credentials. Values are stored in the database
          and override environment variables when set.
        </p>
      </div>

      {/* Toast-style save indicator */}
      {saveState.status === "success" && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
          <CheckCheck className="h-4 w-4" />
          {saveState.message}
        </div>
      )}
      {saveState.status === "error" && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          {saveState.message}
        </div>
      )}

      {/* API Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API Configuration</CardTitle>
          <CardDescription>
            Fill in your API keys below. Fields left empty will fall back to
            environment variables. Already-configured values are masked.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {SETTING_FIELDS.map((field) => {
            const isConfigured =
              data?.settings[field.key]?.configured ?? false;
            const hasEnvOverride =
              data?.envOverrides?.[field.key.replace(/^(supabase|twitter|deepseek|feishu|cron)_.*$/, (_, p) => {
                const map: Record<string, string> = {
                  supabase: "supabase",
                  twitter: "twitter",
                  deepseek: "deepseek",
                  feishu: "feishu",
                  cron: "cron",
                };
                return map[p] || p;
              })] ?? false;

            // Extract the prefix for envOverride check
            const envPrefix = field.key.split("_")[0];
            const hasEnv = data?.envOverrides?.[envPrefix] ?? false;

            return (
              <div key={field.key}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{field.icon}</span>
                    <label
                      htmlFor={field.key}
                      className="text-sm font-medium"
                    >
                      {field.label}
                    </label>
                    {isConfigured && (
                      <Badge variant="bullish" className="gap-1 px-1.5 py-0 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        Configured
                      </Badge>
                    )}
                    {!isConfigured && (
                      <Badge variant="bearish" className="gap-1 px-1.5 py-0 text-xs">
                        <XCircle className="h-3 w-3" />
                        Missing
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasEnv && (
                      <Badge variant="secondary" className="text-xs">
                        Using env var
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleVisibility(field.key)}
                      className="text-muted-foreground hover:text-foreground"
                      title={visible[field.key] ? "Hide" : "Show"}
                    >
                      {visible[field.key] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Input
                  id={field.key}
                  type={visible[field.key] ? "text" : "password"}
                  value={formValues[field.key] ?? ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="font-mono text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {field.description}
                </p>
              </div>
            );
          })}

          <Separator />

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Values are saved to the database. Environment variables always take
              precedence.
            </p>
            <Button
              onClick={handleSave}
              disabled={saveState.status === "saving"}
              className="gap-2"
            >
              {saveState.status === "saving" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saveState.status === "saving" ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Environment Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Environment Variables</CardTitle>
          <CardDescription>
            Current status of environment variable overrides. These take priority
            over DB-stored values.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <EnvStatusRow
            name="Supabase"
            description="Database connection"
            configured={data?.envOverrides?.supabase ?? false}
            keys={["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]}
          />
          <Separator />
          <EnvStatusRow
            name="X (Twitter) API"
            description="Tweet fetching"
            configured={data?.envOverrides?.twitter ?? false}
            keys={["TWITTER_BEARER_TOKEN"]}
          />
          <Separator />
          <EnvStatusRow
            name="DeepSeek AI"
            description="Content analysis & generation"
            configured={data?.envOverrides?.deepseek ?? false}
            keys={["DEEPSEEK_API_KEY"]}
          />
          <Separator />
          <EnvStatusRow
            name="Feishu Bot"
            description="Push notifications"
            configured={data?.envOverrides?.feishu ?? false}
            keys={["FEISHU_WEBHOOK_URL"]}
          />
          <Separator />
          <EnvStatusRow
            name="Cron Secret"
            description="Cron job authentication"
            configured={data?.envOverrides?.cron ?? false}
            keys={["CRON_SECRET"]}
          />
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Info</CardTitle>
          <CardDescription>
            Platform and version information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Platform</span>
            <span>Next.js 15 + Supabase + DeepSeek</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cron Schedule</span>
            <Badge variant="secondary">Every 10 minutes</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">AI Model</span>
            <Badge variant="secondary">DeepSeek V4 Flash</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Config Source</span>
            <Badge variant="secondary">
              {data?.envOverrides?.supabase ||
              data?.envOverrides?.twitter ||
              data?.envOverrides?.deepseek
                ? "Env + DB"
                : "DB Only"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function EnvStatusRow({
  name,
  description,
  configured,
  keys,
}: {
  name: string;
  description: string;
  configured: boolean;
  keys: string[];
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{name}</span>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
        <div className="flex flex-wrap gap-1 pt-1">
          {keys.map((key) => (
            <code
              key={key}
              className="rounded bg-muted px-1.5 py-0.5 text-xs"
            >
              {key}
            </code>
          ))}
        </div>
      </div>
      <div>
        {configured ? (
          <Badge variant="bullish" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Configured
          </Badge>
        ) : (
          <Badge variant="bearish" className="gap-1">
            <XCircle className="h-3 w-3" />
            Missing
          </Badge>
        )}
      </div>
    </div>
  );
}
