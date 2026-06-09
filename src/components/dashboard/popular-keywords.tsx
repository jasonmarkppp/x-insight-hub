import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Keyword {
  keyword: string;
  count: number;
}

export function PopularKeywords({
  keywords,
  loading,
}: {
  keywords: Keyword[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Popular Keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-20 rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...keywords.map((k) => k.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Popular Keywords</CardTitle>
      </CardHeader>
      <CardContent>
        {keywords.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No keywords yet. Analysis data will appear here.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => {
              const intensity = Math.round((kw.count / maxCount) * 100);
              return (
                <Badge
                  key={kw.keyword}
                  variant="secondary"
                  className="text-xs"
                  style={{
                    opacity: 0.4 + (intensity / 100) * 0.6,
                  }}
                >
                  {kw.keyword}
                  <span className="ml-1 text-muted-foreground">
                    {kw.count}
                  </span>
                </Badge>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
