"use client";

import { useState, useCallback } from "react";
import type { ContentGeneration } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDate, truncate } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ContentRow extends ContentGeneration {
  tweet?: {
    content: string;
    author?: {
      username: string;
      display_name: string;
    };
  };
}

interface ContentClientPageProps {
  initialData: ContentRow[];
  initialTotal: number;
}

export function ContentClientPage({
  initialData,
  initialTotal,
}: ContentClientPageProps) {
  const [data, setData] = useState(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedContent, setSelectedContent] = useState<ContentRow | null>(
    null,
  );

  const fetchData = useCallback(async (newPage: number) => {
    setLoading(true);
    setPage(newPage);
    try {
      const { ContentRepository } = await import("@/repositories");
      const result = await ContentRepository.findAll({ page: newPage });
      setData(result.data as ContentRow[]);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, []);

  const columns: Column<ContentRow>[] = [
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
      key: "x_version",
      header: "X Version",
      render: (row) => (
        <span className="text-sm">{truncate(row.x_version, 60)}</span>
      ),
    },
    {
      key: "xiaohongshu_title",
      header: "Xiaohongshu Title",
      render: (row) => (
        <span className="text-sm">
          {truncate(row.xiaohongshu_title, 40) || "-"}
        </span>
      ),
    },
    {
      key: "tags",
      header: "Tags",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.tags || []).slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Generated",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[80px]",
      render: (row) => (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedContent(row)}
            >
              View
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Generated Content</DialogTitle>
            </DialogHeader>
            {selectedContent && (
              <ContentPreview content={selectedContent} />
            )}
          </DialogContent>
        </Dialog>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Generated Content</CardTitle>
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

function ContentPreview({ content }: { content: ContentRow }) {
  return (
    <Tabs defaultValue="x" className="mt-4">
      <TabsList>
        <TabsTrigger value="x">X / Twitter</TabsTrigger>
        <TabsTrigger value="wechat">WeChat</TabsTrigger>
        <TabsTrigger value="xiaohongshu">Xiaohongshu</TabsTrigger>
      </TabsList>
      <TabsContent value="x" className="mt-4">
        <div className="rounded-lg bg-muted p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {content.x_version || "No content generated."}
          </p>
        </div>
      </TabsContent>
      <TabsContent value="wechat" className="mt-4">
        <div className="rounded-lg bg-muted p-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {content.wechat_version || "No content generated."}
          </p>
        </div>
      </TabsContent>
      <TabsContent value="xiaohongshu" className="mt-4">
        <div className="space-y-4">
          <div>
            <h4 className="mb-2 text-sm font-medium">Title</h4>
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm">
                {content.xiaohongshu_title || "No title generated."}
              </p>
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-medium">Content</h4>
            <div className="rounded-lg bg-muted p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {content.xiaohongshu_content || "No content generated."}
              </p>
            </div>
          </div>
        </div>
      </TabsContent>
      <div className="mt-4">
        <h4 className="mb-2 text-sm font-medium">Tags</h4>
        <div className="flex flex-wrap gap-2">
          {(content.tags || []).map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </Tabs>
  );
}
