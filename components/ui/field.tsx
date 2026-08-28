import { cn } from "@/lib/utils";
import { Label } from "./label";

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string | string[];
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const errorText = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("flex flex-col", className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {errorText ? (
        <p className="mt-1 text-xs text-destructive">{errorText}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
