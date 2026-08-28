import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

export type SearchParams = Record<string, string | string[] | undefined>;

export function getParam(sp: SearchParams, key: string): string | undefined {
  const value = sp[key];
  return Array.isArray(value) ? value[0] : value;
}

export function parsePagination(
  sp: SearchParams,
  pageSize: number = DEFAULT_PAGE_SIZE,
) {
  const page = Math.max(1, Number(getParam(sp, "page") ?? 1) || 1);
  const take = Math.max(
    1,
    Math.min(100, Number(getParam(sp, "pageSize") ?? pageSize) || pageSize),
  );
  const skip = (page - 1) * take;
  return { page, take, skip };
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Builds an href for basePath with sp's params merged with overrides (undefined/"" removes a key). */
export function buildPageHref(
  basePath: string,
  sp: SearchParams,
  overrides: Record<string, string | number | undefined> = {},
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue;
    params.set(key, Array.isArray(value) ? value[0] : value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === "") params.delete(key);
    else params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
