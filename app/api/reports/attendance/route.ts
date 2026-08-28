import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/dal";
import { formatDateTime, titleCase } from "@/lib/utils";
import { parseDateRange, getAttendanceDetail, toCsv, csvResponse } from "@/lib/reports";

export async function GET(request: NextRequest) {
  await requireRole("ADMIN");

  const range = parseDateRange({
    from: request.nextUrl.searchParams.get("from") ?? undefined,
    to: request.nextUrl.searchParams.get("to") ?? undefined,
  });

  const rows = await getAttendanceDetail(range);

  const csv = toCsv(
    ["Member", "Check In", "Check Out", "Method"],
    rows.map((a) => [
      a.member.user.name,
      formatDateTime(a.checkIn),
      a.checkOut ? formatDateTime(a.checkOut) : "",
      titleCase(a.method),
    ]),
  );

  return csvResponse("attendance-report.csv", csv);
}
