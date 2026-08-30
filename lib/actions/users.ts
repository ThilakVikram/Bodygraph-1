"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { hashPassword } from "@/lib/auth/password";
import { generateTempPassword } from "@/lib/auth/generate-password";
import { writeAuditLog } from "@/lib/audit";
import { createStaffUserSchema, updateUserSchema, STAFF_ROLES } from "@/lib/validations/user";
import type { ActionState } from "./types";

function isStaffRole(role: string): role is (typeof STAFF_ROLES)[number] {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

export async function createStaffUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("ADMIN");

  const parsed = createStaffUserSchema.safeParse({
    name: formData.get("name"),
    username: formData.get("username"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const email = parsed.data.email || undefined;
  const [usernameOwner, phoneOwner, emailOwner] = await Promise.all([
    prisma.user.findUnique({ where: { username: parsed.data.username } }),
    prisma.user.findUnique({ where: { phone: parsed.data.phone } }),
    email ? prisma.user.findUnique({ where: { email } }) : Promise.resolve(null),
  ]);
  if (usernameOwner) {
    return { fieldErrors: { username: ["This username is already taken."] } };
  }
  if (phoneOwner) {
    return { fieldErrors: { phone: ["A user with this phone number already exists."] } };
  }
  if (emailOwner) {
    return { fieldErrors: { email: ["A user with this email already exists."] } };
  }

  const tempPassword = generateTempPassword();

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      username: parsed.data.username,
      phone: parsed.data.phone,
      email,
      role: parsed.data.role,
      passwordHash: hashPassword(tempPassword),
      mustChangePassword: true,
      isActive: true,
    },
  });

  await writeAuditLog({
    userId: admin.id,
    action: "CREATE",
    entity: "User",
    entityId: user.id,
    metadata: { name: user.name, username: user.username, role: user.role },
  });

  revalidatePath("/users");

  return {
    success: true,
    message: "Staff user created.",
    data: { userId: user.id, name: user.name, username: user.username, tempPassword },
  };
}

export async function updateUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing user id." };

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return { error: "User not found." };

  const rawRole = formData.get("role");
  const parsed = updateUserSchema.safeParse({
    name: formData.get("name"),
    username: formData.get("username"),
    phone: formData.get("phone"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
    role: rawRole ? String(rawRole) : undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Role changes are only ever allowed between the staff roles this module owns —
  // Trainer/Member accounts keep their role, which is managed by the other modules.
  const nextRole =
    parsed.data.role && isStaffRole(existing.role) ? parsed.data.role : existing.role;

  if (existing.id === admin.id && existing.role === "ADMIN" && nextRole !== "ADMIN") {
    return { error: "You can't change your own role away from Admin." };
  }
  if (existing.id === admin.id && !parsed.data.isActive) {
    return { error: "You can't deactivate your own account." };
  }

  const [usernameOwner, phoneOwner] = await Promise.all([
    prisma.user.findUnique({ where: { username: parsed.data.username } }),
    prisma.user.findUnique({ where: { phone: parsed.data.phone } }),
  ]);
  if (usernameOwner && usernameOwner.id !== id) {
    return { fieldErrors: { username: ["This username is already taken."] } };
  }
  if (phoneOwner && phoneOwner.id !== id) {
    return { fieldErrors: { phone: ["A user with this phone number already exists."] } };
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: parsed.data.name,
      username: parsed.data.username,
      phone: parsed.data.phone,
      isActive: parsed.data.isActive,
      role: nextRole,
    },
  });

  if (!updated.isActive && existing.isActive) {
    await prisma.session.deleteMany({ where: { userId: id } });
  }

  await writeAuditLog({
    userId: admin.id,
    action: "UPDATE",
    entity: "User",
    entityId: id,
    metadata: { name: updated.name, isActive: updated.isActive, role: updated.role },
  });

  revalidatePath("/users");

  return { success: true, message: "User updated." };
}

export async function toggleUserActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing user id." };

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return { error: "User not found." };

  const nextActive = !existing.isActive;

  if (!nextActive && id === admin.id) {
    return { error: "You can't deactivate your own account." };
  }

  await prisma.user.update({ where: { id }, data: { isActive: nextActive } });

  if (!nextActive) {
    await prisma.session.deleteMany({ where: { userId: id } });
  }

  await writeAuditLog({
    userId: admin.id,
    action: "UPDATE",
    entity: "User",
    entityId: id,
    metadata: { field: "isActive", value: nextActive },
  });

  revalidatePath("/users");

  return { success: true, message: nextActive ? "User reactivated." : "User deactivated." };
}

export async function resetUserPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing user id." };

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return { error: "User not found." };

  const tempPassword = generateTempPassword();

  await prisma.user.update({
    where: { id },
    data: { passwordHash: hashPassword(tempPassword), mustChangePassword: true },
  });
  await prisma.session.deleteMany({ where: { userId: id } });

  await writeAuditLog({
    userId: admin.id,
    action: "UPDATE",
    entity: "User",
    entityId: id,
    metadata: { field: "password", reset: true },
  });

  revalidatePath("/users");

  return {
    success: true,
    message: "Password reset.",
    data: { tempPassword, email: existing.email, name: existing.name },
  };
}
