import { requireRole } from "@/lib/auth/dal";
import { getMemberGrowthSeries, toCsv, csvResponse } from "@/lib/reports";

export async function GET() {
  await requireRole("ADMIN");

  const rows = await getMemberGrowthSeries(6);

  const csv = toCsv(
    ["Month", "New Members"],
    rows.map((r) => [r.month, r.newMembers]),
  );

  return csvResponse("member-growth-report.csv", csv);
}
