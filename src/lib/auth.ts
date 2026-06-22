import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { SessionData } from "./types";

const SESSION_COOKIE = "catalog_session";

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing SESSION_SECRET");
  }
  return secret;
}

function sign(payload: string) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function setSession(data: SessionData) {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if (sign(payload) !== signature) return null;

  try {
    return JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as SessionData;
  } catch {
    return null;
  }
}

export async function requireStoreSession() {
  const session = await getSession();
  if (!session || session.role !== "store" || !session.storeId) {
    return null;
  }
  return session;
}

export async function requireAdminSession() {
  const session = await getSession();
  if (
    !session ||
    (session.role !== "admin" && session.role !== "super_admin")
  ) {
    return null;
  }
  return session;
}

export async function requireSuperAdminSession() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return null;
  }
  return session;
}

export async function requireAgentSession() {
  const session = await getSession();
  if (
    !session ||
    session.role !== "agent" ||
    !session.agentAccountId ||
    !session.rivhitAgentId
  ) {
    return null;
  }
  return session;
}

export async function requireAgentManagerSession() {
  const session = await getSession();
  if (!session || session.role !== "agent_manager") {
    return null;
  }
  return session;
}
