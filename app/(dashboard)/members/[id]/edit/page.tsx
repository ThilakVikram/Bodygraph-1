import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { MemberEditForm } from "./member-edit-form";

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole("ADMIN", "RECEPTIONIST");

  const [member, branches, trainers] = await Promise.all([
    prisma.member.findUnique({ where: { id }, include: { user: true } }),
    prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.trainer.findMany({
      where: { isActive: true },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  if (!member) notFound();

  return (
    <div>
      <PageHeader title="Edit Member" description={`Update ${member.user.name}'s profile.`} />
      <MemberEditForm
        memberId={member.id}
        defaultValues={{
          name: member.user.name,
          username: member.user.username,
          email: member.user.email,
          phone: member.user.phone,
          dateOfBirth: member.dateOfBirth ? member.dateOfBirth.toISOString().slice(0, 10) : "",
          gender: member.gender,
          address: member.address,
          emergencyContactName: member.emergencyContactName,
          emergencyContactPhone: member.emergencyContactPhone,
          branchId: member.branchId,
          trainerId: member.trainerId,
        }}
        branches={branches.map((b) => ({ id: b.id, label: b.name }))}
        trainers={trainers.map((t) => ({ id: t.id, label: t.user.name }))}
      />
    </div>
  );
}
