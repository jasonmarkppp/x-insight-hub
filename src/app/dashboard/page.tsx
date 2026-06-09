import { Suspense } from "react";
import { Users, MessageSquare, BarChart3, Bell } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RecentTweetsWrapper } from "./recent-tweets-wrapper";
import { PopularKeywordsWrapper } from "./popular-keywords-wrapper";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your content intelligence hub.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard title="Authors" value="..." icon={Users} loading />
            <StatsCard title="Today's Tweets" value="..." icon={MessageSquare} loading />
            <StatsCard title="Today's Analysis" value="..." icon={BarChart3} loading />
            <StatsCard title="Today's Pushes" value="..." icon={Bell} loading />
          </div>
        }
      >
        <StatsGrid />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense
          fallback={
            <RecentTweetsWrapper tweets={[]} loading />
          }
        >
          <RecentTweetsWrapper />
        </Suspense>

        <Suspense
          fallback={
            <PopularKeywordsWrapper keywords={[]} loading />
          }
        >
          <PopularKeywordsWrapper />
        </Suspense>
      </div>
    </div>
  );
}

async function StatsGrid() {
  try {
    const { AuthorRepository, TweetRepository, AnalysisRepository, ContentRepository } =
      await import("@/repositories");

    const [
      allAuthors,
      todayTweets,
      todayAnalysis,
      todayContent,
    ] = await Promise.all([
      AuthorRepository.getActiveAuthors().catch(() => [] as any[]),
      TweetRepository.getTodayCount().catch(() => 0),
      AnalysisRepository.getTodayCount().catch(() => 0),
      ContentRepository.getTodayCount().catch(() => 0),
    ]);

    const totalAuthors = allAuthors.length;
    const activeAuthors = allAuthors.filter((a: any) => a.active === true).length;

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Authors"
          value={totalAuthors}
          icon={Users}
          description={`${activeAuthors} active`}
        />
        <StatsCard
          title="Today's Tweets"
          value={todayTweets}
          icon={MessageSquare}
        />
        <StatsCard
          title="Today's Analysis"
          value={todayAnalysis}
          icon={BarChart3}
        />
        <StatsCard
          title="Today's Pushes"
          value={todayContent}
          icon={Bell}
        />
      </div>
    );
  } catch (error) {
    logger.error("Dashboard: failed to load stats", error);
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Authors" value="--" icon={Users} />
        <StatsCard title="Today's Tweets" value="--" icon={MessageSquare} />
        <StatsCard title="Today's Analysis" value="--" icon={BarChart3} />
        <StatsCard title="Today's Pushes" value="--" icon={Bell} />
      </div>
    );
  }
}
