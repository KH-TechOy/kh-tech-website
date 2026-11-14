import type { Document } from "./types";
import type { Tx } from "./workStorage";
import { helsinkiToday } from "../src/reportLocale";
export type RetentionPolicy = {
  version: string;
  minimumDays: number;
  effectiveFrom: string;
  reason: string;
  byUid: string;
  at: string;
};
export async function retentionPolicy(
  tx: Tx,
  legacy: { retentionDays?: number; policyVersion?: string },
  today = helsinkiToday(),
) {
  const settings = await tx.get("settings/retention");
  if (settings) {
    const policies = (settings.policies || []) as unknown as RetentionPolicy[];
    const policy = [...policies]
      .reverse()
      .find((p) => p.effectiveFrom <= today);
    return {
      retentionDays: policy?.minimumDays,
      policyVersion: policy?.version,
    };
  }
  // Preserve an explicitly configured C installation until the owner adopts UI policy.
  return {
    retentionDays: legacy.retentionDays,
    policyVersion: legacy.policyVersion,
  };
}
export const asDoc = (v: unknown) => v as Document;
