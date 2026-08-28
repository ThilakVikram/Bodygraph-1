import { Users, CalendarCheck, Dumbbell, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatDateTime } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function TrainerDashboard({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const trainer = await prisma.trainer.findUnique({ where: { userId } });

  if (!trainer) {
    return (
      <EmptyState
        title="Trainer profile not set up"
        description="Ask an administrator to finish setting up your trainer profile."
      />
    );
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const [assignedMembers, todayAttendance, activeWorkoutPlans, recentProgress] = await Promise.all([
    prisma.member.findMany({
      where: { trainerId: trainer.id },
      include: { user: { select: { name: true, avatarUrl: true } } },
      take: 6,
      orderBy: { joinDate: "desc" },
    }),
    prisma.attendance.count({
      where: {
        member: { trainerId: trainer.id },
        checkIn: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.workoutPlan.count({ where: { trainerId: trainer.id, status: "ACTIVE" } }),
    prisma.progressRecord.findMany({
      where: { member: { trainerId: trainer.id } },
      include: { member: { include: { user: { select: { name: true, avatarUrl: true } } } } },
      orderBy: { recordDate: "desc" },
      take: 5,
    }),
  ]);

  const assignedCount = await prisma.member.count({ where: { trainerId: trainer.id } });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {userName.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Your coaching overview for today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assigned Members" value={assignedCount} icon={Users} tone="primary" />
        <StatCard label="Today's Attendance" value={todayAttendance} icon={CalendarCheck} tone="info" />
        <StatCard label="Active Workout Plans" value={activeWorkoutPlans} icon={Dumbbell} tone="success" />
        <StatCard label="Recent Progress Logs" value={recentProgress.length} icon={TrendingUp} tone="warning" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-base font-semibold text-foreground">Assigned members</h3>
            {assignedMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members assigned yet.</p>
            ) : (
              <ul className="space-y-3">
                {assignedMembers.map((m) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <Avatar name={m.user.name} src={m.user.avatarUrl} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{m.user.name}</p>
                      <p className="text-xs text-muted-foreground">Joined {formatDate(m.joinDate)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-base font-semibold text-foreground">Recent progress updates</h3>
            {recentProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground">No progress records yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentProgress.map((p) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <Avatar name={p.member.user.name} src={p.member.user.avatarUrl} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {p.member.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.weight ? `${p.weight}kg` : "Update"} · {formatDateTime(p.recordDate)}
                      </p>
                    </div>
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
