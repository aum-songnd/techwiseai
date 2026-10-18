import fs from "fs";
import path from "path";

export interface StoredServerProfile {
  username: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  phone?: string;
  avatarUrl?: string;
  updatedAt?: number;
}

const CACHE_FILE = path.join(process.cwd(), ".user-profiles-cache.json");

// In-memory fallback
const memoryCache: Record<string, StoredServerProfile> = {};

export function readServerProfiles(): Record<string, StoredServerProfile> {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch {}
  return memoryCache;
}

export function getServerProfile(username?: string): StoredServerProfile | null {
  if (!username) return null;
  const key = username.trim().toLowerCase();
  const all = readServerProfiles();
  return all[key] || memoryCache[key] || null;
}

export function saveServerProfile(profile: StoredServerProfile): void {
  if (!profile?.username) return;
  const key = profile.username.trim().toLowerCase();

  try {
    const all = readServerProfiles();
    const existing =
      all[key] || memoryCache[key] || { username: profile.username };
    const updated: StoredServerProfile = {
      ...existing,
      username: profile.username,
      updatedAt: Date.now(),
    };

    if (profile.fullName !== undefined) updated.fullName = profile.fullName;
    if (profile.email !== undefined) updated.email = profile.email;
    if (profile.phoneNumber !== undefined) {
      updated.phoneNumber = profile.phoneNumber;
      updated.phone = profile.phoneNumber;
    }
    if (profile.phone !== undefined) {
      updated.phoneNumber = profile.phone;
      updated.phone = profile.phone;
    }
    if (profile.avatarUrl !== undefined) updated.avatarUrl = profile.avatarUrl;

    all[key] = updated;
    memoryCache[key] = updated;
    fs.writeFileSync(CACHE_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch {
    const existing = memoryCache[key] || { username: profile.username };
    const updated: StoredServerProfile = {
      ...existing,
      username: profile.username,
      updatedAt: Date.now(),
    };
    if (profile.fullName !== undefined) updated.fullName = profile.fullName;
    if (profile.email !== undefined) updated.email = profile.email;
    if (profile.phoneNumber !== undefined) {
      updated.phoneNumber = profile.phoneNumber;
      updated.phone = profile.phoneNumber;
    }
    if (profile.avatarUrl !== undefined) updated.avatarUrl = profile.avatarUrl;
    memoryCache[key] = updated;
  }
}

/**
 * Bulk import profiles (e.g. from local storage all_user_profiles)
 */
export function importServerProfiles(
  profiles: Record<string, Partial<StoredServerProfile>>
): void {
  if (!profiles || typeof profiles !== "object") return;
  try {
    const all = readServerProfiles();
    for (const [key, p] of Object.entries(profiles)) {
      if (!p || !p.username) continue;
      const uKey = (p.username || key).trim().toLowerCase();
      const existing = all[uKey] || memoryCache[uKey] || {};
      const merged: StoredServerProfile = {
        ...existing,
        username: p.username || key,
        fullName: p.fullName || existing.fullName,
        email: p.email || existing.email,
        phoneNumber: p.phoneNumber || p.phone || existing.phoneNumber,
        phone: p.phoneNumber || p.phone || existing.phone,
        avatarUrl: p.avatarUrl || existing.avatarUrl,
        updatedAt: p.updatedAt || existing.updatedAt || Date.now(),
      };
      all[uKey] = merged;
      memoryCache[uKey] = merged;
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch {}
}

/**
 * Check if an email is already used by another user account
 */
export function isEmailTakenByOtherUser(
  email: string,
  excludeUsername?: string
): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  const exclude = excludeUsername?.trim().toLowerCase();

  const all = readServerProfiles();
  for (const [key, profile] of Object.entries(all)) {
    const uName = (profile.username || key).trim().toLowerCase();
    if (exclude && uName === exclude) continue;
    if (profile.email && profile.email.trim().toLowerCase() === cleanEmail) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a phone number is already used by another user account
 */
export function isPhoneTakenByOtherUser(
  phone: string,
  excludeUsername?: string
): boolean {
  if (!phone) return false;
  const cleanPhone = phone.trim();
  const exclude = excludeUsername?.trim().toLowerCase();

  const all = readServerProfiles();
  for (const [key, profile] of Object.entries(all)) {
    const uName = (profile.username || key).trim().toLowerCase();
    if (exclude && uName === exclude) continue;
    const existingPhone = profile.phoneNumber || profile.phone;
    if (existingPhone && existingPhone.trim() === cleanPhone) {
      return true;
    }
  }
  return false;
}

/**
 * Safely extracts username from a JWT Bearer header without full crypto verification.
 */
export function extractUsernameFromJwt(
  authHeader?: string | null
): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.substring(7).trim();
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );
    return payload.sub || payload.username || null;
  } catch {
    return null;
  }
}
