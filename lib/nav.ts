import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  UserCog,
  ClipboardList,
  Layers,
  CalendarCheck,
  CreditCard,
  Dumbbell,
  Apple,
  TrendingUp,
  Bell,
  Package,
  BarChart3,
  Settings,
  ShieldCheck,
  User,
  QrCode,
  History,
} from "lucide-react";
import type { Role } from "@/lib/auth/constants";

export type NavItem = { label: string; href: string; icon: LucideIcon };

const dashboard: NavItem = { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard };
const members: NavItem = { label: "Members", href: "/members", icon: Users };
const trainers: NavItem = { label: "Trainers", href: "/trainers", icon: UserCog };
const membershipPlans: NavItem = {
  label: "Membership Plans",
  href: "/membership-plans",
  icon: ClipboardList,
};
const memberships: NavItem = { label: "Memberships", href: "/memberships", icon: Layers };
const attendance: NavItem = { label: "Attendance", href: "/attendance", icon: CalendarCheck };
const payments: NavItem = { label: "Payments", href: "/payments", icon: CreditCard };
const workouts: NavItem = { label: "Workouts", href: "/workouts", icon: Dumbbell };
const diets: NavItem = { label: "Diet Plans", href: "/diets", icon: Apple };
const progress: NavItem = { label: "Progress", href: "/progress", icon: TrendingUp };
const inventory: NavItem = { label: "Inventory", href: "/inventory", icon: Package };
const reports: NavItem = { label: "Reports", href: "/reports", icon: BarChart3 };
const notifications: NavItem = { label: "Notifications", href: "/notifications", icon: Bell };
const users: NavItem = { label: "Users", href: "/users", icon: ShieldCheck };
const settings: NavItem = { label: "Settings", href: "/settings", icon: Settings };
const auditLogs: NavItem = { label: "Audit Logs", href: "/audit-logs", icon: History };

const profile: NavItem = { label: "My Profile", href: "/profile", icon: User };
const membership: NavItem = { label: "My Membership", href: "/membership", icon: Layers };
const qrCard: NavItem = { label: "QR Membership Card", href: "/qr-card", icon: QrCode };

export function getNavItems(role: Role): NavItem[] {
  switch (role) {
    case "ADMIN":
      return [
        dashboard,
        members,
        trainers,
        membershipPlans,
        memberships,
        attendance,
        payments,
        workouts,
        diets,
        progress,
        inventory,
        reports,
        notifications,
        users,
        settings,
        auditLogs,
      ];
    case "RECEPTIONIST":
      return [dashboard, members, memberships, attendance, payments];
    case "TRAINER":
      return [
        dashboard,
        { ...members, label: "My Members" },
        workouts,
        diets,
        progress,
        attendance,
      ];
    case "MEMBER":
      return [
        dashboard,
        profile,
        membership,
        payments,
        workouts,
        diets,
        attendance,
        progress,
        notifications,
        qrCard,
      ];
    default:
      return [dashboard];
  }
}
