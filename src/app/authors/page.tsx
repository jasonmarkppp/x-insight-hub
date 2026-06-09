import { Suspense } from "react";
import { AuthorRepository } from "@/repositories/author.repository";
import { AuthorClientPage } from "./client-page";
import { logger } from "@/lib/logger";
import type { PaginatedResult } from "@/types";

export const dynamic = "force-dynamic";

export default async function AuthorsPage() {
  let initialData: PaginatedResult<unknown> = { data: [], total: 0, page: 1, pageSize: 50 };
  try {
    initialData = await AuthorRepository.findAll({ pageSize: 50 });
  } catch (error) {
    logger.error("AuthorsPage: failed to load authors", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Authors</h1>
          <p className="text-sm text-muted-foreground">
            Manage monitored X/Twitter accounts.
          </p>
        </div>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <AuthorClientPage
          initialAuthors={initialData.data as any}
          initialTotal={initialData.total}
        />
      </Suspense>
    </div>
  );
}
