import { Badge, type BadgeVariant } from "./badge";
import { titleCase } from "@/lib/utils";

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  ACTIVE: "success",
  PAID: "success",
  COMPLETED: "success",
  CONFIRMED: "success",

  PENDING: "warning",
  PROCESSING: "warning",
  PARTIAL: "warning",

  EXPIRED: "destructive",
  CANCELLED: "destructive",
  FAILED: "destructive",
  INACTIVE: "destructive",
  UNPAID: "destructive",

  REFUNDED: "info",
  DRAFT: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANTS[status] ?? "neutral";
  return <Badge variant={variant}>{titleCase(status)}</Badge>;
}
