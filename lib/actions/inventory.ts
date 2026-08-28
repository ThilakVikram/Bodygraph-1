"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/audit";
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  stockTransactionSchema,
} from "@/lib/validations/inventory";
import type { ActionState } from "./types";

function baseFields(formData: FormData) {
  return {
    name: formData.get("name"),
    category: formData.get("category"),
    unit: formData.get("unit"),
    minStockLevel: formData.get("minStockLevel"),
    supplier: formData.get("supplier"),
    costPrice: formData.get("costPrice"),
  };
}

export async function createInventoryItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN");

  const parsed = createInventoryItemSchema.safeParse({
    ...baseFields(formData),
    initialQuantity: formData.get("initialQuantity"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { initialQuantity, ...data } = parsed.data;
  const startQuantity = initialQuantity ?? 0;

  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.inventoryItem.create({
      data: {
        name: data.name,
        category: data.category || null,
        unit: data.unit || "pcs",
        minStockLevel: data.minStockLevel,
        supplier: data.supplier || null,
        costPrice: data.costPrice ?? null,
        quantity: 0,
        isActive: true,
      },
    });

    if (startQuantity > 0) {
      await tx.inventoryTransaction.create({
        data: {
          itemId: created.id,
          type: "STOCK_IN",
          quantity: startQuantity,
          reason: "Initial stock",
          performedById: user.id,
        },
      });
      return tx.inventoryItem.update({
        where: { id: created.id },
        data: { quantity: startQuantity },
      });
    }

    return created;
  });

  await writeAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "InventoryItem",
    entityId: item.id,
    metadata: { name: item.name, initialQuantity: startQuantity },
  });

  revalidatePath("/inventory");

  return { success: true, message: "Inventory item created." };
}

export async function updateInventoryItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing item id." };

  const parsed = updateInventoryItemSchema.safeParse({
    ...baseFields(formData),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!existing) return { error: "Inventory item not found." };

  await prisma.inventoryItem.update({
    where: { id },
    data: {
      name: parsed.data.name,
      category: parsed.data.category || null,
      unit: parsed.data.unit || "pcs",
      minStockLevel: parsed.data.minStockLevel,
      supplier: parsed.data.supplier || null,
      costPrice: parsed.data.costPrice ?? null,
      isActive: parsed.data.isActive,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "InventoryItem",
    entityId: id,
    metadata: { name: parsed.data.name },
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);

  return { success: true, message: "Inventory item updated." };
}

export async function adjustStockAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN");

  const parsed = stockTransactionSchema.safeParse({
    itemId: formData.get("itemId"),
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { itemId, type, quantity, reason } = parsed.data;

  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Inventory item not found." };

  if (type === "STOCK_OUT" && item.quantity - quantity < 0) {
    return { error: "Not enough stock." };
  }

  await prisma.$transaction([
    prisma.inventoryTransaction.create({
      data: {
        itemId,
        type,
        quantity,
        reason: reason || null,
        performedById: user.id,
      },
    }),
    prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        quantity: type === "STOCK_IN" ? { increment: quantity } : { decrement: quantity },
      },
    }),
  ]);

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "InventoryItem",
    entityId: itemId,
    metadata: { transactionType: type, quantity, reason: reason || undefined },
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${itemId}`);

  return {
    success: true,
    message: type === "STOCK_IN" ? "Stock added." : "Stock removed.",
  };
}

export async function deleteInventoryItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing item id." };

  const existing = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!existing) return { error: "Inventory item not found." };

  const transactionCount = await prisma.inventoryTransaction.count({ where: { itemId: id } });
  if (transactionCount > 0) {
    return {
      error:
        "This item has stock transaction history and can't be deleted. Deactivate it instead.",
    };
  }

  await prisma.inventoryItem.delete({ where: { id } });

  await writeAuditLog({
    userId: user.id,
    action: "DELETE",
    entity: "InventoryItem",
    entityId: id,
    metadata: { name: existing.name },
  });

  revalidatePath("/inventory");

  return { success: true, message: "Inventory item deleted." };
}
