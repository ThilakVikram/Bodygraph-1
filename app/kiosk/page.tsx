import { requireRole } from "@/lib/auth/dal";
import { KioskClient } from "./kiosk-client";

/**
 * Standalone self-check-in kiosk. Loading it at all requires an
 * ADMIN/RECEPTIONIST session (so a front-desk device only starts showing
 * this once staff opens it), but the page has no dashboard chrome and the
 * check-ins it records aren't attributed to that staff account — members
 * identify themselves and the page resets between each one.
 */
export default async function KioskPage() {
  await requireRole("ADMIN", "RECEPTIONIST");

  return <KioskClient />;
}
