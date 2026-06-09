"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { TweetWithAuthor } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { formatDate, truncate } from "@/lib/utils";
import { generateContent, processTweet } from "@/app/actions";

interface TweetsClientPageProps {
  initialTweets: TweetWithAuthor[];
  initialTotal: number;
}

export function TweetsClientPage({
  initialTweets,
  initialTotal,
}: TweetsClientPageProps) {
  const router = useRouter();
  const [tweets, setTweets] = useState(initialTweets);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTweet, setSelectedTweet] = useState<TweetWithAuthor | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [generating, setGenerating] = useState<string | null>(null);

  const fetchTweets = useCallback(
    async (opts: { page?: number; search?: string }) => {
      setLoading(true);
      try {
        const { TweetRepository } = await import("@/repositories");
        const result = await TweetRepository.findAll({
          page: opts.page ?? page,
          pageSize: 20,
          search: opts.search ?? search,
        });
        setTweets(result.data);
        setTotal(result.total);
      } finally {
        setLoading(false);
      }
    },
    [page, search],
  );

  const handleSearch = useCallback(
    async (query: string) => {
      setSearch(query);
      setPage(1);
      await fetchTweets({ page: 1, search: query });
    },
    [fetchTweets],
  );

  const handlePageChange = useCallback(
    async (newPage: number) => {
      setPage(newPage);
      await fetchTweets({ page: newPage });
    },
    [fetchTweets],
  );

  const handleGenerateContent = async (tweetId: string) => {
    setGenerating(tweetId);
    const result = await generateContent(tweetId);
    setGenerating(null);
    if (result.success) {
      router.refresh();
    }
  };

  const handleProcess = async (tweetId: string) => {
    await processTweet(tweetId);
    router.refresh();
  };

  const columns: Column<TweetWithAuthor>[] = [
    {
      key: "author",
      header: "Author",
      render: (tweet) => (
        <span className="font-medium">
          {tweet.author?.display_name || tweet.author?.username || "Unknown"}
        </span>
      ),
    },
    {
      key: "content",
      header: "Content",
      render: (tweet) => (
        <button
          onClick={() => setSelectedTweet(tweet)}
          className="text-left hover:text-primary"
        >
          {truncate(tweet.content, 80)}
        </button>
      ),
    },
    {
      key: "created_at",
      header: "Time",
      render: (tweet) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(tweet.created_at)}
        </span>
      ),
    },
    {
      key: "processed",
      header: "Status",
      render: (tweet) => (
        <div className="flex items-center gap-2">
          {tweet.processed ? (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Processed
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <XCircle className="h-3 w-3" />
              Pending
            </Badge>
          )}
          {tweet.pushed_to_feishu && (
            <Badge variant="bullish" className="text-xs">
              Pushed
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[180px]",
      render: (tweet) => (
        <div className="flex items-center gap-1">
          {!tweet.processed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleProcess(tweet.id)}
            >
              Analyze
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleGenerateContent(tweet.id)}
            disabled={generating === tweet.id}
            title="Generate content"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
          <a
            href={`https://x.com/${tweet.author?.username || "twitter"}/status/${tweet.tweet_id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="icon" title="View on X">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>
      ),
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Tweets</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={tweets}
            total={total}
            page={page}
            pageSize={20}
            loading={loading}
            onPageChange={handlePageChange}
            onSearch={handleSearch}
            searchPlaceholder="Search tweets..."
          />
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedTweet}
        onOpenChange={(open) => !open && setSelectedTweet(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tweet Details</DialogTitle>
            <DialogDescription>
              Full content and actions for this tweet.
            </DialogDescription>
          </DialogHeader>
          {selectedTweet && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {selectedTweet.author?.display_name ||
                    selectedTweet.author?.username}
                </span>
                <span>@{selectedTweet.author?.username}</span>
                <span>·</span>
                <span>{formatDate(selectedTweet.created_at)}</span>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {selectedTweet.content}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!selectedTweet.processed && (
                  <Button
                    size="sm"
                    onClick={() => handleProcess(selectedTweet.id)}
                  >
                    Analyze & Push
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateContent(selectedTweet.id)}
                  disabled={generating === selectedTweet.id}
                >
                  <Sparkles className="mr-1 h-4 w-4" />
                  {generating === selectedTweet.id
                    ? "Generating..."
                    : "Generate Content"}
                </Button>
                <a
                  href={`https://x.com/${selectedTweet.author?.username || "twitter"}/status/${selectedTweet.tweet_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="mr-1 h-4 w-4" />
                    View on X
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
