export const SESSION_COOKIE_NAME = "bg_session";
export const SESSION_DURATION_DAYS = 30;

export const ROLES = ["ADMIN", "RECEPTIONIST", "TRAINER", "MEMBER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  RECEPTIONIST: "Receptionist",
  TRAINER: "Trainer",
  MEMBER: "Member",
};

export const STAFF_ROLES: Role[] = ["ADMIN", "RECEPTIONIST", "TRAINER"];
