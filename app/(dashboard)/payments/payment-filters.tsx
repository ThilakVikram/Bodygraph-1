"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/constants";
import { titleCase } from "@/lib/utils";

export function PaymentFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col">
        <Label htmlFor="payment-search">Search</Label>
        <SearchInput paramName="q" placeholder="Invoice #, name, email, or code…" />
      </div>
      <div className="flex flex-col">
        <Label htmlFor="payment-status">Status</Label>
        <Select
          id="payment-status"
          className="w-40"
          value={searchParams.get("status") ?? ""}
          onChange={(e) => setParam("status", e.target.value)}
        >
          <option value="">All statuses</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col">
        <Label htmlFor="payment-method">Method</Label>
        <Select
          id="payment-method"
          className="w-40"
          value={searchParams.get("method") ?? ""}
          onChange={(e) => setParam("method", e.target.value)}
        >
          <option value="">All methods</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {titleCase(m)}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col">
        <Label htmlFor="payment-date-from">From</Label>
        <Input
          id="payment-date-from"
          type="date"
          className="w-40"
          value={searchParams.get("dateFrom") ?? ""}
          onChange={(e) => setParam("dateFrom", e.target.value)}
        />
      </div>
      <div className="flex flex-col">
        <Label htmlFor="payment-date-to">To</Label>
        <Input
          id="payment-date-to"
          type="date"
          className="w-40"
          value={searchParams.get("dateTo") ?? ""}
          onChange={(e) => setParam("dateTo", e.target.value)}
        />
      </div>
    </div>
  );
}
