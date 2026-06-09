"use client";

import { useState, useCallback } from "react";
import type { TweetAnalysis } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/data-table";
import { formatDate, truncate } from "@/lib/utils";

interface AnalysisRow extends TweetAnalysis {
  tweet?: {
    content: string;
    author?: {
      username: string;
      display_name: string;
    };
  };
}

interface AnalysisClientPageProps {
  initialData: AnalysisRow[];
  initialTotal: number;
}

export function AnalysisClientPage({
  initialData,
  initialTotal,
}: AnalysisClientPageProps) {
  const [data, setData] = useState(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async (newPage: number) => {
    setLoading(true);
    setPage(newPage);
    try {
      const { AnalysisRepository } = await import("@/repositories");
      const result = await AnalysisRepository.findAll({ page: newPage });
      setData(result.data as AnalysisRow[]);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, []);

  const columns: Column<AnalysisRow>[] = [
    {
      key: "author",
      header: "Author",
      render: (row) => (
        <span className="font-medium">
          {row.tweet?.author?.display_name ||
            row.tweet?.author?.username ||
            "Unknown"}
        </span>
      ),
    },
    {
      key: "summary",
      header: "Summary",
      render: (row) => (
        <span className="text-sm">{truncate(row.summary, 60)}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (row) => (
        <Badge variant="secondary">{row.category || "Uncategorized"}</Badge>
      ),
    },
    {
      key: "sentiment",
      header: "Sentiment",
      render: (row) => (
        <Badge
          variant={
            row.sentiment === "Bullish"
              ? "bullish"
              : row.sentiment === "Bearish"
                ? "bearish"
                : "neutral"
          }
        >
          {row.sentiment || "Neutral"}
        </Badge>
      ),
    },
    {
      key: "keywords",
      header: "Keywords",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.keywords || []).slice(0, 3).map((kw) => (
            <Badge key={kw} variant="outline" className="text-xs">
              {kw}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Analyzed",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "translation",
      header: "Translation",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {truncate(row.translation, 50) || "-"}
        </span>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Analysis Results</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={data}
          total={total}
          page={page}
          pageSize={20}
          loading={loading}
          onPageChange={fetchData}
        />
      </CardContent>
    </Card>
  );
}
