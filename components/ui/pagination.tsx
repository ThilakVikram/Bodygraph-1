import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildPageHref, totalPages as calcTotalPages, type SearchParams } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export function Pagination({
  basePath,
  searchParams,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  searchParams: SearchParams;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = calcTotalPages(total, pageSize);
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
      <p>
        Showing <span className="font-medium text-foreground">{from}</span>
        {"–"}
        <span className="font-medium text-foreground">{to}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span>
      </p>
      {pages > 1 && (
        <div className="flex items-center gap-1">
          <Link
            href={buildPageHref(basePath, searchParams, { page: Math.max(1, page - 1) })}
            aria-disabled={page <= 1}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted",
              page <= 1 && "pointer-events-none opacity-40",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="px-2 text-foreground">
            {page} / {pages}
          </span>
          <Link
            href={buildPageHref(basePath, searchParams, { page: Math.min(pages, page + 1) })}
            aria-disabled={page >= pages}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted",
              page >= pages && "pointer-events-none opacity-40",
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
