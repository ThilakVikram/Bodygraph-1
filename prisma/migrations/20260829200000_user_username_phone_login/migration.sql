PRAGMA foreign_keys=OFF;

CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Backfill: username from the email's local part (falls back to the row id
-- if there's no email); phone from the existing value, or the row id if it
-- was empty/missing. Both need a unique, non-null value for existing rows
-- before the column can enforce that going forward.
INSERT INTO "new_User" (
  "id", "username", "email", "phone", "passwordHash", "role", "isAdmin",
  "name", "avatarUrl", "isActive", "mustChangePassword", "lastLoginAt",
  "createdAt", "updatedAt"
)
SELECT
  "id",
  LOWER(CASE
    WHEN "email" IS NOT NULL AND INSTR("email", '@') > 1
      THEN SUBSTR("email", 1, INSTR("email", '@') - 1)
    ELSE "id"
  END),
  "email",
  CASE WHEN "phone" IS NULL OR "phone" = '' THEN "id" ELSE "phone" END,
  "passwordHash", "role", "isAdmin", "name", "avatarUrl", "isActive",
  "mustChangePassword", "lastLoginAt", "createdAt", "updatedAt"
FROM "User";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE INDEX "User_role_idx" ON "User"("role");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
