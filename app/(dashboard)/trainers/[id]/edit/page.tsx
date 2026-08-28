import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { TrainerEditForm } from "./trainer-edit-form";

export default async function EditTrainerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole("ADMIN");

  const [trainer, branches] = await Promise.all([
    prisma.trainer.findUnique({ where: { id }, include: { user: true } }),
    prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!trainer) notFound();

  return (
    <div>
      <PageHeader title="Edit Trainer" description={`Update ${trainer.user.name}'s profile.`} />
      <TrainerEditForm
        trainerId={trainer.id}
        defaultValues={{
          name: trainer.user.name,
          email: trainer.user.email,
          phone: trainer.user.phone,
          specialization: trainer.specialization,
          bio: trainer.bio,
          experienceYears: trainer.experienceYears,
          branchId: trainer.branchId,
        }}
        branches={branches.map((b) => ({ id: b.id, label: b.name }))}
      />
    </div>
  );
}
