"use client";

import { useRef } from "react";
import Link from "next/link";
import { History, MoreVertical, PackageMinus, PackagePlus, Pencil, Trash2 } from "lucide-react";
import { Menu, MenuItem } from "@/components/ui/menu";
import { Button } from "@/components/ui/button";
import { StockDialog, type StockDialogHandle } from "./stock-dialog";
import { ItemFormDialog, type ItemFormDialogHandle } from "./item-form-dialog";
import { DeleteItemAction, type DeleteItemActionHandle } from "./delete-item-action";

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

export function InventoryRowActions({ item }: { item: ItemLike }) {
  const stockInRef = useRef<StockDialogHandle>(null);
  const stockOutRef = useRef<StockDialogHandle>(null);
  const editRef = useRef<ItemFormDialogHandle>(null);
  const deleteRef = useRef<DeleteItemActionHandle>(null);

  return (
    <>
      <Menu
        trigger={
          <Button variant="ghost" size="icon" aria-label="Item actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        }
      >
        <Link
          href={`/inventory/${item.id}`}
          className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-muted"
        >
          <History className="h-4 w-4" /> View history
        </Link>
        <MenuItem onClick={() => stockInRef.current?.open()}>
          <PackagePlus className="h-4 w-4" /> Stock in
        </MenuItem>
        <MenuItem onClick={() => stockOutRef.current?.open()}>
          <PackageMinus className="h-4 w-4" /> Stock out
        </MenuItem>
        <MenuItem onClick={() => editRef.current?.open()}>
          <Pencil className="h-4 w-4" /> Edit
        </MenuItem>
        <MenuItem destructive onClick={() => deleteRef.current?.open()}>
          <Trash2 className="h-4 w-4" /> Delete
        </MenuItem>
      </Menu>
      {/*
        All rendered as siblings of <Menu>, not nested inside it: Menu
        unmounts its children as soon as one is clicked, which would remove
        these dialogs' native <dialog> elements from the DOM before they ever show.
      */}
      <StockDialog ref={stockInRef} type="STOCK_IN" itemId={item.id} itemName={item.name} />
      <StockDialog ref={stockOutRef} type="STOCK_OUT" itemId={item.id} itemName={item.name} />
      <ItemFormDialog ref={editRef} mode="edit" item={item} />
      <DeleteItemAction ref={deleteRef} id={item.id} name={item.name} />
    </>
  );
}
