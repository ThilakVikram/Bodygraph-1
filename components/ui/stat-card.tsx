import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./card";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  tone = "primary",
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  trend?: { value: string; positive?: boolean };
  tone?: "primary" | "success" | "warning" | "destructive" | "info";
  className?: string;
}) {
  const toneClasses: Record<string, string> = {
    primary: "bg-accent text-accent-foreground",
    success: "bg-success-bg text-success",
    warning: "bg-warning-bg text-warning",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info-bg text-info",
  };

  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          {trend && (
            <p
              className={cn(
                "mt-1.5 text-xs font-medium",
                trend.positive ? "text-success" : "text-destructive",
              )}
            >
              {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", toneClasses[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}
