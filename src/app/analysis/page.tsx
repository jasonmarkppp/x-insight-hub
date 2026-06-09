import { Suspense } from "react";
import { AnalysisRepository } from "@/repositories/analysis.repository";
import { AnalysisClientPage } from "./client-page";
import { logger } from "@/lib/logger";
import type { PaginatedResult } from "@/types";

export const dynamic = "force-dynamic";

export default async function AnalysisPage() {
  let initialData: PaginatedResult<unknown> = { data: [], total: 0, page: 1, pageSize: 20 };
  try {
    initialData = await AnalysisRepository.findAll({ pageSize: 20 });
  } catch (error) {
    logger.error("AnalysisPage: failed to load analysis", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analysis</h1>
        <p className="text-sm text-muted-foreground">
          AI-powered analysis results for fetched tweets.
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <AnalysisClientPage
          initialData={initialData.data as any}
          initialTotal={initialData.total}
        />
      </Suspense>
    </div>
  );
}
