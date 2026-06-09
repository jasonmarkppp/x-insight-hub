import { PopularKeywords } from "@/components/dashboard/popular-keywords";
import { AnalysisRepository } from "@/repositories/analysis.repository";
import { logger } from "@/lib/logger";

export async function PopularKeywordsWrapper({
  keywords: _keywords,
  loading: _loading,
}: {
  keywords?: unknown[];
  loading?: boolean;
} = {}) {
  try {
    const keywords = await AnalysisRepository.getPopularKeywords(20);
    return <PopularKeywords keywords={keywords} loading={false} />;
  } catch (error) {
    logger.error("Dashboard: failed to load keywords", error);
    return <PopularKeywords keywords={[]} loading={false} />;
  }
}
