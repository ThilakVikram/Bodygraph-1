import { requireRole, requireMemberProfile, requireTrainerProfile } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { getParam, type SearchParams } from "@/lib/pagination";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressClient } from "./progress-client";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireRole("ADMIN", "TRAINER", "MEMBER");
  const sp = await searchParams;

  if (user.role === "MEMBER") {
    const { member } = await requireMemberProfile();
    const records = await prisma.progressRecord.findMany({
      where: { memberId: member.id },
      orderBy: { recordDate: "desc" },
    });

    return (
      <div>
        <PageHeader title="My Progress" description="Track your measurements and photos over time." />
        <ProgressClient canManage={false} records={records.map(serializeRecord)} />
      </div>
    );
  }

  let members: { id: string; name: string }[];
  if (user.role === "TRAINER") {
    const { trainer } = await requireTrainerProfile();
    const myMembers = await prisma.member.findMany({
      where: { trainerId: trainer.id },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    });
    members = myMembers.map((m) => ({ id: m.id, name: m.user.name }));
  } else {
    const allMembers = await prisma.member.findMany({
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    });
    members = allMembers.map((m) => ({ id: m.id, name: m.user.name }));
  }

  const requestedMemberId = getParam(sp, "memberId");
  const selectedMemberId =
    requestedMemberId && members.some((m) => m.id === requestedMemberId)
      ? requestedMemberId
      : undefined;

  const records = selectedMemberId
    ? await prisma.progressRecord.findMany({
        where: { memberId: selectedMemberId },
        orderBy: { recordDate: "desc" },
      })
    : [];

  return (
    <div>
      <PageHeader title="Progress" description="Record and review member progress over time." />
      <ProgressClient
        canManage
        members={members}
        selectedMemberId={selectedMemberId}
        records={records.map(serializeRecord)}
      />
    </div>
  );
}

function serializeRecord(record: {
  id: string;
  recordDate: Date;
  weight: number | null;
  bodyFatPercent: number | null;
  height: number | null;
  chest: number | null;
  waist: number | null;
  arms: number | null;
  thighs: number | null;
  notes: string | null;
  photoUrl: string | null;
}) {
  return {
    id: record.id,
    recordDate: record.recordDate.toISOString(),
    weight: record.weight,
    bodyFatPercent: record.bodyFatPercent,
    height: record.height,
    chest: record.chest,
    waist: record.waist,
    arms: record.arms,
    thighs: record.thighs,
    notes: record.notes,
    photoUrl: record.photoUrl,
  };
}
