"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/audit";
import { branchSchema } from "@/lib/validations/branch";
import type { ActionState } from "./types";

function parseInput(formData: FormData) {
  return branchSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
}

export async function createBranchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN");

  const parsed = parseInput(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const branch = await prisma.branch.create({
    data: {
      name: parsed.data.name,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      isActive: parsed.data.isActive,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "Branch",
    entityId: branch.id,
    metadata: { name: branch.name },
  });

  revalidatePath("/settings");

  return { success: true, message: "Branch created." };
}

export async function updateBranchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing branch id." };

  const parsed = parseInput(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.branch.findUnique({ where: { id } });
  if (!existing) return { error: "Branch not found." };

  await prisma.branch.update({
    where: { id },
    data: {
      name: parsed.data.name,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      isActive: parsed.data.isActive,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "Branch",
    entityId: id,
    metadata: { name: parsed.data.name },
  });

  revalidatePath("/settings");

  return { success: true, message: "Branch updated." };
}

export async function toggleBranchActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing branch id." };

  const existing = await prisma.branch.findUnique({ where: { id } });
  if (!existing) return { error: "Branch not found." };

  const updated = await prisma.branch.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "Branch",
    entityId: id,
    metadata: { field: "isActive", value: updated.isActive },
  });

  revalidatePath("/settings");

  return {
    success: true,
    message: updated.isActive ? "Branch activated." : "Branch deactivated.",
  };
}
