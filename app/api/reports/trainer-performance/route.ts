import { requireRole } from "@/lib/auth/dal";
import { getTrainerPerformance } from "@/lib/analytics";
import { toCsv, csvResponse } from "@/lib/reports";

export async function GET() {
  await requireRole("ADMIN");

  const rows = await getTrainerPerformance();

  const csv = toCsv(
    ["Trainer", "Active Members"],
    rows.map((t) => [t.trainer, t.activeMembers]),
  );

  return csvResponse("trainer-performance-report.csv", csv);
}
