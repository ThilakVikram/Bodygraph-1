import { requireRole } from "@/lib/auth/dal";
import { PageHeader } from "@/components/layout/page-header";
import { CheckinScanner } from "./checkin-scanner";

export default async function CheckinPage() {
  await requireRole("ADMIN", "RECEPTIONIST");

  return (
    <div>
      <PageHeader
        title="Check-in"
        description="Scan a member's QR code or enter their token manually to check them in."
      />
      <CheckinScanner />
    </div>
  );
}
