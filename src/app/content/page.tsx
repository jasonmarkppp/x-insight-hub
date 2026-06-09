import { Suspense } from "react";
import { ContentRepository } from "@/repositories/content.repository";
import { ContentClientPage } from "./client-page";
import { logger } from "@/lib/logger";
import type { PaginatedResult } from "@/types";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  let initialData: PaginatedResult<unknown> = { data: [], total: 0, page: 1, pageSize: 20 };
  try {
    initialData = await ContentRepository.findAll({ pageSize: 20 });
  } catch (error) {
    logger.error("ContentPage: failed to load content", error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Content</h1>
        <p className="text-sm text-muted-foreground">
          AI-generated multi-platform content from tweets.
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <ContentClientPage
          initialData={initialData.data as any}
          initialTotal={initialData.total}
        />
      </Suspense>
    </div>
  );
}
