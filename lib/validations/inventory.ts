import { z } from "zod";
import { INVENTORY_TRANSACTION_TYPES } from "@/lib/constants";

/** Converts a blank/whitespace-only form value to undefined so optional numeric fields don't coerce "" to 0. */
function blankToUndefined(value: unknown) {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

const optionalNonNegativeInt = (message: string) =>
  z.preprocess(
    blankToUndefined,
    z.coerce.number({ message }).int(message).nonnegative(message).optional(),
  );

const optionalNonNegativeFloat = (message: string) =>
  z.preprocess(
    blankToUndefined,
    z.coerce.number({ message }).nonnegative(message).optional(),
  );

/** Shared fields for both create and edit forms. Quantity is intentionally excluded — it only
 * changes via InventoryTransaction records (see stockTransactionSchema / adjustStockAction). */
const inventoryItemBaseSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  unit: z.string().trim().max(20).optional().or(z.literal("")),
  minStockLevel: z.coerce
    .number({ message: "Minimum stock must be a number" })
    .int("Minimum stock must be a whole number")
    .nonnegative("Minimum stock can't be negative")
    .default(0),
  supplier: z.string().trim().max(150).optional().or(z.literal("")),
  costPrice: optionalNonNegativeFloat("Cost price must be a non-negative number"),
});

export const createInventoryItemSchema = inventoryItemBaseSchema.extend({
  initialQuantity: optionalNonNegativeInt("Initial quantity must be a non-negative whole number"),
});
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;

export const updateInventoryItemSchema = inventoryItemBaseSchema.extend({
  isActive: z.coerce.boolean().default(true),
});
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;

export const stockTransactionSchema = z.object({
  itemId: z.string().min(1, "Missing item id"),
  type: z.enum(INVENTORY_TRANSACTION_TYPES),
  quantity: z.coerce
    .number({ message: "Quantity must be a number" })
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than 0"),
  reason: z.string().trim().max(300).optional().or(z.literal("")),
});
export type StockTransactionInput = z.infer<typeof stockTransactionSchema>;
