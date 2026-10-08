import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@newplace/db";

/**
 * Password recovery ("¿Olvidaste tu contraseña?").
 * - The emailed token is 32 random bytes (base64url); only its SHA-256 is stored, so a database leak yields no usable link.
 * - Valid 30 minutes and single use (usedAt is set atomically); a new request deletes the user's earlier tokens.
 * - The request endpoint answers the same way whether or not the email has an account (no enumeration).
 */
export const RESET_TTL_MS = 30 * 60 * 1000;

export const hashResetToken = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");

/** Shape of a token we issue: 43 base64url characters (32 bytes). Anything else is rejected without a DB lookup. */
export const isResetTokenShape = (token: string) => /^[A-Za-z0-9_-]{43}$/.test(token);

/** Path queued in the email body (email.ts turns a /{locale}/… path into the absolute button link). */
export const resetPath = (locale: "es" | "en", token: string) => `/${locale}/reset-password?token=${token}`;

/**
 * Issues a fresh token for `email` when it belongs to an active account with a password or not (Google-only accounts
 * get one too: setting a password is how they add email sign-in). Returns null when there is no such account; the
 * caller must not reveal that to the client.
 */
export async function createPasswordReset(email: string, now = Date.now()): Promise<{ token: string; userId: string; locale: "es" | "en" } | null> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true, suspended: true, locale: true } });
  if (!user || user.suspended) return null;
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    // Only the latest link works: earlier (used or not) tokens for this user are gone.
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashResetToken(token), expiresAt: new Date(now + RESET_TTL_MS) } }),
  ]);
  return { token, userId: user.id, locale: user.locale === "en" ? "en" : "es" };
}

/** True when `token` is currently usable (for the reset page to show the form or the "link expired" state). */
export async function checkPasswordReset(token: string, now = Date.now()): Promise<boolean> {
  if (!isResetTokenShape(token)) return false;
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) }, select: { expiresAt: true, usedAt: true } });
  return !!row && !row.usedAt && row.expiresAt.getTime() > now;
}

/**
 * Consumes `token` and sets the new password. Returns the account email on success, null when the token is unknown,
 * expired or already used. The usedAt update is conditional, so two concurrent submissions can't both succeed.
 */
export async function consumePasswordReset(token: string, password: string, now = Date.now()): Promise<{ userId: string; email: string } | null> {
  if (!isResetTokenShape(token)) return null;
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) }, include: { user: { select: { id: true, email: true, suspended: true, emailVerified: true } } } });
  if (!row || row.usedAt || row.expiresAt.getTime() <= now || row.user.suspended) return null;
  const claimed = await prisma.passwordResetToken.updateMany({ where: { id: row.id, usedAt: null, expiresAt: { gt: new Date(now) } }, data: { usedAt: new Date(now) } });
  if (claimed.count !== 1) return null;
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    // Opening the emailed link proves the address belongs to them.
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash, ...(row.user.emailVerified ? {} : { emailVerified: new Date(now) }) } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: row.userId, id: { not: row.id } } }),
  ]);
  return { userId: row.user.id, email: row.user.email };
}
