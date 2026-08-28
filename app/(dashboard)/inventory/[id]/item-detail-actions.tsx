"use client";

import { PackageMinus, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockDialog } from "../stock-dialog";
import { ItemFormDialog } from "../item-form-dialog";

type ItemLike = {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  minStockLevel: number;
  supplier: string | null;
  costPrice: number | null;
  isActive: boolean;
};

/**
 * A small client wrapper so the (server) detail page can pass plain item
 * data down without passing trigger *functions* across the server/client
 * boundary (React forbids serializing functions into Client Components).
 */
export function ItemDetailActions({ item }: { item: ItemLike }) {
  return (
    <>
      <StockDialog
        type="STOCK_IN"
        itemId={item.id}
        itemName={item.name}
        trigger={(open) => (
          <Button variant="outline" onClick={open}>
            <PackagePlus className="h-4 w-4" /> Stock in
          </Button>
        )}
      />
      <StockDialog
        type="STOCK_OUT"
        itemId={item.id}
        itemName={item.name}
        trigger={(open) => (
          <Button variant="outline" onClick={open}>
            <PackageMinus className="h-4 w-4" /> Stock out
          </Button>
        )}
      />
      <ItemFormDialog mode="edit" item={item} trigger={(open) => <Button onClick={open}>Edit</Button>} />
    </>
  );
}
