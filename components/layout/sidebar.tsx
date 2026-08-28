"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, X } from "lucide-react";
import { getNavItems } from "@/lib/nav";
import type { Role } from "@/lib/auth/constants";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { useSidebar } from "./sidebar-context";

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = getNavItems(role);
  const { open, close } = useSidebar();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={close}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-sidebar-border px-5">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-white">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Dumbbell className="h-5 w-5" />
            </span>
            <span className="truncate">{APP_NAME}</span>
          </Link>
          <button
            onClick={close}
            className="text-sidebar-muted lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-active text-white"
                    : "text-sidebar-muted hover:bg-sidebar-active/60 hover:text-white",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
