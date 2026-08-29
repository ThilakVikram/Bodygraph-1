import { requireMemberProfile } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { qrTokenToDataUrl } from "@/lib/qr";
import { formatDate, titleCase } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProfileEditForm } from "./profile-edit-form";

export default async function ProfilePage() {
  const { user, member: baseMember } = await requireMemberProfile();

  const member = await prisma.member.findUniqueOrThrow({
    where: { id: baseMember.id },
    include: { branch: true, trainer: { include: { user: true } } },
  });

  const qrDataUrl = await qrTokenToDataUrl(member.qrToken);

  return (
    <div>
      <PageHeader title="My Profile" description="Your membership details and contact information." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <Avatar name={user.name} src={user.avatarUrl} size={80} />
            <div>
              <p className="text-base font-semibold text-foreground">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <StatusBadge status={member.status} />
            <div className="w-full space-y-2 border-t border-border pt-4 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member code</span>
                <span className="font-mono font-medium text-foreground">{member.memberCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Joined</span>
                <span className="font-medium text-foreground">{formatDate(member.joinDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Branch</span>
                <span className="font-medium text-foreground">{member.branch?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trainer</span>
                <span className="font-medium text-foreground">{member.trainer?.user.name ?? "Unassigned"}</span>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="Membership QR code"
              width={128}
              height={128}
              className="mt-2 h-32 w-32 rounded-lg border border-border"
            />
            <p className="text-xs text-muted-foreground">Show this at the front desk to check in</p>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Personal details</CardTitle>
              <CardDescription>
                Read-only. Contact reception to update your name, email, phone, date of birth or gender.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium text-foreground">{user.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date of birth</p>
                <p className="font-medium text-foreground">{formatDate(member.dateOfBirth)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Gender</p>
                <p className="font-medium text-foreground">{member.gender ? titleCase(member.gender) : "—"}</p>
              </div>
            </CardContent>
          </Card>

          <ProfileEditForm
            address={member.address}
            emergencyContactName={member.emergencyContactName}
            emergencyContactPhone={member.emergencyContactPhone}
          />
        </div>
      </div>
    </div>
  );
}
