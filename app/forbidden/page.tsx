import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-foreground">Access denied</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          You don&apos;t have permission to view this page. If you think this is a
          mistake, contact your administrator.
        </p>
      </div>
      <Link href="/dashboard" className={buttonVariants("primary", "md")}>
        Back to dashboard
      </Link>
    </div>
  );
}
