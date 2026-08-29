import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Boxes, CheckCircle2, Truck } from "lucide-react";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { parsePagination, type SearchParams } from "@/lib/pagination";
import { LOW_STOCK_DEFAULT_THRESHOLD } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ItemDetailActions } from "./item-detail-actions";

export default async function InventoryItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("ADMIN");
  const { id } = await params;
  const sp = await searchParams;
  const { page, take, skip } = parsePagination(sp);

  const item = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!item) notFound();

  const [transactions, total] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      where: { itemId: id },
      include: { performedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.inventoryTransaction.count({ where: { itemId: id } }),
  ]);

  const threshold = item.minStockLevel > 0 ? item.minStockLevel : LOW_STOCK_DEFAULT_THRESHOLD;
  const isLow = item.quantity <= threshold;

  return (
    <div>
      <Link
        href="/inventory"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to inventory
      </Link>
      <PageHeader
        title={item.name}
        description={item.category ?? undefined}
        actions={<ItemDetailActions item={item} />}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Quantity on hand"
          value={`${item.quantity} ${item.unit ?? "pcs"}`}
          icon={Boxes}
          tone={isLow ? "warning" : "primary"}
          trend={isLow ? { value: "Low stock — reorder soon", positive: false } : undefined}
        />
        <StatCard
          label="Minimum stock level"
          value={item.minStockLevel}
          icon={AlertTriangle}
          tone="info"
        />
        <StatCard label="Supplier" value={item.supplier ?? "—"} icon={Truck} tone="info" />
        <StatCard
          label="Status"
          value={
            <Badge variant={item.isActive ? "success" : "neutral"}>
              {item.isActive ? "Active" : "Inactive"}
            </Badge>
          }
          icon={CheckCircle2}
          tone={item.isActive ? "success" : "warning"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No transactions yet"
                description="Stock in/out activity for this item will appear here."
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Performed by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(t.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.type === "STOCK_IN" ? "success" : "destructive"}>
                          {t.type === "STOCK_IN" ? "Stock In" : "Stock Out"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {t.type === "STOCK_IN" ? "+" : "-"}
                        {t.quantity}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.reason ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {t.performedBy?.name ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                basePath={`/inventory/${id}`}
                searchParams={sp}
                page={page}
                pageSize={take}
                total={total}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
