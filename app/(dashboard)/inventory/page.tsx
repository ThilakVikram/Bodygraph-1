import Link from "next/link";
import { AlertTriangle, Boxes, PackageX } from "lucide-react";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { parsePagination, getParam, type SearchParams } from "@/lib/pagination";
import { LOW_STOCK_DEFAULT_THRESHOLD } from "@/lib/constants";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { SearchInput } from "@/components/ui/search-input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { CategoryFilter } from "./category-filter";
import { ItemFormDialog } from "./item-form-dialog";
import { InventoryRowActions } from "./inventory-row-actions";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const { page, take, skip } = parsePagination(sp);
  const search = getParam(sp, "search")?.trim();
  const category = getParam(sp, "category")?.trim();

  const where = {
    ...(search && { name: { contains: search } }),
    ...(category && { category }),
  };

  const [items, total, categoriesRaw, summaryItems] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.inventoryItem.count({ where }),
    prisma.inventoryItem.findMany({
      where: { category: { not: null } },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
    prisma.inventoryItem.findMany({ select: { quantity: true, minStockLevel: true } }),
  ]);

  const categories = categoriesRaw
    .map((c) => c.category)
    .filter((c): c is string => !!c);

  const lowStockCount = summaryItems.filter(
    (i) => i.quantity <= (i.minStockLevel > 0 ? i.minStockLevel : LOW_STOCK_DEFAULT_THRESHOLD),
  ).length;

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Track stock levels for gym supplies and equipment."
        actions={<ItemFormDialog mode="create" />}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total items" value={summaryItems.length} icon={Boxes} tone="primary" />
        <StatCard
          label="Low stock"
          value={lowStockCount}
          icon={AlertTriangle}
          tone={lowStockCount > 0 ? "warning" : "success"}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput placeholder="Search items…" />
        <CategoryFilter categories={categories} />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={PackageX}
          title="No inventory items"
          description="Add an item to start tracking stock levels."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const threshold =
                  item.minStockLevel > 0 ? item.minStockLevel : LOW_STOCK_DEFAULT_THRESHOLD;
                const isLow = item.quantity <= threshold;
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link href={`/inventory/${item.id}`} className="font-medium hover:underline">
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.category ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>
                          {item.quantity} {item.unit ?? "pcs"}
                        </span>
                        {isLow && <Badge variant="warning">Low stock</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.supplier ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? "success" : "neutral"}>
                        {item.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <InventoryRowActions item={item} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="mt-4">
            <Pagination
              basePath="/inventory"
              searchParams={sp}
              page={page}
              pageSize={take}
              total={total}
            />
          </div>
        </>
      )}
    </div>
  );
}
