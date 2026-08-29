import { prisma } from "@/lib/prisma";

type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
};

export async function createNotification(input: NotificationInput) {
  return prisma.notification.create({ data: input });
}

export async function createNotifications(
  inputs: NotificationInput[],
): Promise<void> {
  if (inputs.length === 0) return;
  await prisma.notification.createMany({ data: inputs });
}
