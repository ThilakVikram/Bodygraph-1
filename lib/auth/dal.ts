import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionToken, hashToken } from "./session";
import type { Role } from "./constants";

export const getCurrentUser = cache(async () => {
  const token = await getSessionToken();
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    return null;
  }

  return session.user;
});

/**
 * Redirects to /login when there is no authenticated user. Routes through
 * /api/auth/clear-session (not directly to /login) so a stale/invalid
 * session cookie gets cleared — otherwise proxy.ts's cookie-presence check
 * bounces the request straight back here, looping forever.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/clear-session");
  return user;
}

/**
 * Redirects to /login when unauthenticated, /forbidden when the role doesn't
 * match. A user with isAdmin=true always passes, regardless of role.
 */
export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!user.isAdmin && !roles.includes(user.role as Role)) {
    redirect("/forbidden");
  }
  return user;
}

export const getCurrentMemberProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "MEMBER") return null;
  return prisma.member.findUnique({ where: { userId: user.id } });
});

export const getCurrentTrainerProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") return null;
  return prisma.trainer.findUnique({ where: { userId: user.id } });
});

/** Convenience helper: the Member row a MEMBER must have to use member-only pages. */
export async function requireMemberProfile() {
  const user = await requireRole("MEMBER");
  const member = await prisma.member.findUnique({ where: { userId: user.id } });
  if (!member) redirect("/forbidden");
  return { user, member };
}

/** Convenience helper: the Trainer row a TRAINER must have to use trainer-only pages. */
export async function requireTrainerProfile() {
  const user = await requireRole("TRAINER");
  const trainer = await prisma.trainer.findUnique({ where: { userId: user.id } });
  if (!trainer) redirect("/forbidden");
  return { user, trainer };
}
