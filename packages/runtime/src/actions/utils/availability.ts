/** Availability result returned by guards. */
export type ActionAvailabilityResult =
  | boolean
  | {
      available: boolean;
      reason?: string;
    };

export function normalizeAvailability(result: ActionAvailabilityResult): {
  available: boolean;
  reason?: string;
} {
  return typeof result === "boolean" ? { available: result } : result;
}
