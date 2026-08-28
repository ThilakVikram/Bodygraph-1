import Link from "next/link";
import { Bell } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { parsePagination, type SearchParams } from "@/lib/pagination";
import { cn, formatDateTime, titleCase } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/lib/actions/notifications";
import { AnnouncementDialog } from "./announcement-dialog";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const { page, take, skip } = parsePagination(sp);

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.notification.count({ where: { userId: user.id } }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
            : "You're all caught up."
        }
        actions={
          <>
            {unreadCount > 0 && (
              <form action={markAllNotificationsReadAction}>
                <Button type="submit" variant="outline" size="sm">
                  Mark all as read
                </Button>
              </form>
            )}
            {user.role === "ADMIN" && <AnnouncementDialog />}
          </>
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Updates about memberships, payments, and announcements will show up here."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={cn("flex items-start gap-3 p-4", !n.isRead && "bg-accent/40")}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-2 h-2 w-2 shrink-0 rounded-full",
                    !n.isRead ? "bg-primary" : "bg-transparent",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="neutral">{titleCase(n.type)}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(n.createdAt)}
                    </span>
                  </div>
                  {n.link ? (
                    <Link
                      href={n.link}
                      className={cn(
                        "mt-1 block text-sm hover:underline",
                        !n.isRead
                          ? "font-semibold text-foreground"
                          : "font-medium text-foreground",
                      )}
                    >
                      {n.title}
                    </Link>
                  ) : (
                    <p
                      className={cn(
                        "mt-1 text-sm",
                        !n.isRead
                          ? "font-semibold text-foreground"
                          : "font-medium text-foreground",
                      )}
                    >
                      {n.title}
                    </p>
                  )}
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                </div>
                {!n.isRead && (
                  <form action={markNotificationReadAction.bind(null, n.id)}>
                    <Button type="submit" variant="outline" size="sm">
                      Mark read
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </div>
          <Pagination
            basePath="/notifications"
            searchParams={sp}
            page={page}
            pageSize={take}
            total={total}
          />
        </Card>
      )}
    </div>
  );
}
