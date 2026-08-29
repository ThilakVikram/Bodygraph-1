import Link from "next/link";
import { Layers, CalendarCheck, Dumbbell, Apple } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function MemberDashboard({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const member = await prisma.member.findUnique({ where: { userId } });

  if (!member) {
    return (
      <EmptyState
        title="Member profile not set up"
        description="Ask reception to finish setting up your member profile."
      />
    );
  }

  const [activeMembership, recentAttendance, activeWorkoutPlan, activeDietPlan] = await Promise.all([
    prisma.membership.findFirst({
      where: { memberId: member.id, status: "ACTIVE" },
      include: { plan: true },
      orderBy: { endDate: "desc" },
    }),
    prisma.attendance.findMany({
      where: { memberId: member.id },
      orderBy: { checkIn: "desc" },
      take: 5,
    }),
    prisma.workoutPlan.findFirst({
      where: { memberId: member.id, status: "ACTIVE" },
      orderBy: { startDate: "desc" },
    }),
    prisma.dietPlan.findFirst({
      where: { memberId: member.id, status: "ACTIVE" },
      orderBy: { startDate: "desc" },
    }),
  ]);

  const attendanceThisMonthStart = new Date();
  attendanceThisMonthStart.setDate(1);
  attendanceThisMonthStart.setHours(0, 0, 0, 0);
  const attendanceThisMonth = await prisma.attendance.count({
    where: { memberId: member.id, checkIn: { gte: attendanceThisMonthStart } },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {userName.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Here&apos;s your fitness snapshot.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Membership"
          value={activeMembership ? activeMembership.plan.name : "No active plan"}
          icon={Layers}
          tone={activeMembership ? "success" : "warning"}
        />
        <StatCard label="Visits This Month" value={attendanceThisMonth} icon={CalendarCheck} tone="info" />
        <StatCard
          label="Workout Plan"
          value={activeWorkoutPlan ? activeWorkoutPlan.name : "None assigned"}
          icon={Dumbbell}
          tone="primary"
        />
        <StatCard
          label="Diet Plan"
          value={activeDietPlan ? activeDietPlan.name : "None assigned"}
          icon={Apple}
          tone="primary"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Membership</h3>
              <Link href="/membership" className={buttonVariants("outline", "sm")}>
                View details
              </Link>
            </div>
            {activeMembership ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium text-foreground">{activeMembership.plan.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={activeMembership.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Expires</span>
                  <span className="font-medium text-foreground">{formatDate(activeMembership.endDate)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                You don&apos;t have an active membership. Visit the front desk to renew.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-base font-semibold text-foreground">Recent attendance</h3>
            {recentAttendance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No visits recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentAttendance.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{formatDateTime(a.checkIn)}</span>
                    <span className="text-muted-foreground">{a.method === "QR" ? "QR" : "Manual"}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
