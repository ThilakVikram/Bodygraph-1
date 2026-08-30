import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, titleCase } from "@/lib/utils";
import { parseDateRange, getMembersDetail, toCsv, csvResponse } from "@/lib/reports";

export async function GET(request: NextRequest) {
  await requireRole("ADMIN");

  const range = parseDateRange({
    from: request.nextUrl.searchParams.get("from") ?? undefined,
    to: request.nextUrl.searchParams.get("to") ?? undefined,
  });

  const rows = await getMembersDetail(range);

  const csv = toCsv(
    ["Name", "Email", "Branch", "Status", "Join Date"],
    rows.map((m) => [
      m.user.name,
      m.user.email ?? "",
      m.branch?.name ?? "",
      titleCase(m.status),
      formatDate(m.joinDate),
    ]),
  );

  return csvResponse("members-report.csv", csv);
}
