import { requireMemberProfile } from "@/lib/auth/dal";
import { qrTokenToDataUrl } from "@/lib/qr";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PrintButton } from "./print-button";

export default async function QrCardPage() {
  const { user, member } = await requireMemberProfile();
  const qrDataUrl = await qrTokenToDataUrl(member.qrToken);

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="QR Membership Card"
          description="Show this at the front desk to check in."
          actions={<PrintButton />}
        />
      </div>

      <Card className="mx-auto max-w-sm">
        <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, next/image doesn't apply */}
          <img
            src={qrDataUrl}
            alt="Your membership QR code"
            width={280}
            height={280}
            className="rounded-lg border border-border"
            style={{ width: 280, height: 280 }}
          />
          <div>
            <p className="text-lg font-semibold text-foreground">{user.name}</p>
            <p className="text-sm text-muted-foreground">{member.memberCode}</p>
            <div className="mt-2 flex justify-center">
              <StatusBadge status={member.status} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Show this QR code at the front desk to check in.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
