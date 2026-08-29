import { cn } from "@/lib/utils";

export type BadgeVariant = "neutral" | "success" | "warning" | "destructive" | "info" | "primary";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-info-bg text-info",
  primary: "bg-accent text-accent-foreground",
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}
