import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { qrTokenToDataUrl } from "@/lib/qr";
import { formatCurrency, formatDate, formatDateTime, titleCase } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { MemberDetailActions } from "./member-detail-actions";
import { MemberPhotoForm } from "./member-photo-form";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("ADMIN", "RECEPTIONIST", "TRAINER");
  const isStaff = user.role === "ADMIN" || user.role === "RECEPTIONIST";

  let ownTrainerId: string | null = null;
  if (user.role === "TRAINER") {
    const trainer = await prisma.trainer.findUnique({ where: { userId: user.id } });
    if (!trainer) redirect("/forbidden");
    ownTrainerId = trainer.id;
  }

  const member = await prisma.member.findUnique({
    where: { id },
    include: { user: true, branch: true, trainer: { include: { user: true } } },
  });

  if (!member) notFound();
  if (ownTrainerId && member.trainerId !== ownTrainerId) redirect("/forbidden");

  const [memberships, payments, attendances, workoutPlans, dietPlans, progressRecords, qrDataUrl] =
    await Promise.all([
      prisma.membership.findMany({
        where: { memberId: member.id },
        include: { plan: true },
        orderBy: { startDate: "desc" },
        take: 5,
      }),
      prisma.payment.findMany({
        where: { memberId: member.id },
        orderBy: { paymentDate: "desc" },
        take: 5,
      }),
      prisma.attendance.findMany({
        where: { memberId: member.id },
        orderBy: { checkIn: "desc" },
        take: 5,
      }),
      prisma.workoutPlan.findMany({
        where: { memberId: member.id },
        orderBy: { startDate: "desc" },
        take: 5,
      }),
      prisma.dietPlan.findMany({
        where: { memberId: member.id },
        orderBy: { startDate: "desc" },
        take: 5,
      }),
      prisma.progressRecord.findMany({
        where: { memberId: member.id },
        orderBy: { recordDate: "desc" },
        take: 5,
      }),
      qrTokenToDataUrl(member.qrToken),
    ]);

  const overviewTab = (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          {isStaff ? (
            <MemberPhotoForm memberId={member.id} name={member.user.name} photoUrl={member.photoUrl} />
          ) : (
            <Avatar name={member.user.name} src={member.photoUrl} size={96} />
          )}
          <div>
            <p className="text-base font-semibold text-foreground">{member.user.name}</p>
            <p className="text-sm text-muted-foreground">{member.user.email}</p>
          </div>
          <StatusBadge status={member.status} />
          <div className="w-full space-y-2 border-t border-border pt-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member code</span>
              <span className="font-mono font-medium text-foreground">{member.memberCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Joined</span>
              <span className="font-medium text-foreground">{formatDate(member.joinDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Branch</span>
              <span className="font-medium text-foreground">{member.branch?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trainer</span>
              <span className="font-medium text-foreground">{member.trainer?.user.name ?? "Unassigned"}</span>
            </div>
          </div>
          {isStaff && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="Membership QR code"
                width={112}
                height={112}
                className="mt-2 h-28 w-28 rounded-lg border border-border"
              />
              <p className="text-xs text-muted-foreground">Scan to check in</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardContent className="grid grid-cols-1 gap-4 p-6 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p className="font-medium text-foreground">{member.user.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Date of birth</p>
            <p className="font-medium text-foreground">{formatDate(member.dateOfBirth)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Gender</p>
            <p className="font-medium text-foreground">{member.gender ? titleCase(member.gender) : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Address</p>
            <p className="font-medium text-foreground">{member.address ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Emergency contact</p>
            <p className="font-medium text-foreground">{member.emergencyContactName ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Emergency phone</p>
            <p className="font-medium text-foreground">{member.emergencyContactPhone ?? "—"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const membershipsTab = (
    <RelatedSection
      viewAllHref={`/memberships?memberId=${member.id}`}
      isEmpty={memberships.length === 0}
      emptyLabel="No memberships recorded yet."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plan</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {memberships.map((m) => (
            <TableRow key={m.id}>
              <TableCell>{m.plan.name}</TableCell>
              <TableCell>
                {formatDate(m.startDate)} – {formatDate(m.endDate)}
              </TableCell>
              <TableCell>{formatCurrency(m.amount)}</TableCell>
              <TableCell>
                <StatusBadge status={m.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </RelatedSection>
  );

  const paymentsTab = (
    <RelatedSection
      viewAllHref={`/payments?memberId=${member.id}`}
      isEmpty={payments.length === 0}
      emptyLabel="No payments recorded yet."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-mono text-xs">{p.invoiceNumber}</TableCell>
              <TableCell>{formatDate(p.paymentDate)}</TableCell>
              <TableCell>{formatCurrency(p.amount)}</TableCell>
              <TableCell>{titleCase(p.method)}</TableCell>
              <TableCell>
                <StatusBadge status={p.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </RelatedSection>
  );

  const attendanceTab = (
    <RelatedSection
      viewAllHref={`/attendance?memberId=${member.id}`}
      isEmpty={attendances.length === 0}
      emptyLabel="No attendance recorded yet."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Check-in</TableHead>
            <TableHead>Check-out</TableHead>
            <TableHead>Method</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendances.map((a) => (
            <TableRow key={a.id}>
              <TableCell>{formatDateTime(a.checkIn)}</TableCell>
              <TableCell>{a.checkOut ? formatDateTime(a.checkOut) : "—"}</TableCell>
              <TableCell>
                <Badge variant={a.method === "QR" ? "info" : "neutral"}>{titleCase(a.method)}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </RelatedSection>
  );

  const workoutsTab = (
    <RelatedSection
      viewAllHref={`/workouts?memberId=${member.id}`}
      isEmpty={workoutPlans.length === 0}
      emptyLabel="No workout plans assigned yet."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plan</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workoutPlans.map((w) => (
            <TableRow key={w.id}>
              <TableCell>{w.name}</TableCell>
              <TableCell>
                {formatDate(w.startDate)} {w.endDate ? `– ${formatDate(w.endDate)}` : ""}
              </TableCell>
              <TableCell>
                <StatusBadge status={w.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </RelatedSection>
  );

  const dietsTab = (
    <RelatedSection
      viewAllHref={`/diets?memberId=${member.id}`}
      isEmpty={dietPlans.length === 0}
      emptyLabel="No diet plans assigned yet."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plan</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dietPlans.map((d) => (
            <TableRow key={d.id}>
              <TableCell>{d.name}</TableCell>
              <TableCell>
                {formatDate(d.startDate)} {d.endDate ? `– ${formatDate(d.endDate)}` : ""}
              </TableCell>
              <TableCell>
                <StatusBadge status={d.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </RelatedSection>
  );

  const progressTab = (
    <RelatedSection
      viewAllHref={`/progress?memberId=${member.id}`}
      isEmpty={progressRecords.length === 0}
      emptyLabel="No progress records yet."
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>Body fat %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {progressRecords.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{formatDate(p.recordDate)}</TableCell>
              <TableCell>{p.weight ? `${p.weight} kg` : "—"}</TableCell>
              <TableCell>{p.bodyFatPercent ? `${p.bodyFatPercent}%` : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </RelatedSection>
  );

  return (
    <div>
      <PageHeader
        title={member.user.name}
        description={`Member ${member.memberCode}`}
        actions={isStaff ? <MemberDetailActions memberId={member.id} status={member.status} /> : undefined}
      />
      <Tabs
        tabs={[
          { value: "overview", label: "Overview", content: overviewTab },
          { value: "memberships", label: "Memberships", content: membershipsTab },
          { value: "payments", label: "Payments", content: paymentsTab },
          { value: "attendance", label: "Attendance", content: attendanceTab },
          { value: "workouts", label: "Workouts", content: workoutsTab },
          { value: "diets", label: "Diet Plans", content: dietsTab },
          { value: "progress", label: "Progress", content: progressTab },
        ]}
      />
    </div>
  );
}

function RelatedSection({
  viewAllHref,
  isEmpty,
  emptyLabel,
  children,
}: {
  viewAllHref: string;
  isEmpty: boolean;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link href={viewAllHref} className={buttonVariants("outline", "sm")}>
          View all
        </Link>
      </div>
      {isEmpty ? <EmptyState title={emptyLabel} /> : children}
    </div>
  );
}
