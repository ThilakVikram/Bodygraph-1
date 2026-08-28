import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, titleCase } from "@/lib/utils";
import { parseDateRange, getMembershipsDetail, toCsv, csvResponse } from "@/lib/reports";

export async function GET(request: NextRequest) {
  await requireRole("ADMIN");

  const range = parseDateRange({
    from: request.nextUrl.searchParams.get("from") ?? undefined,
    to: request.nextUrl.searchParams.get("to") ?? undefined,
  });

  const rows = await getMembershipsDetail(range);
  const now = new Date();

  const csv = toCsv(
    ["Member", "Plan", "Start Date", "End Date", "Stored Status", "Effective Status", "Amount"],
    rows.map((m) => [
      m.member.user.name,
      m.plan.name,
      formatDate(m.startDate),
      formatDate(m.endDate),
      titleCase(m.status),
      m.endDate < now ? "Expired" : titleCase(m.status),
      m.amount,
    ]),
  );

  return csvResponse("memberships-report.csv", csv);
}
