import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { AdminDashboard } from "./admin-dashboard";
import { ReceptionistDashboard } from "./receptionist-dashboard";
import { TrainerDashboard } from "./trainer-dashboard";
import { MemberDashboard } from "./member-dashboard";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/clear-session");

  switch (user.role) {
    case "ADMIN":
      return <AdminDashboard userName={user.name} />;
    case "RECEPTIONIST":
      return <ReceptionistDashboard userName={user.name} />;
    case "TRAINER":
      return <TrainerDashboard userId={user.id} userName={user.name} />;
    case "MEMBER":
      return <MemberDashboard userId={user.id} userName={user.name} />;
    default:
      redirect("/api/auth/clear-session");
  }
}
