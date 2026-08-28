import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";

/**
 * Returns the memberships belonging to a single member, for the "Record
 * Payment" dialog's membership dropdown (populated client-side after a
 * member is selected). Admin/Receptionist only.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireRole("ADMIN", "RECEPTIONIST");
  const { id } = await params;

  const memberships = await prisma.membership.findMany({
    where: { memberId: id },
    include: { plan: true },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json(
    memberships.map((m) => ({
      id: m.id,
      planName: m.plan.name,
      status: m.status,
      startDate: m.startDate,
      endDate: m.endDate,
      amount: m.amount,
    })),
  );
}
