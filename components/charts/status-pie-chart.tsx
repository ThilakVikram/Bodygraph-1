"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { titleCase } from "@/lib/utils";

const COLORS: Record<string, string> = {
  ACTIVE: "var(--color-success)",
  EXPIRED: "var(--color-destructive)",
  CANCELLED: "var(--color-muted-foreground)",
  PENDING: "var(--color-warning)",
};

export function StatusPieChart({ data }: { data: { status: string; count: number }[] }) {
  const hasData = data.some((d) => d.count > 0);
  if (!hasData) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No membership data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="status" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.status} fill={COLORS[entry.status] ?? "var(--color-muted-foreground)"} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [Number(value), titleCase(String(name))]}
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            color: "var(--color-card-foreground)",
            fontSize: 12,
          }}
        />
        <Legend
          formatter={(value: string) => titleCase(value)}
          wrapperStyle={{ fontSize: 12, color: "var(--color-muted-foreground)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
