"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/audit";
import { loginSchema, changePasswordSchema, updateProfileSchema } from "@/lib/validations/auth";
import type { ActionState } from "./types";

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (!user || !user.isActive || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await writeAuditLog({
    userId: user.id,
    action: "LOGIN",
    entity: "User",
    entityId: user.id,
  });

  const redirectTo = String(formData.get("redirectTo") ?? "") || "/dashboard";
  redirect(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) {
    await writeAuditLog({
      userId: user.id,
      action: "LOGOUT",
      entity: "User",
      entityId: user.id,
    });
  }
  await destroySession();
  redirect("/login");
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    await destroySession();
    redirect("/login");
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  if (!verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
    return { error: "Current password is incorrect." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(parsed.data.newPassword),
      mustChangePassword: false,
    },
  });
  await writeAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "User",
    entityId: user.id,
    metadata: { field: "password" },
  });

  return { success: true, message: "Password updated successfully." };
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) {
    await destroySession();
    redirect("/login");
  }

  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, phone: parsed.data.phone || null },
  });
  await writeAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "User",
    entityId: user.id,
    metadata: { field: "profile" },
  });

  return { success: true, message: "Profile updated." };
}
