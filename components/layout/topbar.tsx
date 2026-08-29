"use client";

import Link from "next/link";
import { Menu as MenuIcon, Bell, LogOut, User as UserIcon } from "lucide-react";
import { useSidebar } from "./sidebar-context";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Menu, MenuItem } from "@/components/ui/menu";
import { Avatar } from "@/components/ui/avatar";
import { ROLE_LABELS, type Role } from "@/lib/auth/constants";
import { logoutAction } from "@/lib/actions/auth";

export function Topbar({
  user,
  unreadCount,
}: {
  user: { name: string; email: string; role: string; avatarUrl: string | null };
  unreadCount: number;
}) {
  const { toggle } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-card/80 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <button
        onClick={toggle}
        className="text-muted-foreground lg:hidden"
        aria-label="Open menu"
      >
        <MenuIcon className="h-5 w-5" />
      </button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <Link
          href="/notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
        <Menu
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 hover:bg-muted"
            >
              <Avatar name={user.name} src={user.avatarUrl} size={28} />
              <span className="hidden text-left sm:block">
                <span className="block max-w-[10rem] truncate text-sm font-medium leading-tight text-foreground">
                  {user.name}
                </span>
                <span className="block text-xs leading-tight text-muted-foreground">
                  {ROLE_LABELS[user.role as Role]}
                </span>
              </span>
            </button>
          }
        >
          <Link
            href="/account"
            className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-muted"
          >
            <UserIcon className="h-4 w-4" /> Account
          </Link>
          <form action={logoutAction}>
            <MenuItem type="submit" destructive>
              <LogOut className="h-4 w-4" /> Log out
            </MenuItem>
          </form>
        </Menu>
      </div>
    </header>
  );
}
