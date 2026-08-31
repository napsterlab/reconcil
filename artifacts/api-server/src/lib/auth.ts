import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export type ReconcilRole = "admin" | "collaborateur" | "superadmin";

export type ReconcilSession = {
  userId: string;
  email: string;
  cabinetId: string;
  role: ReconcilRole;
  issuedAt: number;
};

const cookieName = "reconcil_session";
const sessionMaxAgeMs = 8 * 60 * 60 * 1000;

function secret() {
  return process.env.SESSION_SECRET ?? "development-only-reconcil-secret";
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSession(session: Omit<ReconcilSession, "issuedAt">) {
  const payload = Buffer.from(JSON.stringify({ ...session, issuedAt: Date.now() })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function readSession(value?: string): ReconcilSession | null {
  if (!value) return null;
  const [payload, suppliedSignature] = value.split(".");
  if (!payload || !suppliedSignature) return null;
  const expected = signature(payload);
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ReconcilSession;
    if (!session.userId || !session.email || !session.cabinetId || !session.role || Date.now() - session.issuedAt > sessionMaxAgeMs) return null;
    return session;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, session: Omit<ReconcilSession, "issuedAt">) {
  res.cookie(cookieName, createSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionMaxAgeMs,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(cookieName, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
}

export function sessionFromRequest(req: Request) {
  return readSession(req.signedCookies?.[cookieName] ?? req.cookies?.[cookieName]);
}

declare global {
  namespace Express {
    interface Request {
      reconcilSession?: ReconcilSession;
    }
  }
}

export function requireSession(req: Request, res: Response, next: NextFunction) {
  const session = sessionFromRequest(req);
  if (!session) return res.status(401).json({ error: "Session expirée ou invalide" });
  req.reconcilSession = session;
  return next();
}

export function requireRole(...roles: ReconcilRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.reconcilSession || !roles.includes(req.reconcilSession.role)) return res.status(403).json({ error: "Droits insuffisants" });
    return next();
  };
}
