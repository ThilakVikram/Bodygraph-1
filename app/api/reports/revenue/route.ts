import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/dal";
import { formatDate, titleCase } from "@/lib/utils";
import { parseDateRange, getRevenueDetail, toCsv, csvResponse } from "@/lib/reports";

export async function GET(request: NextRequest) {
  await requireRole("ADMIN");

  const range = parseDateRange({
    from: request.nextUrl.searchParams.get("from") ?? undefined,
    to: request.nextUrl.searchParams.get("to") ?? undefined,
  });

  const rows = await getRevenueDetail(range);

  const csv = toCsv(
    ["Date", "Invoice Number", "Member", "Method", "Status", "Amount"],
    rows.map((p) => [
      formatDate(p.paymentDate),
      p.invoiceNumber,
      p.member.user.name,
      titleCase(p.method),
      titleCase(p.status),
      p.amount,
    ]),
  );

  return csvResponse("revenue-report.csv", csv);
}
