"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input } from "./input";

export function SearchInput({
  placeholder = "Search…",
  paramName = "search",
}: {
  placeholder?: string;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramName) ?? "");
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Re-sync local (typed) value when the URL changes from elsewhere
    // (browser back/forward, a "clear filters" link, etc.) — intentional,
    // not derivable at render time since this input owns in-progress typing
    // the committed URL hasn't caught up to yet.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(searchParams.get(paramName) ?? "");
  }, [searchParams, paramName]);

  function handleChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set(paramName, next);
      else params.delete(paramName);
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    }, 350);
  }

  return (
    <div className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}
