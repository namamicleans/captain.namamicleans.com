import { Session } from "@/types/generic";

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

export function shouldRefreshToken(session: Session | null): boolean {
  if (!session?.tokenExpiry) {
    return false;
  }

  const now = Date.now();
  return session.tokenExpiry - now < REFRESH_THRESHOLD_MS;
}
