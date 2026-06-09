# X Insight Hub 🐦

一个基于 X（Twitter）内容监控与多平台内容生产的智能平台。支持博主分级监控、AI 自动分析、飞书实时推送，以及 X / 微信公众号 / 小红书三平台内容一键生成。

## 功能特性

### 📊 Dashboard
- 监控作者数量统计
- 今日抓取/分析/推送数据概览
- 最近推文列表
- 热门关键词展示

### 👥 博主管理
- 添加/删除监控博主
- 启用/停止监控
- **分级监控**：S 级 10min / A 级 1h / B 级 6h 智能错峰轮询
- 按用户名搜索

### 📝 推文管理
- 自动抓取最新推文（基于 TwitterAPI.io）
- 推文内容查看
- 手动触发 AI 分析
- 一键生成多平台内容
- 查看原文链接

### 🤖 AI 分析（DeepSeek）
- 自动中文翻译
- 核心观点提取
- 关键词提取
- 内容分类
- 情绪分析（Bullish / Bearish / Neutral）

### 📢 飞书推送
- AI 分析完成后自动推送飞书群
- 交互式卡片消息，视觉层次清晰
- 包含原文、翻译、分析结果
- 一键跳转原文链接

### 🎨 内容工厂
- **X/Twitter 版本**：轻度改写，保持原意
- **微信公众号版本**：扩写 500~800 字深度分析
- **小红书版本**：爆款标题 + 正文 + 标签

### ⚙️ 前端配置
- 所有 API Key 通过 Settings 页面在线配置，无需编辑环境变量文件
- 实时环境变量状态检测
- 值掩码显示，安全可控

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端框架** | Next.js 15 (App Router) |
| **语言** | TypeScript (Strict Mode) |
| **样式** | TailwindCSS + shadcn/ui |
| **图标** | Lucide Icons |
| **数据库** | Supabase (PostgreSQL) |
| **AI** | DeepSeek V4 Flash API |
| **外部 API** | TwitterAPI.io |
| **通知** | Feishu Bot Webhook |
| **部署** | Vercel |

## 快速开始

### 前置要求

- Node.js 18+
- npm
- Supabase 项目
- TwitterAPI.io API Key
- DeepSeek API Key
- 飞书机器人 Webhook（可选）

### 1. 克隆并安装依赖

```bash
git clone <repo-url>
cd x-insight-hub
npm install
```

### 2. 配置 Supabase 数据库

1. 在 [Supabase Dashboard](https://supabase.com) 创建项目
2. 进入 **SQL Editor**
3. 复制 `supabase/schema.sql` 的全部内容并执行
4. 在 **Project Settings > API** 中获取以下值：

```env
# 这两个必须写入 .env.local（用于启动时连接数据库）
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 启动项目

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑 .env.local，填入上一步的 Supabase URL 和 Anon Key
# 其他 key 后续在 Settings 页面填写

npm run dev
```

### 4. 前端配置 API Key

打开 `http://localhost:3000/settings`，在 Settings 页面填写以下配置：

| 配置项 | 说明 | 获取地址 |
|--------|------|----------|
| Supabase Project URL | 数据库地址（公开） | Supabase Dashboard |
| Supabase Anon Key | 匿名密钥（公开） | Supabase Dashboard |
| Supabase Service Role Key | 服务角色密钥（高权限） | Supabase Dashboard |
| Twitter Bearer Token | TwitterAPI.io API Key | [twitterapi.io](https://twitterapi.io) |
| DeepSeek API Key | AI 分析密钥 | [platform.deepseek.com](https://platform.deepseek.com) |
| Feishu Webhook URL | 飞书推送地址 | 飞书群 → 设置 → 群机器人 |
| Cron Secret | 定时任务保护密钥（可选） | 自定义 |

> **注意**：`NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 是公开值，但在首次启动时需要通过 `.env.local` 引导连接。连接成功后，你可以在 Settings 页面修改它们。

### 5. 添加监控博主

1. 进入 **Authors** 页面
2. 点击 **Add Author**
3. 输入 X/Twitter 用户名（不含 @）
4. 选择监控频率：
   - **S 级**（10 分钟一次）→ 高频博主
   - **A 级**（1 小时一次）→ 普通博主（默认）
   - **B 级**（6 小时一次）→ 低频博主
5. 点击确认

## 博主分级监控

系统采用智能错峰轮询机制，避免无效请求浪费 API 配额：

| 级别 | 轮询间隔 | 适合场景 |
|------|---------|---------|
| **S** | 每 10 分钟 | 核心博主，每小时都有新内容 |
| **A** | 每 1 小时 | 普通博主，每天几条推文 |
| **B** | 每 6 小时 | 低频博主，几天才发一条 |

- 每次轮询后自动回填 `last_fetched_at` 时间戳
- 无论是否有新推文，都更新上次抓取时间
- Cron 每 10 分钟触发一次，只拉取真正到期的博主

## 内容生产流程

1. **自动抓取**：Cron 按分级策略轮询博主的新推文
2. **AI 分析**：自动翻译、提取观点、分类、情绪分析
3. **飞书推送**：分析完成后推送通知到飞书群
4. **内容生成**：在推文详情页点击 "Generate Content"
   - X/Twitter 轻度改写版
   - 微信公众号 500-800 字深度分析
   - 小红书爆款标题+正文+标签

> 注意：内容生成（长文本）是通过 Server Action 手动触发的，不会在 Cron 中执行，避免 Vercel Serverless 超时。

## 数据库表结构

详见 `supabase/schema.sql`，包含以下表：
- `authors` — 监控博主（含 tier/last_fetched_at 分级字段）
- `tweets` — 推文
- `tweet_analysis` — AI 分析结果
- `content_generation` — 多平台生成内容
- `settings` — 运行时配置

## 部署到 Vercel

1. 推送代码到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 在 Vercel 的 **Environment Variables** 中配置：

```env
NEXT_PUBLIC_SUPABASE_URL=你的Supabase地址
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Anon Key
```

4. 部署完成后，在 Settings 页面配置其他 API Key
5. 设置定时抓取（Vercel Hobby 版不支持内置 Cron）

   去 [cron-job.org](https://cron-job.org) 注册 → 点 **Create Cronjob**：

   | 字段 | 值 |
   |------|-----|
   | **URL** | `https://你的域名.vercel.app/api/cron/fetch-tweets` |
   | **Schedule** | `Every 10 minutes` |
   | **Request Method** | `GET` |

   保存即可。系统内置的**博主分级机制**（S/A/B三级）会自动控制每次抓哪些博主，避免无谓消耗 API 配额。

## 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 项目 URL（启动引导） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase 匿名 Key（启动引导） |
| 其他 Key | ❌ | 全部在 Settings 页面在线配置 |

## 开发命令

```bash
npm run dev        # 启动开发服务器
npm run build      # 构建生产版本
npm run start      # 启动生产服务器
npm run lint       # 代码检查
npm run format     # 代码格式化
```

## License

MIT
