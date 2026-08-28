import { requireUser } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import type { Role } from "@/lib/auth/constants";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <Sidebar role={user.role as Role} />
        <div className="flex min-h-screen flex-col lg:pl-64">
          <Topbar
            user={{
              name: user.name,
              email: user.email,
              role: user.role,
              avatarUrl: user.avatarUrl,
            }}
            unreadCount={unreadCount}
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
