/** A retention deadline permits an explicit request; it never schedules deletion. */
export function retentionWindow(
  approvedAt: string | undefined,
  days: number | null | undefined,
  now = Date.now(),
) {
  if (
    !Number.isInteger(days) ||
    days! < 0 ||
    days! > 36500 ||
    !approvedAt ||
    !Number.isFinite(now)
  )
    return null;
  const approval = Date.parse(approvedAt);
  if (!Number.isFinite(approval)) return null;
  const deadline = approval + days! * 86400000;
  return {
    minimumDays: days!,
    eligibleAt: new Date(deadline).toISOString(),
    eligible: now >= deadline,
  };
}
