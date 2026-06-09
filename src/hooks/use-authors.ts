"use client";

import { useState, useEffect, useCallback } from "react";
import type { Author } from "@/types";

interface UseAuthorsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
}

export function useAuthors(opts?: UseAuthorsOptions) {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuthors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { AuthorRepository } = await import("@/repositories");
      const result = await AuthorRepository.findAll({
        page: opts?.page ?? 1,
        pageSize: opts?.pageSize ?? 20,
        search: opts?.search,
      });
      setAuthors(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch authors");
    } finally {
      setLoading(false);
    }
  }, [opts?.page, opts?.pageSize, opts?.search]);

  useEffect(() => {
    fetchAuthors();
  }, [fetchAuthors]);

  return { authors, total, loading, error, refetch: fetchAuthors };
}
