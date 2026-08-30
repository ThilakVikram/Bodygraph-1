import { requireUser } from "@/lib/auth/dal";
import { PageHeader } from "@/components/layout/page-header";
import { AccountForms } from "./account-forms";

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <div>
      <PageHeader title="Account" description="Manage your profile and password." />
      <AccountForms
        name={user.name}
        username={user.username}
        email={user.email}
        phone={user.phone}
      />
    </div>
  );
}
