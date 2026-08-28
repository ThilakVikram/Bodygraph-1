"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/audit";
import { createNotifications } from "@/lib/notifications";
import { ROLES } from "@/lib/auth/constants";
import type { ActionState } from "./types";

/** Marks a single notification read. Bind the id as the first arg when wiring to a <form action>. */
export async function markNotificationReadAction(
  notificationId: string,
  _formData: FormData,
): Promise<void> {
  const user = await requireUser();

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { isRead: true },
  });

  revalidatePath("/notifications");
}

/** Marks every unread notification for the current user as read. */
export async function markAllNotificationsReadAction(
  _formData: FormData,
): Promise<void> {
  const user = await requireUser();

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/notifications");
}

const announcementSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150),
  message: z.string().trim().min(1, "Message is required").max(2000),
  audience: z.enum(["ALL", ...ROLES], { message: "Choose a valid audience" }),
});

/** Admin-only: broadcasts an ANNOUNCEMENT notification to a chosen audience. */
export async function sendAnnouncementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("ADMIN");

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    message: formData.get("message"),
    audience: formData.get("audience"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { title, message, audience } = parsed.data;

  const targets = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(audience !== "ALL" && { role: audience }),
    },
    select: { id: true },
  });

  if (targets.length === 0) {
    return { error: "No active users match that audience." };
  }

  await createNotifications(
    targets.map((u) => ({
      userId: u.id,
      type: "ANNOUNCEMENT",
      title,
      message,
    })),
  );

  await writeAuditLog({
    userId: admin.id,
    action: "CREATE",
    entity: "Notification",
    metadata: { type: "ANNOUNCEMENT", audience, recipientCount: targets.length, title },
  });

  revalidatePath("/notifications");

  return {
    success: true,
    message: `Announcement sent to ${targets.length} user${targets.length === 1 ? "" : "s"}.`,
  };
}
