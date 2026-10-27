/**
 * Centralized API & Environment configuration for TechWise AI.
 * Reads backend API URL from environment variables with fallback to Railway production backend.
 */

const rawUrl = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://techwiseai-prod.up.railway.app/api/v1"
)
  .trim()
  .replace(/\/+$/, "");

/**
 * Full backend API URL (guaranteed to end with `/api/v1`).
 * Example: "http://localhost:8080/api/v1" or "https://techwiseai-prod.up.railway.app/api/v1"
 */
export const API_BASE_URL = rawUrl.endsWith("/api/v1")
  ? rawUrl
  : `${rawUrl}/api/v1`;

/**
 * Backend root host without `/api/v1` suffix (e.g. for health checks, IPN callbacks, payment gateways).
 * Example: "http://localhost:8080" or "https://techwiseai-prod.up.railway.app"
 */
export const BACKEND_ROOT_URL = API_BASE_URL.replace(/\/api\/v1$/, "");
