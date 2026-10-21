import fs from "fs";
import path from "path";

export interface ActiveSession {
  sessionId: string;
  username: string;
  updatedAt: number;
  userAgent?: string;
  ip?: string;
}

const SESSION_CACHE_FILE = path.join(process.cwd(), ".user-sessions-cache.json");

// In-memory fallback
const memorySessions: Record<string, ActiveSession> = {};

function readSessions(): Record<string, ActiveSession> {
  try {
    if (fs.existsSync(SESSION_CACHE_FILE)) {
      const raw = fs.readFileSync(SESSION_CACHE_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch {}
  return memorySessions;
}

function writeSessions(sessions: Record<string, ActiveSession>): void {
  try {
    fs.writeFileSync(SESSION_CACHE_FILE, JSON.stringify(sessions, null, 2), "utf-8");
  } catch {}
}

export function registerActiveSession(
  username: string,
  sessionId: string,
  meta?: { userAgent?: string; ip?: string }
): void {
  if (!username || !sessionId) return;
  const key = username.trim().toLowerCase();
  const sessions = readSessions();
  sessions[key] = {
    sessionId,
    username: key,
    updatedAt: Date.now(),
    userAgent: meta?.userAgent,
    ip: meta?.ip,
  };
  memorySessions[key] = sessions[key];
  writeSessions(sessions);
}

export function touchActiveSession(username: string, sessionId: string): void {
  if (!username || !sessionId) return;
  const key = username.trim().toLowerCase();
  const sessions = readSessions();
  if (sessions[key] && sessions[key].sessionId === sessionId) {
    sessions[key].updatedAt = Date.now();
    memorySessions[key] = sessions[key];
    writeSessions(sessions);
  }
}

export function verifyActiveSession(
  username: string,
  sessionId: string
): { valid: boolean; reason?: string } {
  if (!username || !sessionId) {
    return { valid: true };
  }
  const key = username.trim().toLowerCase();
  const sessions = readSessions();
  const active = sessions[key] || memorySessions[key];

  // If no session registered yet on server (e.g. fresh start), treat as valid and auto-register
  if (!active) {
    registerActiveSession(username, sessionId);
    return { valid: true };
  }

  if (active.sessionId !== sessionId) {
    return {
      valid: false,
      reason: "Tài khoản của bạn đã được đăng nhập từ một trình duyệt hoặc thiết bị khác.",
    };
  }

  return { valid: true };
}

export function removeActiveSession(username: string, sessionId?: string): void {
  if (!username) return;
  const key = username.trim().toLowerCase();
  const sessions = readSessions();
  if (!sessionId || (sessions[key] && sessions[key].sessionId === sessionId)) {
    delete sessions[key];
    delete memorySessions[key];
    writeSessions(sessions);
  }
}
