"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Author } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/data-table";
import {
  Plus,
  Trash2,
  Power,
  PowerOff,
  ExternalLink,
  Zap,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { addAuthor, deleteAuthor, toggleAuthorActive, updateAuthorTier } from "@/app/actions";
import { formatDate } from "@/lib/utils";

interface AuthorClientPageProps {
  initialAuthors: Author[];
  initialTotal: number;
}

/**
 * Tier badge config — visual distinction for monitoring frequency.
 */
const TIER_CONFIG: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" }> = {
  S: {
    label: "S - 10min",
    icon: <Zap className="h-3 w-3" />,
    variant: "default",
  },
  A: {
    label: "A - 1hr",
    icon: <Clock className="h-3 w-3" />,
    variant: "secondary",
  },
  B: {
    label: "B - 6hr",
    icon: <AlertTriangle className="h-3 w-3" />,
    variant: "outline",
  },
};

export function AuthorClientPage({
  initialAuthors,
  initialTotal,
}: AuthorClientPageProps) {
  const router = useRouter();
  const [authors, setAuthors] = useState(initialAuthors);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>("A");

  const handleSearch = useCallback(async (query: string) => {
    setSearch(query);
    setLoading(true);
    try {
      const { AuthorRepository } = await import("@/repositories");
      const result = await AuthorRepository.findAll({ search: query, pageSize: 50 });
      setAuthors(result.data);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAddAuthor = async (formData: FormData) => {
    setFormError(null);
    formData.set("tier", selectedTier);
    const result = await addAuthor(formData);
    if (result.error) {
      setFormError(result.error);
    } else {
      setDialogOpen(false);
      setSelectedTier("A");
      router.refresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this author?")) return;
    await deleteAuthor(id);
    setAuthors((prev) => prev.filter((a) => a.id !== id));
    setTotal((prev) => prev - 1);
  };

  const handleToggleActive = async (id: string) => {
    await toggleAuthorActive(id);
    setAuthors((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, active: !a.active } : a,
      ),
    );
  };

  const handleTierChange = async (id: string, tier: "S" | "A" | "B") => {
    await updateAuthorTier(id, tier);
    setAuthors((prev) =>
      prev.map((a) => (a.id === id ? { ...a, tier } : a)),
    );
  };

  const columns: Column<Author>[] = [
    {
      key: "display_name",
      header: "Name",
      render: (author) => (
        <div className="flex items-center gap-3">
          {author.avatar_url ? (
            <img
              src={author.avatar_url}
              alt={author.display_name}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {author.display_name.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-medium">{author.display_name}</p>
            <p className="text-xs text-muted-foreground">@{author.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: "tier",
      header: "Tier",
      render: (author) => {
        const cfg = TIER_CONFIG[author.tier] ?? TIER_CONFIG.A;
        return (
          <Select
            defaultValue={author.tier}
            onValueChange={(val) => handleTierChange(author.id, val as "S" | "A" | "B")}
          >
            <SelectTrigger className="h-7 w-[110px]">
              <SelectValue>
                <Badge variant={cfg.variant} className="gap-1 px-1.5 py-0 text-xs">
                  {cfg.icon}
                  {cfg.label}
                </Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="S">
                <span className="flex items-center gap-2">
                  <Zap className="h-3 w-3" /> S - 10 min
                </span>
              </SelectItem>
              <SelectItem value="A">
                <span className="flex items-center gap-2">
                  <Clock className="h-3 w-3" /> A - 1 hour
                </span>
              </SelectItem>
              <SelectItem value="B">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3" /> B - 6 hours
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    {
      key: "active",
      header: "Status",
      render: (author) => (
        <Badge variant={author.active ? "default" : "secondary"}>
          {author.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "last_fetched_at",
      header: "Last Fetch",
      render: (author) => (
        <span className="text-sm text-muted-foreground">
          {author.last_fetched_at ? formatDate(author.last_fetched_at) : "Never"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Added",
      render: (author) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(author.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[120px]",
      render: (author) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleToggleActive(author.id)}
            title={author.active ? "Stop monitoring" : "Start monitoring"}
          >
            {author.active ? (
              <PowerOff className="h-4 w-4" />
            ) : (
              <Power className="h-4 w-4" />
            )}
          </Button>
          <a
            href={`https://x.com/${author.username}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="icon" title="View on X">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(author.id)}
            title="Remove author"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">All Authors</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Author
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form action={handleAddAuthor}>
                <DialogHeader>
                  <DialogTitle>Add Author</DialogTitle>
                  <DialogDescription>
                    Enter the X/Twitter username to start monitoring.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Username
                    </label>
                    <Input
                      name="username"
                      placeholder="e.g. elonmusk"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Without the @ symbol
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Display Name (optional)
                    </label>
                    <Input
                      name="display_name"
                      placeholder="Display name override"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Monitoring Tier
                    </label>
                    <Select
                      defaultValue="A"
                      onValueChange={(val) => setSelectedTier(val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="S">
                          <span className="flex items-center gap-2">
                            <Zap className="h-3 w-3" /> S - Every 10 min
                          </span>
                        </SelectItem>
                        <SelectItem value="A">
                          <span className="flex items-center gap-2">
                            <Clock className="h-3 w-3" /> A - Every 1 hour
                          </span>
                        </SelectItem>
                        <SelectItem value="B">
                          <span className="flex items-center gap-2">
                            <AlertTriangle className="h-3 w-3" /> B - Every 6 hours
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      S = high frequency, A = normal, B = low frequency
                    </p>
                  </div>
                  {formError && (
                    <p className="text-sm text-destructive">{formError}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit">Add Author</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={authors}
          total={total}
          page={1}
          pageSize={50}
          loading={loading}
          onPageChange={() => {}}
          onSearch={handleSearch}
          searchPlaceholder="Search authors..."
        />
      </CardContent>
    </Card>
  );
}
